import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { daysInMonth, getChallengeMonth, nextMonth, previousMonth } from "@/lib/challenge-time";
import { getAllSpecies } from "@/lib/checklist";
import { getSettings } from "@/lib/settings";
import { resolveMonthRules } from "@/lib/rules/month-rules";
import { MonthForm } from "./month-form";

export const metadata = { title: "Months" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
const label = (m: { year: number; month: number }) => MONTH.format(new Date(Date.UTC(m.year, m.month - 1, 15)));
const MONTH_ONLY = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const param = (m: { year: number; month: number }) => `${m.year}-${String(m.month).padStart(2, "0")}`;

export default function MonthsPage({ searchParams }: PageProps<"/admin/months">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Months</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Month searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Month({ searchParams }: Pick<PageProps<"/admin/months">, "searchParams">) {
  await connection();
  await requireAdmin();
  const settings = await getSettings();
  const { m } = await searchParams;
  const match = typeof m === "string" ? m.match(/^(\d{4})-(\d{2})$/) : null;
  const target = match ? { year: Number(match[1]), month: Number(match[2]) } : getChallengeMonth(new Date(), settings.timezone);

  const [overrides, special, species] = await Promise.all([
    db.monthlySettings.findUnique({ where: { year_month: target } }),
    db.specialBird.findMany({ where: target, select: { kind: true, speciesId: true } }),
    getAllSpecies(),
  ]);

  return (
    <>
      <nav aria-label="Choose month" className="flex items-center justify-between gap-4">
        <Link href={`/admin/months?m=${param(previousMonth(target))}`} className="min-h-11 content-center font-semibold text-roller">
          ‹ {label(previousMonth(target))}
        </Link>
        <h2 className="text-xl font-semibold">{label(target)}</h2>
        <Link href={`/admin/months?m=${param(nextMonth(target))}`} className="min-h-11 content-center font-semibold text-roller">
          {label(nextMonth(target))} ›
        </Link>
      </nav>
      <MonthForm
        year={target.year}
        month={target.month}
        monthLabel={label(target)}
        defaults={{ maxBirds: settings.maxBirdsPerPeriod, threshold: settings.eliminationThreshold }}
        overrides={{ maxBirds: overrides?.maxBirdsPerPeriod ?? null, threshold: overrides?.eliminationThreshold ?? null }}
        golden={special.filter((s) => s.kind === "GOLDEN").map((s) => s.speciesId)}
        species={species}
      />
      <SeasonOverview year={target.year} selected={target.month} season={settings} />
    </>
  );
}

/** All twelve months at once, so a wrong cap is spotted before the month starts. */
async function SeasonOverview({
  year,
  selected,
  season,
}: {
  year: number;
  selected: number;
  season: { maxBirdsPerPeriod: number; eliminationThreshold: number };
}) {
  const [overrides, golden] = await Promise.all([
    db.monthlySettings.findMany({ where: { year } }),
    db.specialBird.groupBy({ by: ["month"], where: { year, kind: "GOLDEN" }, _count: { _all: true } }),
  ]);
  const overrideBy = new Map(overrides.map((o) => [o.month, o]));
  const goldenBy = new Map(golden.map((g) => [g.month, g._count._all]));
  const rows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const own = overrideBy.get(month) ?? null;
    const rules = resolveMonthRules(season, own);
    const days = daysInMonth({ year, month });
    return { month, days, own: own !== null, ...rules, golden: goldenBy.get(month) ?? 0, tooMany: rules.eliminationThreshold > days };
  });
  const problems = rows.filter((r) => r.tooMany);

  return (
    <section aria-labelledby="season-heading" className="space-y-3">
      <h2 id="season-heading" className="text-xl font-semibold">
        The {year} season at a glance
      </h2>
      <p className="max-w-prose text-ink-soft">
        Season rules: up to {season.maxBirdsPerPeriod} birds a month, {season.eliminationThreshold} needed to stay in. A
        month follows them unless it has rules of its own.
      </p>
      {problems.length > 0 && (
        <p className="rounded-xl border border-alarm/40 p-4 text-alarm">
          {problems.map((r) => MONTH_ONLY.format(new Date(Date.UTC(year, r.month - 1, 15)))).join(", ")}{" "}
          {problems.length === 1 ? "needs" : "need"} more birds than the month has days. At a bird a day, every player
          would have to spend a joker. Give {problems.length === 1 ? "it" : "them"} rules of {problems.length === 1 ? "its" : "their"} own.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">Bird cap, birds needed and golden birds for each month of {year}</caption>
          <thead className="text-sm text-ink-soft">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">Month</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Days</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Most birds</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Needed</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Golden birds</th>
              <th scope="col" className="py-2 font-semibold">Rules</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => (
              <tr key={r.month} className={r.month === selected ? "bg-roller-wash" : ""}>
                <th scope="row" className="py-2 pr-3 font-semibold">
                  <Link
                    href={`/admin/months?m=${param({ year, month: r.month })}`}
                    aria-current={r.month === selected ? "true" : undefined}
                    // roller on its own wash is too faint; the selected month reads in ink
                    className={`flex min-h-11 items-center underline-offset-4 hover:underline ${r.month === selected ? "text-ink" : "text-roller"}`}
                  >
                    {MONTH_ONLY.format(new Date(Date.UTC(year, r.month - 1, 15)))}
                  </Link>
                </th>
                <td className="py-2 pr-3 text-right tabular-nums">{r.days}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.maxBirds}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${r.tooMany ? "font-semibold text-alarm" : ""}`}>
                  {r.eliminationThreshold}
                  {r.tooMany && <span className="sr-only"> (more than the month has days)</span>}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.golden === 0 ? <span className="text-ink-soft">none yet</span> : r.golden}</td>
                <td className="py-2 text-sm">{r.own ? "Its own" : <span className="text-ink-soft">Season</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
