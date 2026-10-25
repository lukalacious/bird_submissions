/**
 * Pure ranking logic for the leaderboard.
 *
 * Kept free of Prisma/session imports so it can be unit-tested and reused
 * by server actions and scripts alike (same pattern as joker-groups.ts).
 */

export interface RankedUser {
  userId: string;
  /** Real birds twitched in the period (joker immunity rows excluded). */
  birds: number;
  /** Gross jokers earned in the period (totalJokers summed, usage ignored). */
  jokers: number;
}

/**
 * Merge per-user bird counts and joker totals over the union of both sets,
 * then sort: most birds first, then most jokers, then userId for a stable,
 * deterministic order across renders.
 */
export function rankLeaderboard(
  birdCounts: Iterable<{ userId: string; birds: number }>,
  jokerTotals: Iterable<{ userId: string; jokers: number }>
): RankedUser[] {
  const merged = new Map<string, RankedUser>();

  for (const b of birdCounts) {
    merged.set(b.userId, { userId: b.userId, birds: b.birds, jokers: 0 });
  }
  for (const j of jokerTotals) {
    const existing = merged.get(j.userId);
    if (existing) {
      existing.jokers = j.jokers;
    } else {
      merged.set(j.userId, { userId: j.userId, birds: 0, jokers: j.jokers });
    }
  }

  return [...merged.values()].sort(
    (a, b) =>
      b.birds - a.birds ||
      b.jokers - a.jokers ||
      a.userId.localeCompare(b.userId)
  );
}
