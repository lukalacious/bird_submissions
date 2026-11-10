import "server-only";
import { db } from "@/lib/db";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { forecastStanding, type Standing } from "@/lib/rules/standing";
import { getMonthRules, getSettings } from "@/lib/settings";

export interface PlayerStanding {
  userId: string;
  standing: Standing;
  birdCount: number;
  /** birds per month of the season, index 0 = January */
  months: number[];
  jokersLeft: number;
}

/**
 * Month-end forecast for one player (Today) or everyone (admin), from the
 * same three reads the month-end job makes.
 */
export async function getStandings(month: ChallengeMonth, userId?: string): Promise<{ threshold: number; players: PlayerStanding[] }> {
  const [settings, rules] = await Promise.all([getSettings(), getMonthRules(month)]);
  const who = userId ? { userId } : {};
  const [users, statuses, counts, jokers] = await Promise.all([
    userId ? [{ id: userId }] : db.user.findMany({ select: { id: true } }),
    db.userChallengeStatus.findMany({ where: { year: month.year, ...who } }),
    db.submission.groupBy({ by: ["userId", "month"], where: { year: month.year, ...who }, _count: { _all: true } }),
    db.userJoker.findMany({ where: { year: month.year, ...who }, select: { userId: true, year: true, month: true, totalJokers: true, usedJokers: true } }),
  ]);
  const statusBy = new Map(statuses.map((s) => [s.userId, s]));
  const countBy = new Map(counts.map((c) => [`${c.userId}:${c.month}`, c._count._all]));

  const players = users.map(({ id }) => {
    const birdsInMonth = (m: number) => countBy.get(`${id}:${m}`) ?? 0;
    const mine = jokers.filter((j) => j.userId === id);
    return {
      userId: id,
      birdCount: birdsInMonth(month.month),
      months: Array.from({ length: 12 }, (_, i) => birdsInMonth(i + 1)),
      jokersLeft: mine.filter((j) => j.month < month.month).reduce((sum, j) => sum + j.totalJokers - j.usedJokers, 0),
      standing: forecastStanding({
        month: month.month,
        threshold: rules.eliminationThreshold,
        status: statusBy.get(id) ?? null,
        birdsInMonth,
        jokerMonths: mine
          .filter((j) => j.month < month.month)
          .map((j) => ({ year: j.year, month: j.month, available: j.totalJokers - j.usedJokers })),
        maxEmptyMonths: settings.maxEmptyMonths,
        poolFractions: settings.poolFractionalJokers,
      }),
    };
  });
  return { threshold: rules.eliminationThreshold, players };
}
