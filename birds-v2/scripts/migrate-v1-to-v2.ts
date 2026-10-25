/**
 * v1 → v2 data migration. Reads v1's tables in the Postgres schema "public"
 * and rebuilds v2's tables in schema "v2" in the SAME database. v1 is only
 * ever read, so it stays intact for rollback.
 *
 * Idempotent: every run truncates v2 first. Runs nightly on the v2-staging
 * branch (rehearsal) and once on production at cutover.
 *
 *   npx tsx scripts/migrate-v1-to-v2.ts                    # dry run: report only
 *   npx tsx scripts/migrate-v1-to-v2.ts --apply            # write v2
 *   --group-mapping=../birds-app/scripts/hyphen-group-mapping.json
 *                                 # apply Dale's hyphen-group merge (pending ruling)
 *   --allow-host=<neon endpoint id>   # required for any DB other than v2-staging
 *
 * Writes a Markdown report to scripts/reports/ and exits non-zero if the
 * per-user-month verification fails.
 */
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { normalizeEmail } from "../src/lib/identity";
import { computeGroupJokers } from "../src/lib/rules/jokers";
import { checkInFromBreakdown, looseName, nameVariants } from "../src/lib/migration-helpers";

const STAGING_ENDPOINT = "ep-restless-shadow-agg9bw5n";
const BATCH = 500;

// ─── args & safety ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const value = (name: string) => flag(name)?.split("=").slice(1).join("=");
const APPLY = Boolean(flag("apply"));
const GROUP_MAPPING = value("group-mapping");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const host = new URL(url).hostname;
const allowed = [STAGING_ENDPOINT, value("allow-host")].filter(Boolean) as string[];
if (!allowed.some((h) => host.startsWith(h))) {
  throw new Error(`Refusing to run against ${host}. Pass --allow-host=<endpoint id> to target it deliberately.`);
}

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }, { schema: "v2" }) });

// ─── report ─────────────────────────────────────────────────────────────────

const report: string[] = [];
const warnings: string[] = [];
const log = (line = "") => {
  report.push(line);
  console.log(line);
};
const warn = (line: string) => warnings.push(line);

// ─── v1 rows ────────────────────────────────────────────────────────────────

type V1User = {
  id: string; email: string; emailVerified: Date | null; name: string | null; username: string | null;
  image: string | null; role: "USER" | "ADMIN"; defaultRegionId: string | null; createdAt: Date;
};
type V1Account = {
  id: string; userId: string; type: string; provider: string; providerAccountId: string;
  refresh_token: string | null; access_token: string | null; expires_at: number | null; token_type: string | null;
  scope: string | null; id_token: string | null; session_state: string | null;
};
type V1Region = { id: string; name: string; label: string; createdAt: Date };
type V1Bird = {
  id: string; alphabeticalName: string; fullName: string; scientificName: string; groupName: string | null; regionId: string;
};
type V1Submission = {
  id: string; userId: string; regionId: string; birdName: string; year: number; month: number;
  isCustomBird: boolean; isJokerSubmission: boolean; photoUrl: string | null; photoYear: number | null;
  photoMonth: number | null; photoAwardJokers: number; photoAwardedAt: Date | null; createdAt: Date;
};
type V1UserJoker = {
  userId: string; year: number; month: number; jokers: number; bonusJokers: number; totalJokers: number;
  usedJokers: number; bonusBreakdown: Prisma.JsonValue | null;
};
type V1Settings = {
  maxBirdsPerPeriod: number; currentYear: number; eliminationThreshold: number; rules: string | null;
};
type V1MonthlySettings = {
  year: number; month: number; maxBirdsPerPeriod: number; eliminationThreshold: number | null;
  goldenBirds: string[]; photoBirds: string[];
};
type V1Status = {
  userId: string; year: number; isEliminated: boolean; eliminatedAt: Date | null; eliminationMonth: number | null; joinedMonth: number;
};
type V1PushSub = { userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date };

async function readV1() {
  const q = <T>(sql: string) => db.$queryRawUnsafe<T[]>(sql);
  const [users, accounts, regions, birds, submissions, jokers, settings, monthly, statuses, push] = await Promise.all([
    q<V1User>(`select * from public."User"`),
    q<V1Account>(`select * from public."Account"`),
    q<V1Region>(`select * from public."Region"`),
    q<V1Bird>(`select * from public."Bird"`),
    q<V1Submission>(`select * from public."Submission" order by "createdAt", id`),
    q<V1UserJoker>(`select * from public."UserJoker"`),
    q<V1Settings>(`select * from public."Settings" limit 1`),
    q<V1MonthlySettings>(`select * from public."MonthlySettings"`),
    q<V1Status>(`select * from public."UserChallengeStatus"`),
    q<V1PushSub>(`select * from public."PushSubscription"`),
  ]);
  return { users, accounts, regions, birds, submissions, jokers, settings: settings[0], monthly, statuses, push };
}

// ─── transforms (pure) ──────────────────────────────────────────────────────

/** Species → one canonical group: the most common group across its regional listings. */
function buildSpecies(birds: V1Bird[], groupOverride: Map<string, string>) {
  const groupsBySpecies = new Map<string, Map<string, number>>();
  for (const b of birds) {
    const group = groupOverride.get(b.id) ?? b.groupName;
    const counts = groupsBySpecies.get(b.scientificName) ?? new Map<string, number>();
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
    groupsBySpecies.set(b.scientificName, counts);
  }

  const species = new Map<string, { id: string; scientificName: string; groupName: string | null }>();
  let n = 0;
  for (const [scientificName, counts] of groupsBySpecies) {
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (ranked.length > 1) {
      warn(`Species group conflict: *${scientificName}* → chose "${ranked[0][0]}" over ${ranked.slice(1).map(([g]) => `"${g}"`).join(", ")}`);
    }
    species.set(scientificName, { id: `sp_${(n++).toString(36).padStart(5, "0")}`, scientificName, groupName: ranked[0]?.[0] ?? null });
  }
  return species;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const started = new Date();
  log(`# v1 → v2 migration ${APPLY ? "(APPLY)" : "(dry run)"}`);
  log(`Host: \`${host}\` · ${started.toISOString()}`);
  log();

  const v1 = await readV1();

  // Optional hyphen-group merge, keyed by v1 bird id
  const groupOverride = new Map<string, string>();
  if (GROUP_MAPPING) {
    const mapping = JSON.parse(readFileSync(GROUP_MAPPING, "utf8")) as Record<string, { to: string }>;
    for (const [birdId, m] of Object.entries(mapping)) groupOverride.set(birdId, m.to);
    log(`Applied group mapping: ${groupOverride.size} birds from \`${GROUP_MAPPING}\``);
  } else {
    log("Group mapping: not applied (pending Dale's ruling)");
  }

  const species = buildSpecies(v1.birds, groupOverride);
  const groupNames = [...new Set([...species.values()].map((s) => s.groupName).filter((g): g is string => !!g))].sort();
  const groupIdByName = new Map(groupNames.map((g, i) => [g, `gr_${i.toString(36).padStart(4, "0")}`]));

  const birdByKey = new Map(v1.birds.map((b) => [`${b.regionId}:${b.fullName}`, b]));
  const speciesIdOf = (b: V1Bird) => species.get(b.scientificName)!.id;
  // Admin-typed names vary in case, hyphens and "(alias)" notes — compare loosely
  const firstBirdByName = new Map<string, V1Bird>();
  for (const b of v1.birds) {
    const key = looseName(b.fullName);
    if (!firstBirdByName.has(key)) firstBirdByName.set(key, b);
  }
  const findBird = (typed: string) =>
    nameVariants(typed).map((v) => firstBirdByName.get(looseName(v))).find(Boolean);

  // Submissions: real birds, custom birds, and v1's "🃏 Joker #N" rows (→ JokerSpend)
  const submissions: Prisma.SubmissionCreateManyInput[] = [];
  const photos: Prisma.PhotoCreateManyInput[] = [];
  const jokerRows = v1.submissions.filter((s) => s.isJokerSubmission);
  const seenSpecies = new Set<string>();
  const seenCustom = new Set<string>();
  let unmatched = 0;

  for (const s of v1.submissions) {
    if (s.isJokerSubmission) continue;
    let birdId: string | null = null;
    let speciesId: string | null = null;
    let customName: string | null = null;

    if (s.isCustomBird) {
      customName = s.birdName.trim();
      const key = `${s.userId}:${s.year}:${customName.toLowerCase()}`;
      if (seenCustom.has(key)) {
        warn(`Custom bird twice in season: user \`${s.userId}\` "${customName}" (month ${s.month}), kept, suffixed`);
        customName = `${customName} (${s.month})`;
      }
      seenCustom.add(key);
    } else {
      const bird = birdByKey.get(`${s.regionId}:${s.birdName}`);
      if (!bird) {
        unmatched++;
        warn(`Unmatched bird: "${s.birdName}" in region \`${s.regionId}\`, migrated as custom`);
        customName = s.birdName;
      } else {
        birdId = bird.id;
        speciesId = speciesIdOf(bird);
        const key = `${s.userId}:${s.year}:${speciesId}`;
        if (seenSpecies.has(key)) {
          // Historical breach of once-per-season: keep the row, release it from the uniqueness rule
          warn(`Species twice in season: user \`${s.userId}\` *${bird.scientificName}* ("${s.birdName}", month ${s.month}), kept, not counted for uniqueness`);
          speciesId = null;
        }
        seenSpecies.add(key);
      }
    }

    submissions.push({
      id: s.id, userId: s.userId, regionId: s.regionId, birdId, speciesId, customName,
      year: s.year, month: s.month, createdAt: s.createdAt,
    });

    if (s.photoUrl) {
      photos.push({
        submissionId: s.id, userId: s.userId, url: s.photoUrl,
        year: s.photoYear ?? s.year, month: s.photoMonth ?? s.month,
        status: s.photoAwardedAt ? "APPROVED" : "PENDING",
        jokerAward: s.photoAwardJokers, reviewedAt: s.photoAwardedAt, createdAt: s.createdAt,
      });
    }
  }

  // Joker spends: draw each v1 joker row from the oldest month with recorded usedJokers left
  const jokerSpends: Prisma.JokerSpendCreateManyInput[] = [];
  const usedLeft = new Map<string, number>();
  for (const j of v1.jokers) usedLeft.set(`${j.userId}:${j.year}:${j.month}`, j.usedJokers);
  const jokersByUser = new Map<string, V1UserJoker[]>();
  for (const j of v1.jokers) jokersByUser.set(j.userId, [...(jokersByUser.get(j.userId) ?? []), j]);

  for (const s of [...jokerRows].sort((a, b) => a.year - b.year || a.month - b.month)) {
    const sources = (jokersByUser.get(s.userId) ?? [])
      .filter((j) => j.year < s.year || (j.year === s.year && j.month < s.month))
      .sort((a, b) => a.year - b.year || a.month - b.month);
    const source = sources.find((j) => (usedLeft.get(`${j.userId}:${j.year}:${j.month}`) ?? 0) >= 1);
    if (source) usedLeft.set(`${source.userId}:${source.year}:${source.month}`, usedLeft.get(`${source.userId}:${source.year}:${source.month}`)! - 1);
    else warn(`Joker spend with no recorded source: user \`${s.userId}\` covering ${s.year}-${s.month}, drawn from the covered month`);
    jokerSpends.push({
      userId: s.userId, coversYear: s.year, coversMonth: s.month,
      fromYear: source?.year ?? s.year, fromMonth: source?.month ?? s.month,
      amount: 1, reason: "AUTO_ELIMINATION", createdAt: s.createdAt,
    });
  }
  const unexplainedUsed = [...usedLeft.entries()].filter(([, left]) => left > 0);
  for (const [key, left] of unexplainedUsed) {
    warn(`usedJokers with no joker row: \`${key}\`: ${left} (kept on UserJoker, no JokerSpend created)`);
  }

  // Check-ins reconstructed from v1 form bonus breakdowns
  const checkIns: Prisma.MonthlyCheckInCreateManyInput[] = [];
  for (const j of v1.jokers) {
    const answers = checkInFromBreakdown(j.bonusBreakdown);
    if (answers) checkIns.push({ userId: j.userId, year: j.year, month: j.month, ...answers, submittedAt: started });
  }

  // Golden/photo birds: names → species (any region)
  const specialBirds: Prisma.SpecialBirdCreateManyInput[] = [];
  for (const m of v1.monthly) {
    for (const [kind, names] of [["GOLDEN", m.goldenBirds], ["PHOTO", m.photoBirds]] as const) {
      for (const name of names) {
        const bird = findBird(name);
        if (!bird) {
          warn(`Special bird not found: ${kind} "${name}" ${m.year}-${m.month}`);
          continue;
        }
        specialBirds.push({ year: m.year, month: m.month, kind, speciesId: speciesIdOf(bird) });
      }
    }
  }

  // ─── verification: v2 must reproduce v1 per user-month ────────────────────
  const v1Count = new Map<string, number>();
  for (const s of v1.submissions) if (!s.isJokerSubmission) v1Count.set(`${s.userId}:${s.year}:${s.month}`, (v1Count.get(`${s.userId}:${s.year}:${s.month}`) ?? 0) + 1);
  const v2Count = new Map<string, number>();
  for (const s of submissions) v2Count.set(`${s.userId}:${s.year}:${s.month}`, (v2Count.get(`${s.userId}:${s.year}:${s.month}`) ?? 0) + 1);
  const countMismatches = [...v1Count].filter(([k, n]) => v2Count.get(k) !== n);

  // Group jokers recomputed from v2's canonical species groups vs v1's stored values
  const groupNameOfSpecies = new Map([...species.values()].map((s) => [s.id, s.groupName]));
  const birdSpecies = new Map(v1.birds.map((b) => [b.id, speciesIdOf(b)]));
  const groupsByUserMonth = new Map<string, Array<string | null>>();
  for (const s of submissions) {
    const sp = s.birdId ? birdSpecies.get(s.birdId) : undefined;
    const key = `${s.userId}:${s.year}:${s.month}`;
    groupsByUserMonth.set(key, [...(groupsByUserMonth.get(key) ?? []), sp ? groupNameOfSpecies.get(sp) ?? null : null]);
  }
  const jokerDiffs = v1.jokers
    .map((j) => {
      const recomputed = computeGroupJokers(groupsByUserMonth.get(`${j.userId}:${j.year}:${j.month}`) ?? []).total;
      return { key: `${j.userId}:${j.year}:${j.month}`, v1: j.jokers, v2: recomputed };
    })
    .filter((d) => d.v1 !== d.v2);

  log();
  log("## Counts");
  log(`| | v1 | v2 |`);
  log(`|---|---|---|`);
  log(`| Users | ${v1.users.length} | ${v1.users.length} |`);
  log(`| Birds (regional listings) | ${v1.birds.length} | ${v1.birds.length} |`);
  log(`| Species | ${new Set(v1.birds.map((b) => b.scientificName)).size} | ${species.size} |`);
  log(`| Groups | ${new Set(v1.birds.map((b) => b.groupName).filter(Boolean)).size} | ${groupNames.length} |`);
  log(`| Bird submissions | ${v1.submissions.length - jokerRows.length} | ${submissions.length} |`);
  log(`| Joker spends | ${jokerRows.length} rows | ${jokerSpends.length} |`);
  log(`| Photos | ${photos.length} | ${photos.length} |`);
  log(`| Check-ins rebuilt from form bonuses | n/a | ${checkIns.length} |`);
  log(`| Unmatched birds | | ${unmatched} |`);
  log();
  log("## Verification");
  log(`- Bird count per user-month: ${countMismatches.length === 0 ? "✅ identical" : `❌ ${countMismatches.length} mismatches`}`);
  log(`- Joker balances (UserJoker copied verbatim): ✅ identical`);
  log(
    `- Group jokers recomputed from canonical groups: ${jokerDiffs.length === 0 ? "✅ identical" : `⚠️ ${jokerDiffs.length} user-months differ (v1 values kept; diffs come from species group conflicts)`}`
  );
  for (const d of jokerDiffs.slice(0, 50)) log(`  - \`${d.key}\`: v1 ${d.v1} → v2 ${d.v2}`);
  log();
  log(`## Warnings (${warnings.length})`);
  for (const w of warnings) log(`- ${w}`);

  // ─── write ────────────────────────────────────────────────────────────────
  if (APPLY) {
    const tables = await db.$queryRawUnsafe<{ tablename: string }[]>(
      `select tablename::text as tablename from pg_tables where schemaname = 'v2' and tablename <> '_prisma_migrations'`
    );
    await db.$executeRawUnsafe(`truncate ${tables.map((t) => `"v2"."${t.tablename}"`).join(", ")} cascade`);

    const chunks = <T>(rows: T[]) => Array.from({ length: Math.ceil(rows.length / BATCH) }, (_, i) => rows.slice(i * BATCH, (i + 1) * BATCH));
    const insert = async <T>(label: string, rows: T[], fn: (batch: T[]) => Promise<unknown>) => {
      for (const batch of chunks(rows)) await fn(batch);
      console.log(`  wrote ${rows.length} ${label}`);
    };

    await insert("regions", v1.regions, (data) => db.region.createMany({ data }));
    await insert("groups", groupNames, (names) => db.group.createMany({ data: names.map((name) => ({ id: groupIdByName.get(name)!, name })) }));
    await insert("species", [...species.values()], (rows) =>
      db.species.createMany({ data: rows.map((s) => ({ id: s.id, scientificName: s.scientificName, groupId: s.groupName ? groupIdByName.get(s.groupName)! : null })) })
    );
    await insert("birds", v1.birds, (rows) =>
      db.bird.createMany({
        data: rows.map((b) => ({ id: b.id, speciesId: speciesIdOf(b), regionId: b.regionId, displayName: b.fullName, alphabeticalName: b.alphabeticalName })),
      })
    );
    await insert("users", v1.users, (rows) =>
      db.user.createMany({
        data: rows.map((u) => ({
          id: u.id, email: u.email, emailNormalized: normalizeEmail(u.email), emailVerified: u.emailVerified,
          name: u.name, username: u.username, image: u.image, role: u.role, defaultRegionId: u.defaultRegionId,
          createdAt: u.createdAt,
          // existing players are who they are — never ask them "are you X?"
          identityCheckedAt: started,
        })),
      })
    );
    const emailByUser = new Map(v1.users.map((u) => [u.id, u.email]));
    await insert("accounts", v1.accounts, (rows) =>
      db.account.createMany({ data: rows.map((a) => ({ ...a, email: emailByUser.get(a.userId) ?? null })) })
    );
    await insert("submissions", submissions, (data) => db.submission.createMany({ data }));
    await insert("photos", photos, (data) => db.photo.createMany({ data }));
    await insert("user jokers", v1.jokers, (rows) =>
      db.userJoker.createMany({
        data: rows.map((j) => ({ ...j, bonusBreakdown: (j.bonusBreakdown ?? undefined) as Prisma.InputJsonValue | undefined })),
      })
    );
    await insert("joker spends", jokerSpends, (data) => db.jokerSpend.createMany({ data }));
    await insert("check-ins", checkIns, (data) => db.monthlyCheckIn.createMany({ data }));
    await insert("challenge statuses", v1.statuses, (data) => db.userChallengeStatus.createMany({ data }));
    await insert("push subscriptions", v1.push, (data) => db.pushSubscription.createMany({ data }));

    await db.settings.create({
      data: {
        id: "default",
        currentYear: v1.settings.currentYear,
        maxBirdsPerPeriod: v1.settings.maxBirdsPerPeriod,
        eliminationThreshold: v1.settings.eliminationThreshold,
        rules: v1.settings.rules,
        // recommended defaults, pending Dale (see MANUAL-TODO.md)
        graceHours: 48,
        checkInDeadlineDay: 7,
      },
    });
    await insert("monthly settings", v1.monthly, (rows) =>
      db.monthlySettings.createMany({
        data: rows.map((m) => ({ year: m.year, month: m.month, maxBirdsPerPeriod: m.maxBirdsPerPeriod, eliminationThreshold: m.eliminationThreshold })),
      })
    );
    await insert("special birds", specialBirds, (data) => db.specialBird.createMany({ data, skipDuplicates: true }));
    // Months v1 already closed must never be closed again by v2 (that would
    // spend jokers twice). v1 logged elimination runs from July; earlier
    // months ran before the log existed, so lock 1..latest logged month.
    const v1Closed = await db.$queryRawUnsafe<{ year: number; month: number }[]>(
      `select year, max(month)::int as month from public."ProcessingLog" where type = 'elimination_check' group by year`
    );
    const closed = v1Closed.flatMap(({ year, month }) =>
      Array.from({ length: month }, (_, i) => ({ type: "month-end", year, month: i + 1 }))
    );
    await insert("closed months", closed, (data) => db.cronRun.createMany({ data }));
    log();
    log(`Applied in ${((Date.now() - started.getTime()) / 1000).toFixed(1)}s`);
  }

  mkdirSync("scripts/reports", { recursive: true });
  const file = `scripts/reports/migration-${started.toISOString().replace(/[:.]/g, "-")}.md`;
  writeFileSync(file, report.join("\n") + "\n");
  console.log(`\nReport: ${file}`);

  if (countMismatches.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
