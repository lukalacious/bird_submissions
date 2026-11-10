import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { PhotoWall } from "@/components/photo-wall";
import { SpeciesList } from "@/components/species-list";
import { TimeAgo } from "@/components/time-ago";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { getRegions } from "@/lib/checklist";
import { neighbours, parsePeriod, periodParam, type Period } from "@/lib/period";
import { getClubJokers, getFeed, getGallery, getLeaderboard, getSpeciesSeen } from "@/lib/sightings";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Sightings" };

const TABS = [
  { key: "latest", label: "Latest" },
  { key: "species", label: "Species" },
  { key: "table", label: "Table" },
  { key: "photos", label: "Photos" },
  { key: "jokers", label: "Jokers" },
] as const;
type Tab = (typeof TABS)[number]["key"];
// links shared before the rename still land on the right tab
const ALIASES: Record<string, Tab> = { feed: "latest", leaderboard: "table" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-ZA", { month: "short", timeZone: "UTC" });
const monthName = (month: number, fmt = MONTH) => fmt.format(new Date(Date.UTC(2026, month - 1, 15)));
const periodLabel = (p: Period) => (p.kind === "season" ? `the ${p.year} season` : `${monthName(p.month)} ${p.year}`);
const jokers = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

type Search = Pick<PageProps<"/sightings">, "searchParams">;

function href(tab: Tab, params: { m?: string; region?: string } = {}) {
  const q = new URLSearchParams();
  if (tab !== "latest") q.set("tab", tab);
  if (params.m) q.set("m", params.m);
  if (params.region) q.set("region", params.region);
  const qs = q.toString();
  return qs ? `/sightings?${qs}` : "/sightings";
}

export default function SightingsPage({ searchParams }: PageProps<"/sightings">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Sightings</h1>
      <Suspense fallback={<TabsSkeleton />}>
        <SightingsTabs searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SightingsTabs({ searchParams }: Search) {
  const { tab: raw } = await searchParams;
  const key = typeof raw === "string" ? (ALIASES[raw] ?? raw) : "latest";
  const tab: Tab = TABS.some((t) => t.key === key) ? (key as Tab) : "latest";

  return (
    <>
      <nav aria-label="Sightings sections" className="grid grid-cols-5 gap-1 rounded-xl bg-paper-sunk p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            prefetch
            className={`flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold sm:text-base ${
              tab === t.key ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {/* Only the open tab's data is fetched (v1 loaded all five every time) */}
      <Suspense key={tab} fallback={<ListSkeleton />}>
        {tab === "latest" && <Feed />}
        {tab === "species" && <Species searchParams={searchParams} />}
        {tab === "table" && <Leaderboard searchParams={searchParams} />}
        {tab === "photos" && <Gallery />}
        {tab === "jokers" && <ClubJokers searchParams={searchParams} />}
      </Suspense>
    </>
  );
}

/** "‹ October | November 2026 | ›" — steps through months or seasons, never into the future. */
function PeriodNav({ tab, period, current, region }: { tab: Tab; period: Period; current: { year: number; month: number }; region?: string }) {
  const { prev, next } = neighbours(period, current);
  const arrow = "flex size-11 items-center justify-center rounded-full border border-rule";
  const label = (p: Period) => (p.kind === "season" ? `${p.year} season` : `${monthName(p.month)} ${p.year}`);
  return (
    <div className="flex items-center justify-between gap-2">
      {prev ? (
        <Link href={href(tab, { m: periodParam(prev), region })} aria-label={`Earlier: ${label(prev)}`} className={arrow}>
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
      ) : (
        <span className="size-11" />
      )}
      <h2 className="text-xl font-semibold">{label(period)}</h2>
      {next ? (
        <Link href={href(tab, { m: periodParam(next), region })} aria-label={`Later: ${label(next)}`} className={arrow}>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : (
        <span className="size-11" />
      )}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "true" : undefined}
          className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
            i.active ? "border-roller bg-roller-wash text-ink" : "border-rule text-ink-soft"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

async function currentMonth() {
  await connection(); // "now" decides the default month
  const settings = await getSettings();
  return getChallengeMonth(new Date(), settings.timezone);
}

async function Species({ searchParams }: Search) {
  await requirePlayer();
  const [{ m, region: regionRaw }, current, regions] = await Promise.all([searchParams, currentMonth(), getRegions()]);
  const period = parsePeriod(m, current);
  const region = regions.find((r) => r.name === regionRaw) ?? null;
  const summary = await getSpeciesSeen(period, region?.id ?? null);
  const mParam = periodParam(period);
  const thisSeason: Period = { kind: "season", year: period.year };
  const thisMonth: Period =
    period.kind === "month" ? period : { kind: "month", year: period.year, month: period.year === current.year ? current.month : 12 };

  return (
    <div className="space-y-4">
      <PeriodNav tab="species" period={period} current={current} region={region?.name} />
      <Chips
        label="Month or season"
        items={[
          { href: href("species", { m: periodParam(thisMonth), region: region?.name }), label: "One month", active: period.kind === "month" },
          { href: href("species", { m: periodParam(thisSeason), region: region?.name }), label: "Whole season", active: period.kind === "season" },
        ]}
      />
      {regions.length > 1 && (
        <Chips
          label="Region"
          items={[
            { href: href("species", { m: mParam }), label: "All regions", active: !region },
            ...regions.map((r) => ({ href: href("species", { m: mParam, region: r.name }), label: r.label, active: region?.id === r.id })),
          ]}
        />
      )}
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Species", summary.rows.length],
          ["Sightings", summary.sightings],
          ["Players", summary.players],
        ].map(([label, n]) => (
          <div key={label} className="rounded-xl bg-paper-sunk px-2 py-3">
            <dd className="font-display text-2xl font-semibold tabular-nums">{n}</dd>
            <dt className="text-sm text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>
      <SpeciesList key={`${mParam}:${region?.id ?? "all"}`} rows={summary.rows} periodLabel={periodLabel(period)} />
    </div>
  );
}

async function ClubJokers({ searchParams }: Search) {
  const me = await requirePlayer();
  const [{ m }, current] = await Promise.all([searchParams, currentMonth()]);
  const season: Period = { kind: "season", year: parsePeriod(m, current).year };
  const rows = await getClubJokers(season.year);

  return (
    <div className="space-y-4">
      <PeriodNav tab="jokers" period={season} current={current} />
      {rows.length === 0 ? (
        <p className="text-ink-soft">No jokers earned yet. Three birds from one family in a month earns the first.</p>
      ) : (
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
          {rows.map((r) => (
            <li key={r.userId} className={r.userId === me.id ? "bg-roller-wash" : ""}>
              <details>
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                  <span className={`min-w-0 flex-1 ${r.isEliminated ? "text-ink-soft" : ""}`}>
                    <span className="block font-semibold">
                      {r.name}
                      {r.userId === me.id && <span className="sr-only"> (you)</span>}
                      {r.isEliminated && <span className="ml-2 text-sm font-normal">out</span>}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {jokers(r.earned)} earned, {jokers(r.used)} used
                    </span>
                  </span>
                  <span className="rounded-full bg-lilac-wash px-3 py-1 font-semibold text-ink tabular-nums">
                    {jokers(r.earned - r.used)}
                    <span className="sr-only"> left</span>
                  </span>
                </summary>
                <ul className="space-y-2 px-4 pb-3 text-sm">
                  {r.months.map((mo) => (
                    <li key={mo.month}>
                      <span className="font-semibold">{monthName(mo.month, MONTH_SHORT)}</span>{" "}
                      {jokers(mo.fromFamilies)} from families
                      {mo.bonus !== 0 && `, ${mo.bonus > 0 ? "+" : "−"}${jokers(Math.abs(mo.bonus))} bonus`}
                      {mo.used > 0 && `, ${jokers(mo.used)} used`}
                      {mo.bonusLines.length > 0 && (
                        <span className="block text-ink-soft">
                          {mo.bonusLines.map((l) => `${l.rule} ${l.value > 0 ? "+" : "−"}${jokers(Math.abs(l.value))}`).join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function Feed() {
  await requirePlayer();
  const items = await getFeed();
  if (items.length === 0) return <p className="text-ink-soft">Nobody has twitched anything yet. Be first.</p>;
  return (
    <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-3 px-4 py-3">
          {i.playerImage ? (
            <MediaImage src={i.playerImage} alt="" width={40} height={40} className="size-10 rounded-full" />
          ) : (
            <span aria-hidden className="size-10 rounded-full bg-paper-sunk" />
          )}
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{i.playerName}</span> twitched{" "}
            <span className="font-semibold">{i.bird}</span>
            {i.isLifer && <span className="ml-1 text-sm text-lilac">lifer</span>}
            <span className="block text-sm text-ink-soft">
              {i.region}, <TimeAgo iso={i.at} />
            </span>
          </p>
          {i.photoUrl && (
            <MediaImage src={i.photoUrl} alt={`${i.playerName}'s ${i.bird}`} width={56} height={56} className="size-14 rounded-lg object-cover" />
          )}
        </li>
      ))}
    </ul>
  );
}

async function Leaderboard({ searchParams }: Search) {
  const me = await requirePlayer();
  const [{ m }, current] = await Promise.all([searchParams, currentMonth()]);
  const parsed = parsePeriod(m, current);
  const month = parsed.kind === "month" ? { year: parsed.year, month: parsed.month } : current;
  const rows = await getLeaderboard(month);
  const monthLabel = monthName(month.month);

  return (
    <div className="space-y-4">
      <PeriodNav tab="table" period={{ kind: "month", ...month }} current={current} />
      {rows.length === 0 && <p className="text-ink-soft">Nobody has twitched anything this season yet.</p>}
      <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">Standings for {monthLabel} {month.year}</caption>
        <thead className="text-sm text-ink-soft">
          <tr>
            <th scope="col" className="py-2 pr-2 font-semibold">#</th>
            <th scope="col" className="py-2 pr-2 font-semibold">Player</th>
            <th scope="col" className="py-2 pr-2 text-right font-semibold">{monthLabel}</th>
            <th scope="col" className="py-2 text-right font-semibold">Season</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((r, i) => (
            <tr key={r.userId} className={r.userId === me.id ? "bg-roller-wash" : r.isEliminated ? "text-ink-soft" : ""}>
              <td className="py-2 pr-2 tabular-nums">{r.isEliminated ? "" : i + 1}</td>
              <td className="py-2 pr-2">
                {r.name}
                {r.userId === me.id && <span className="sr-only"> (you)</span>}
                {r.isEliminated && <span className="ml-2 text-sm">out</span>}
              </td>
              <td className="py-2 pr-2 text-right font-semibold tabular-nums">{r.monthBirds}</td>
              <td className="py-2 text-right tabular-nums">{r.seasonBirds}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

async function Gallery() {
  await requirePlayer();
  const photos = await getGallery();
  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <Camera aria-hidden className="size-5" /> No photos yet. Add one from your list on Twitch.
      </p>
    );
  }
  return <PhotoWall photos={photos} />;
}

function TabsSkeleton() {
  return <div className="h-12 animate-pulse rounded-xl bg-paper-sunk" />;
}

function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-16 rounded-xl bg-paper-sunk" />
      ))}
    </div>
  );
}
