/**
 * One-off fix (October 2026): William & Annette (annette.bayne@gmail.com)
 * missed the September 2026 deadline. Per Dale/Luke's decision their list is
 * submitted on their behalf: 5 real birds + 25 jokers (September cap is 30).
 *
 * The Oct 1 elimination cron already spent 1 of their jokers to keep them
 * alive for the empty September (ProcessingLog elimination_check 2026/9,
 * action "joker_used", FIFO -> month 1). That spend is refunded here before
 * the 25 joker submissions consume jokers FIFO, so they aren't double-charged.
 *
 * This script:
 *  1. Creates the 5 bird submissions for September (region south_africa)
 *  2. Creates 25 joker submissions (🃏 Joker #1..#25)
 *  3. Refunds the cron's 1-joker survival spend (month 1 usedJokers -1)
 *  4. Consumes 25 jokers FIFO across months 1-8 (usedJokers increments)
 *  5. Recalculates September group jokers (creates the month-9 UserJoker row)
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/submit-annette-september.ts          # dry run
 *   DATABASE_URL="..." npx tsx scripts/submit-annette-september.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import { recalculateGroupJokers } from "../src/lib/joker-groups";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const EMAIL = "annette.bayne@gmail.com";
const YEAR = 2026;
const MONTH = 9;
const REGION_NAME = "south_africa";
const BIRDS = [
  "Brown-backed Honeybird",
  "Cut-throat Finch",
  "Orange-breasted Bush-Shrike",
  "Black Cuckooshrike",
  "Greater Honeyguide",
];
const JOKER_COUNT = 25;
const CRON_REFUND = 1; // the Oct 1 elimination cron's survival spend

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`User ${EMAIL} not found`);
  console.log(`user: ${user.id} (${EMAIL})`);

  const region = await prisma.region.findFirst({ where: { name: REGION_NAME } });
  if (!region) throw new Error(`Region ${REGION_NAME} not found`);

  // --- Preconditions ---
  const septCount = await prisma.submission.count({
    where: { userId: user.id, year: YEAR, month: MONTH },
  });
  console.log(`existing September submissions: ${septCount} (expect 0)`);
  if (septCount > 0) throw new Error("September already has submissions — aborting");

  // All 5 birds must resolve in the region and be untwitched this year
  const resolved: { birdName: string }[] = [];
  for (const name of BIRDS) {
    const bird = await prisma.bird.findFirst({
      where: { regionId: region.id, fullName: { equals: name, mode: "insensitive" } },
    });
    if (!bird) {
      const lastWord = name.split(/[\s-]/).pop() ?? name;
      const candidates = await prisma.bird.findMany({
        where: { regionId: region.id, fullName: { contains: lastWord, mode: "insensitive" } },
        select: { fullName: true },
      });
      throw new Error(
        `Bird "${name}" not found in ${REGION_NAME}. Candidates: ${candidates
          .map((c) => c.fullName)
          .join(", ")}`
      );
    }
    const already = await prisma.submission.findFirst({
      where: { userId: user.id, year: YEAR, birdName: bird.fullName },
    });
    if (already) {
      throw new Error(`"${bird.fullName}" already twitched in month ${already.month} — aborting`);
    }
    resolved.push({ birdName: bird.fullName });
    console.log(`bird ok: ${bird.fullName}`);
  }

  // Joker balance: refund the cron spend, then 25 must be available FIFO
  const jokerRows = await prisma.userJoker.findMany({
    where: { userId: user.id, year: YEAR, month: { lt: MONTH } },
    orderBy: { month: "asc" },
  });

  const monthOne = jokerRows.find((j) => j.month === 1);
  if (!monthOne || monthOne.usedJokers < CRON_REFUND) {
    throw new Error("Month 1 UserJoker missing or usedJokers < 1 — cron refund assumption broken");
  }

  // Simulate: refund, then FIFO consumption (whole jokers only, per app rules)
  const plan: { month: number; take: number }[] = [];
  let remaining = JOKER_COUNT;
  for (const j of jokerRows) {
    const used = j.month === 1 ? j.usedJokers - CRON_REFUND : j.usedJokers;
    const available = Math.floor(j.totalJokers - used);
    if (available <= 0) continue;
    const take = Math.min(remaining, available);
    if (take > 0) {
      plan.push({ month: j.month, take });
      remaining -= take;
    }
    if (remaining === 0) break;
  }
  const totalAvailable = jokerRows.reduce((sum, j) => {
    const used = j.month === 1 ? j.usedJokers - CRON_REFUND : j.usedJokers;
    return sum + Math.max(0, Math.floor(j.totalJokers - used));
  }, 0);
  console.log(`available jokers after refund: ${totalAvailable} (need ${JOKER_COUNT})`);
  if (remaining > 0) {
    throw new Error(`Only ${JOKER_COUNT - remaining}/${JOKER_COUNT} jokers available — aborting`);
  }
  console.log(
    `FIFO plan: ${plan.map((p) => `m${p.month} x${p.take}`).join(", ")} (+ refund m1 x${CRON_REFUND})`
  );

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to execute.");
    return;
  }

  // --- Execute ---
  await prisma.$transaction(async (tx) => {
    for (const { birdName } of resolved) {
      await tx.submission.create({
        data: {
          userId: user.id,
          regionId: region.id,
          birdName,
          year: YEAR,
          month: MONTH,
          isCustomBird: false,
        },
      });
    }
    console.log(`Created ${resolved.length} bird submissions for ${YEAR}-${MONTH}`);

    for (let i = 1; i <= JOKER_COUNT; i++) {
      await tx.submission.create({
        data: {
          userId: user.id,
          regionId: region.id,
          birdName: `🃏 Joker #${i}`,
          year: YEAR,
          month: MONTH,
          isCustomBird: false,
          isJokerSubmission: true,
        },
      });
    }
    console.log(`Created ${JOKER_COUNT} joker submissions`);

    await tx.userJoker.update({
      where: { id: monthOne.id },
      data: { usedJokers: { decrement: CRON_REFUND } },
    });
    console.log(`Refunded cron spend: month 1 usedJokers -${CRON_REFUND}`);

    for (const p of plan) {
      const row = jokerRows.find((j) => j.month === p.month)!;
      await tx.userJoker.update({
        where: { id: row.id },
        data: { usedJokers: { increment: p.take } },
      });
      console.log(`Consumed ${p.take} jokers from month ${p.month}`);
    }
  });

  // Creates the month-9 UserJoker row (the 5 birds are all different
  // families, so group jokers should be 0)
  const recalc = await recalculateGroupJokers(prisma, user.id, YEAR, MONTH);
  console.log(`Recalculated Sept jokers: group=${recalc.groupJokers} total=${recalc.totalJokers}`);

  // --- Verify ---
  const [finalSept, finalJokers] = await Promise.all([
    prisma.submission.count({ where: { userId: user.id, year: YEAR, month: MONTH } }),
    prisma.userJoker.findMany({
      where: { userId: user.id, year: YEAR },
      orderBy: { month: "asc" },
      select: { month: true, totalJokers: true, usedJokers: true },
    }),
  ]);
  console.log(`Final September submissions: ${finalSept} (expect 30)`);
  console.log("Final joker ledger:", finalJokers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
