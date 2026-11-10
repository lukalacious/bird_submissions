import "server-only";
import { db } from "@/lib/db";
import { previousMonth, type ChallengeMonth } from "@/lib/challenge-time";

const DAY_KEY = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const DAYS = 30;

/** Club numbers for the admin Overview (v1's analytics dashboard). Seven small reads, admin-only, uncached. */
export async function getClubStats(current: ChallengeMonth, timeZone: string, now = new Date()) {
  const last = previousMonth(current);
  const since = new Date(now.getTime() - DAYS * 86_400_000);
  const [seasonPlayers, monthPlayers, out, thisMonth, lastMonth, species, byRegion, recent, regions] = await Promise.all([
    db.submission.groupBy({ by: ["userId"], where: { year: current.year } }),
    db.submission.groupBy({ by: ["userId"], where: current }),
    db.userChallengeStatus.count({ where: { year: current.year, isEliminated: true } }),
    db.submission.count({ where: current }),
    db.submission.count({ where: last }),
    db.submission.groupBy({ by: ["speciesId"], where: { year: current.year, speciesId: { not: null } } }),
    db.submission.groupBy({ by: ["regionId"], where: { year: current.year }, _count: { _all: true } }),
    db.submission.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.region.findMany({ select: { id: true, label: true } }),
  ]);

  // one bucket per local day, oldest first, including days with nothing
  const key = DAY_KEY(timeZone);
  const counts = new Map<string, number>();
  for (const s of recent) counts.set(key.format(s.createdAt), (counts.get(key.format(s.createdAt)) ?? 0) + 1);
  const daily = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(now.getTime() - (DAYS - 1 - i) * 86_400_000);
    return { date: date.toISOString(), count: counts.get(key.format(date)) ?? 0 };
  });

  const regionLabel = new Map(regions.map((r) => [r.id, r.label]));
  return {
    seasonPlayers: seasonPlayers.length,
    monthPlayers: monthPlayers.length,
    out,
    thisMonth,
    lastMonth,
    species: species.length,
    daily,
    byRegion: byRegion
      .map((r) => ({ label: regionLabel.get(r.regionId) ?? "Unknown", count: r._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}
