import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Tally } from "@/components/tally";
import { InstallHint } from "@/components/install-hint";
import { requirePlayer } from "@/lib/dal";
import { checkInDeadline, getChallengeMonth, monthEnd, openCheckInMonth, timeUntil } from "@/lib/challenge-time";
import { db } from "@/lib/db";
import { getMonthRules, getSettings } from "@/lib/settings";
import { getMonthSnapshot } from "@/lib/player";
import { getGoldenBirdsFor } from "@/lib/checklist";
import { PHOTO_PROOF_FROM_SEASON } from "@/lib/rules/check-in-bonus";
import type { Standing } from "@/lib/rules/standing";
import { getStandings } from "@/lib/standing";
import { Check, Camera, Circle } from "lucide-react";

export const metadata = { title: "Today" };

const MONTHS = new Intl.DateTimeFormat("en-ZA", { month: "long" });

function timeLeftLabel(end: Date) {
  const { days, hours, minutes } = timeUntil(end);
  if (days >= 2) return `${days} days left`;
  if (days === 1) return `1 day, ${hours} hours left`;
  if (hours >= 1) return `${hours} hours left`;
  return minutes > 0 ? `${minutes} minutes left` : "Month closed";
}

function formatJokers(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const birds = (n: number) => `${n} ${n === 1 ? "bird" : "birds"}`;

/** What month-end would do with today's numbers, in one sentence. */
function standingLine(s: Standing, threshold: number, monthName: string, maxEmptyMonths: number | null) {
  switch (s.kind) {
    case "safe":
      return { tone: "ok", text: `Safe for ${monthName}: you have the ${threshold} needed to stay in.` };
    case "covered":
      return {
        tone: "ok",
        text: `${birds(s.shortfall)} short of the ${threshold} needed to stay in. Your jokers cover that at month-end, one per missing bird.`,
      };
    case "at-risk":
      return {
        tone: "alarm",
        text:
          s.reason === "empty-months"
            ? `${maxEmptyMonths} months in a row with no birds ends your season, jokers or not. Twitch ${birds(s.birdsToSafety)} to stay in.`
            : `${birds(s.shortfall)} short of the ${threshold} needed, and your jokers don't cover it. Twitch ${birds(s.birdsToSafety)} more to stay in.`,
      };
    case "exempt":
      return { tone: "ok", text: "Your first month doesn't count towards elimination. From next month you need the monthly target, or jokers for the gap." };
    case "out":
      return { tone: "soft", text: "You're out of this season's challenge. You can still follow everyone in Sightings." };
  }
}

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  await connection(); // the current month depends on the clock
  const user = await requirePlayer();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const checkInMonth = openCheckInMonth({ deadlineDay: settings.checkInDeadlineDay, timeZone: settings.timezone });
  const checkInKey = checkInMonth && { userId_year_month: { userId: user.id, ...checkInMonth } };
  const [rules, snapshot, standings, golden, checkIn, checkInJokers] = await Promise.all([
    getMonthRules(current),
    getMonthSnapshot(user.id, current),
    getStandings(current, user.id),
    db.user
      .findUnique({ where: { id: user.id }, select: { defaultRegionId: true } })
      .then((me) => getGoldenBirdsFor(user.id, current, me?.defaultRegionId ?? null)),
    checkInKey ? db.monthlyCheckIn.findUnique({ where: checkInKey, select: { id: true } }) : null,
    checkInKey ? db.userJoker.findUnique({ where: checkInKey, select: { bonusJokers: true } }) : null,
  ]);
  const checkInDone = Boolean(checkIn);
  const monthName = MONTHS.format(new Date(Date.UTC(current.year, current.month - 1, 15)));
  const remaining = Math.max(0, rules.maxBirds - snapshot.birdCount);
  const standing = standings.players[0].standing;
  const line = standingLine(standing, standings.threshold, monthName, settings.maxEmptyMonths);
  const photoProof = current.year >= PHOTO_PROOF_FROM_SEASON;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-ink-soft">{timeLeftLabel(monthEnd(current, settings.timezone))}</p>
        <h1 className="text-3xl font-semibold">{monthName}</h1>
      </header>

      <InstallHint />

      <section aria-labelledby="tally-heading" className="space-y-4">
        <h2 id="tally-heading" className="sr-only">
          This month
        </h2>
        <Tally count={snapshot.birdCount} cap={rules.maxBirds} />
        <p className="text-lg">
          <span className="font-display text-2xl font-semibold">{snapshot.birdCount}</span>
          <span className="text-ink-soft"> of {rules.maxBirds} birds</span>
        </p>
        {remaining > 0 && standing.kind !== "out" && <p className="-mt-3 text-ink-soft">{remaining} to go before month-end</p>}
        <p
          className={`max-w-prose rounded-xl px-4 py-3 ${
            line.tone === "alarm" ? "border-2 border-alarm font-semibold" : line.tone === "ok" ? "bg-paper-sunk" : "bg-paper-sunk text-ink-soft"
          }`}
        >
          {line.text}
        </p>
        {standing.kind === "out" ? null : snapshot.birdCount === 0 ? (
          <Link
            href="/twitch"
            className="inline-flex min-h-12 items-center rounded-full bg-roller px-6 font-semibold text-roller-ink"
          >
            Twitch your first bird of {monthName}
          </Link>
        ) : (
          remaining > 0 && (
            <Link
              href="/twitch"
              className="inline-flex min-h-12 items-center rounded-full bg-roller px-6 font-semibold text-roller-ink"
            >
              Twitch a bird
            </Link>
          )
        )}
      </section>

      {golden.length > 0 && (
        <section aria-labelledby="golden-heading" className="space-y-3 rounded-2xl border border-rule bg-paper-raised p-5">
          <h2 id="golden-heading" className="text-xl font-semibold">
            {monthName}&apos;s golden birds
          </h2>
          <p className="text-ink-soft">
            {photoProof
              ? "Each one you prove with a photo is a bonus joker, up to 5. Add the photo from your list on Twitch."
              : "Each one you see is a bonus joker, up to 5. Count them on your check-in."}
          </p>
          <ul className="space-y-2">
            {golden.map((g) => (
              <li key={g.speciesId} className="flex items-center gap-3">
                {g.state === "proven" || (g.state === "seen" && !photoProof) ? (
                  <Check aria-hidden className="size-5 shrink-0 text-roller" strokeWidth={3} />
                ) : g.state === "seen" ? (
                  <Camera aria-hidden className="size-5 shrink-0 text-ink-soft" />
                ) : (
                  <Circle aria-hidden className="size-5 shrink-0 text-rule" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{g.name}</span>
                  <i className="block truncate text-sm text-ink-soft">{g.scientificName}</i>
                </span>
                <span className="text-sm text-ink-soft">
                  {g.state === "unseen" ? "Not yet" : g.state === "proven" ? "Proven" : photoProof ? "Seen, needs a photo" : "Seen"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {checkInMonth && (
        <section aria-labelledby="checkin-heading" className="space-y-2 rounded-2xl border border-rule bg-paper-raised p-5">
          <h2 id="checkin-heading" className="text-xl font-semibold">
            {MONTHS.format(new Date(Date.UTC(checkInMonth.year, checkInMonth.month - 1, 15)))} check-in
          </h2>
          <p className="text-ink-soft">
            {checkInDone
              ? `Done: ${formatJokers(checkInJokers?.bonusJokers ?? 0)} bonus jokers. You can still change it.`
              : "Four quick questions for your bonus jokers. This replaces the Google Form."}{" "}
            Closes in {timeLeftLabel(checkInDeadline(checkInMonth, settings.checkInDeadlineDay, settings.timezone)).replace(" left", "")}.
          </p>
          <Link
            href="/check-in"
            className={`inline-flex min-h-12 items-center rounded-full px-6 font-semibold ${
              checkInDone ? "border border-rule" : "bg-roller text-roller-ink"
            }`}
          >
            {checkInDone ? "Review my check-in" : "Do my check-in"}
          </Link>
        </section>
      )}

      <section aria-labelledby="jokers-heading" className="rounded-2xl bg-lilac-wash p-5">
        <h2 id="jokers-heading" className="text-xl font-semibold">
          Jokers
        </h2>
        <p className="mt-1">
          <span className="font-display text-2xl font-semibold text-lilac">{formatJokers(snapshot.spendable)}</span>{" "}
          ready to use
        </p>
        {snapshot.earningThisMonth > 0 && (
          <p className="text-ink-soft">
            +{formatJokers(snapshot.earningThisMonth)} earned in {monthName}, usable from next month
          </p>
        )}
      </section>

      <Link href="/rules" className="inline-flex min-h-12 items-center font-semibold text-roller underline underline-offset-4">
        How the game works
      </Link>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="animate-pulse space-y-10" aria-busy="true" aria-label="Loading today">
      <div className="space-y-2">
        <div className="h-5 w-28 rounded bg-paper-sunk" />
        <div className="h-10 w-48 rounded bg-paper-sunk" />
      </div>
      <div className="h-10 max-w-md rounded bg-paper-sunk" />
      <div className="h-28 rounded-2xl bg-paper-sunk" />
    </div>
  );
}
