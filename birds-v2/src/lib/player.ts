import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { ChallengeMonth } from "@/lib/challenge-time";

/**
 * One player's numbers for a month, in two queries — v1's dashboard needed
 * ~60 (getJokerHistory called getUserJokerInfo 12 times).
 * Callers resolve the user via lib/dal.ts first; never pass a client-supplied id.
 */
export const getMonthSnapshot = cache(async (userId: string, { year, month }: ChallengeMonth) => {
  const [birdCount, jokerMonths] = await Promise.all([
    db.submission.count({ where: { userId, year, month } }),
    db.userJoker.findMany({
      where: { userId, year },
      select: { month: true, totalJokers: true, usedJokers: true },
    }),
  ]);

  // Jokers earned in month N are spendable from N+1 — never the same month
  const spendable = jokerMonths
    .filter((j) => j.month < month)
    .reduce((sum, j) => sum + j.totalJokers - j.usedJokers, 0);
  const earningThisMonth = jokerMonths.find((j) => j.month === month)?.totalJokers ?? 0;

  return { birdCount, spendable, earningThisMonth };
});
