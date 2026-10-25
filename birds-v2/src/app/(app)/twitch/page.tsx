import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { monthEnd, openMonths } from "@/lib/challenge-time";
import { getPlayerSeason, getRegionBirds, getRegions, getSpecialSpecies } from "@/lib/checklist";
import { getMonthRules, getSettings } from "@/lib/settings";
import { canTwitchWhileEliminated } from "@/lib/site";
import { Checklist, type OpenMonth } from "./checklist";

export const metadata = { title: "Twitch" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const DEADLINE = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Johannesburg",
});

export default function TwitchPage({ searchParams }: PageProps<"/twitch">) {
  return (
    <Suspense fallback={<ChecklistSkeleton />}>
      <TwitchData searchParams={searchParams} />
    </Suspense>
  );
}

async function TwitchData({ searchParams }: Pick<PageProps<"/twitch">, "searchParams">) {
  await connection();
  const user = await requirePlayer();
  const settings = await getSettings();
  const months = openMonths({ graceHours: settings.graceHours, timeZone: settings.timezone });
  const current = months[0];

  const [{ region: regionParam }, regions, me] = await Promise.all([
    searchParams,
    getRegions(),
    db.user.findUnique({ where: { id: user.id }, select: { defaultRegionId: true } }),
  ]);
  const region =
    regions.find((r) => r.name === regionParam) ?? regions.find((r) => r.id === me?.defaultRegionId) ?? regions[0];

  const [birds, special, season, ...rules] = await Promise.all([
    getRegionBirds(region.id),
    getSpecialSpecies(current),
    getPlayerSeason(user.id, current.year),
    ...months.map((m) => getMonthRules(m)),
  ]);

  // During the grace window last month may belong to last season
  const previousSeason =
    months[1] && months[1].year !== current.year ? (await getPlayerSeason(user.id, months[1].year)).birds : [];

  const open: OpenMonth[] = months.map((m, i) => ({
    key: i === 0 ? "current" : "previous",
    year: m.year,
    month: m.month,
    label: MONTH.format(new Date(Date.UTC(m.year, m.month - 1, 15))),
    cap: rules[i].maxBirds,
    closesLabel: i === 1 ? DEADLINE.format(new Date(monthEnd(m, settings.timezone).getTime() + settings.graceHours * 3_600_000)) : null,
  }));

  return (
    <Checklist
      userId={user.id}
      regions={regions}
      regionId={region.id}
      birds={birds}
      special={special}
      season={[...season.birds, ...previousSeason]}
      months={open}
      isEliminated={season.isEliminated && !canTwitchWhileEliminated(user.role)}
      testingWhileOut={season.isEliminated && canTwitchWhileEliminated(user.role)}
    />
  );
}

function ChecklistSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading your checklist">
      <div className="h-10 w-40 rounded bg-paper-sunk" />
      <div className="h-14 rounded-xl bg-paper-sunk" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 rounded-xl bg-paper-sunk" />
        ))}
      </div>
    </div>
  );
}
