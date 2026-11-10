import { connection } from "next/server";
import { requireAdmin } from "@/lib/dal";
import { getClubStats } from "@/lib/admin-stats";
import { getChallengeMonth } from "@/lib/challenge-time";
import { getSettings } from "@/lib/settings";

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const monthName = (m: number) => MONTH.format(new Date(Date.UTC(2026, m - 1, 15)));

/** The club at a glance: who is playing, how much, and where. */
export async function ClubStats() {
  await connection();
  await requireAdmin();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const stats = await getClubStats(current, settings.timezone);
  const day = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", timeZone: settings.timezone });

  const tiles: [string, number, string][] = [
    [`Players in ${current.year}`, stats.seasonPlayers, `${stats.seasonPlayers - stats.out} still in, ${stats.out} out`],
    [`Twitching in ${monthName(current.month)}`, stats.monthPlayers, "players with a bird this month"],
    [`Sightings in ${monthName(current.month)}`, stats.thisMonth, `${stats.lastMonth} in all of last month`],
    [`Species in ${current.year}`, stats.species, "seen by anyone, any region"],
  ];

  // bar chart geometry: one thin bar per day on a shared baseline
  const max = Math.max(1, ...stats.daily.map((d) => d.count));
  const W = 600;
  const H = 120;
  const slot = W / stats.daily.length;
  const peak = stats.daily.reduce((best, d) => (d.count > best.count ? d : best), stats.daily[0]);
  const regionMax = Math.max(1, ...stats.byRegion.map((r) => r.count));

  return (
    <section aria-labelledby="club-heading" className="space-y-5">
      <h2 id="club-heading" className="text-xl font-semibold">
        The club at a glance
      </h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-rule bg-paper-raised p-4">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="font-display text-3xl font-semibold tabular-nums">{value}</dd>
            <dd className="text-sm text-ink-soft">{note}</dd>
          </div>
        ))}
      </dl>

      <figure className="space-y-2 rounded-2xl border border-rule bg-paper-raised p-4">
        <figcaption className="font-semibold">
          Sightings added per day, last {stats.daily.length} days
          <span className="block text-sm font-normal text-ink-soft">
            Busiest: {peak.count} on {day.format(new Date(peak.date))}. Hover or tap a bar for its day.
          </span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H + 4}`} role="img" aria-label={`Bar chart of sightings added per day. Busiest day ${peak.count}.`} className="w-full">
          <line x1="0" x2={W} y1={H + 1} y2={H + 1} className="stroke-rule" strokeWidth="1" />
          {stats.daily.map((d, i) => {
            const h = Math.max(d.count > 0 ? 3 : 0, (d.count / max) * (H - 4));
            return (
              <g key={d.date}>
                <title>{`${day.format(new Date(d.date))}: ${d.count}`}</title>
                {/* the whole column is the hover target, not just the bar */}
                <rect x={i * slot} y="0" width={slot} height={H} fill="transparent" />
                <rect x={i * slot + 2} y={H - h} width={slot - 4} height={h} rx="3" className="fill-roller" />
              </g>
            );
          })}
        </svg>
        <p className="flex justify-between text-sm text-ink-soft">
          <span>{day.format(new Date(stats.daily[0].date))}</span>
          <span>{day.format(new Date(stats.daily.at(-1)!.date))}</span>
        </p>
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-roller">Show as a table</summary>
          <table className="w-full max-w-xs text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th scope="col" className="py-1 font-semibold">Day</th>
                <th scope="col" className="py-1 text-right font-semibold">Sightings</th>
              </tr>
            </thead>
            <tbody>
              {stats.daily.map((d) => (
                <tr key={d.date}>
                  <td className="py-0.5">{day.format(new Date(d.date))}</td>
                  <td className="py-0.5 text-right tabular-nums">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </figure>

      {stats.byRegion.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-rule bg-paper-raised p-4">
          <h3 className="font-semibold">Sightings by region, {current.year}</h3>
          <ul className="space-y-2">
            {stats.byRegion.map((r) => (
              <li key={r.label} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-2 text-sm">
                <span>{r.label}</span>
                <span aria-hidden className="h-3 rounded-r bg-roller" style={{ width: `${Math.max(1, (r.count / regionMax) * 100)}%` }} />
                <span className="text-right tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
