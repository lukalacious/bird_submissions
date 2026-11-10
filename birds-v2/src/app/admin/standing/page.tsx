import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getChallengeMonth, monthEnd, timeUntil } from "@/lib/challenge-time";
import { getMonthRules, getSettings } from "@/lib/settings";
import { getStandings } from "@/lib/standing";
import { eliminate, reinstate } from "../players/actions";
import { STANDING_LABEL } from "./describe";

export const metadata = { title: "Standing" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-ZA", { month: "narrow", timeZone: "UTC" });
const monthName = (m: number, f = MONTH) => f.format(new Date(Date.UTC(2026, m - 1, 15)));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "at-risk", label: "At risk" },
  { key: "covered", label: "Jokers cover it" },
  { key: "out", label: "Out" },
] as const;

export default function StandingPage({ searchParams }: PageProps<"/admin/standing">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Standing</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Standing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Standing({ searchParams }: Pick<PageProps<"/admin/standing">, "searchParams">) {
  await connection();
  await requireAdmin();
  const [{ show, done, error }, settings] = await Promise.all([searchParams, getSettings()]);
  const current = getChallengeMonth(new Date(), settings.timezone);
  const [{ players, threshold }, users, monthRules] = await Promise.all([
    getStandings(current),
    db.user.findMany({ select: { id: true, name: true, username: true, email: true } }),
    // each past month is shaded against its own target (February needed 28, not 31)
    Promise.all(Array.from({ length: current.month }, (_, i) => getMonthRules({ year: current.year, month: i + 1 }))),
  ]);
  const nameOf = new Map(users.map((u) => [u.id, u.username ?? u.name ?? u.email]));

  // people who have played this season, or were put out of it
  const active = players
    .filter((p) => p.months.some((n) => n > 0) || p.standing.kind === "out")
    .sort((a, b) => (nameOf.get(a.userId) ?? "").localeCompare(nameOf.get(b.userId) ?? ""));
  const count = (kind: string) => active.filter((p) => p.standing.kind === kind).length;
  const filter = FILTERS.some((f) => f.key === show) ? (show as (typeof FILTERS)[number]["key"]) : "all";
  const shown = filter === "all" ? active : active.filter((p) => p.standing.kind === filter);
  const { days } = timeUntil(monthEnd(current, settings.timezone));
  const cell = (n: number, month: number) =>
    n >= monthRules[month - 1].eliminationThreshold ? "bg-roller-wash" : n > 0 ? "bg-paper-sunk" : "border border-rule";

  return (
    <>
      <p className="max-w-prose text-ink-soft">
        What month-end would do if {monthName(current.month)} closed on today&apos;s numbers. Players need {threshold}{" "}
        birds; each one missing costs a joker. {days} {days === 1 ? "day" : "days"} left
        {settings.graceHours > 0 && `, then ${settings.graceHours} hours to fix lists before the month closes`}.
      </p>

      {typeof done === "string" && (
        <p role="status" className="rounded-xl bg-roller-wash p-4 font-semibold">
          {done}
        </p>
      )}
      {typeof error === "string" && (
        <p role="alert" className="rounded-xl border-2 border-alarm p-4 font-semibold">
          Not done: {error}
        </p>
      )}

      <nav aria-label="Show" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/standing" : `/admin/standing?show=${f.key}`}
            aria-current={filter === f.key ? "true" : undefined}
            className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              filter === f.key ? "border-roller bg-roller-wash text-ink" : "border-rule text-ink-soft"
            }`}
          >
            {f.label} ({f.key === "all" ? active.length : count(f.key)})
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="text-ink-soft">Nobody here.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => {
            const name = nameOf.get(p.userId) ?? "Player";
            const kind = p.standing.kind;
            return (
              <li key={p.userId} className={`space-y-3 rounded-2xl border bg-paper-raised p-4 ${kind === "at-risk" ? "border-2 border-alarm" : "border-rule"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link href={`/admin/players/${p.userId}`} className="text-lg font-semibold underline underline-offset-4">
                    {name}
                  </Link>
                  <p>
                    <strong>{STANDING_LABEL[kind]}</strong>
                    {kind === "at-risk" && p.standing.kind === "at-risk" && `: needs ${p.standing.birdsToSafety} more`}
                    {kind === "covered" && p.standing.kind === "covered" && `: ${p.standing.shortfall} short`}
                    {kind === "out" && p.standing.kind === "out" && p.standing.eliminationMonth && ` since ${monthName(p.standing.eliminationMonth)}`}
                  </p>
                </div>
                <ol aria-label={`${name}'s birds by month`} className="grid grid-cols-12 gap-1 text-center text-sm">
                  {p.months.slice(0, current.month).map((n, i) => (
                    <li key={i} className={`rounded-md py-1 ${cell(n, i + 1)}`}>
                      <span aria-hidden className="block text-xs text-ink-soft">
                        {monthName(i + 1, SHORT)}
                      </span>
                      <span className="sr-only">{monthName(i + 1)}: </span>
                      <span className="font-semibold tabular-nums">{n}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-soft">
                    {p.birdCount} of {threshold} in {monthName(current.month)} · {fmt(p.jokersLeft)} jokers ready
                  </p>
                  {kind === "out" ? (
                    <form action={reinstate}>
                      <input type="hidden" name="userId" value={p.userId} />
                      <input type="hidden" name="back" value="standing" />
                      <button className="min-h-11 rounded-full border border-rule px-4 font-semibold">Reinstate</button>
                    </form>
                  ) : (
                    <details className="text-right">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-rule px-4 font-semibold">
                        Eliminate…
                      </summary>
                      <form action={eliminate} className="mt-2">
                        <input type="hidden" name="userId" value={p.userId} />
                        <input type="hidden" name="back" value="standing" />
                        <button className="min-h-11 rounded-full border-2 border-alarm px-4 font-semibold">Yes, {name} is out</button>
                      </form>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
