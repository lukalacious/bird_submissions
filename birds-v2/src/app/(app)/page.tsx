import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Tally } from "@/components/tally";
import { requireUser } from "@/lib/dal";
import { getChallengeMonth, monthEnd, timeUntil } from "@/lib/challenge-time";
import { getMonthRules, getSettings } from "@/lib/settings";
import { getMonthSnapshot } from "@/lib/player";

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

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  await connection(); // the current month depends on the clock
  const user = await requireUser();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const [rules, snapshot] = await Promise.all([getMonthRules(current), getMonthSnapshot(user.id, current)]);
  const monthName = MONTHS.format(new Date(Date.UTC(current.year, current.month - 1, 15)));
  const remaining = Math.max(0, rules.maxBirds - snapshot.birdCount);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-ink-soft">{timeLeftLabel(monthEnd(current, settings.timezone))}</p>
        <h1 className="text-3xl font-semibold">{monthName}</h1>
      </header>

      <section aria-labelledby="tally-heading" className="space-y-4">
        <h2 id="tally-heading" className="sr-only">
          This month
        </h2>
        <Tally count={snapshot.birdCount} cap={rules.maxBirds} />
        <p className="text-lg">
          <span className="font-display text-2xl font-semibold">{snapshot.birdCount}</span>
          <span className="text-ink-soft"> of {rules.maxBirds} birds</span>
        </p>
        {remaining > 0 && <p className="-mt-3 text-ink-soft">{remaining} to go before month-end</p>}
        {snapshot.birdCount === 0 ? (
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
