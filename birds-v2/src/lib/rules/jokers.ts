/**
 * Group-joker rules (ported from v1 lib/joker-groups.ts). Pure — no DB.
 * Groups come from Species.groupId, one canonical group across regions.
 */

export interface GroupJokerEntry {
  groupName: string;
  birdCount: number;
  jokersEarned: number;
}

// 3 birds in a group = 1 joker, +0.5 for each additional bird
export function calculateJokersFromGroup(birdCount: number): number {
  if (birdCount < 3) return 0;
  return 1 + (birdCount - 3) * 0.5;
}

/** Group jokers for one month's birds. `null` = ungrouped/custom bird. */
export function computeGroupJokers(groupNames: Array<string | null>): {
  total: number;
  breakdown: GroupJokerEntry[];
} {
  const counts = new Map<string, number>();
  for (const name of groupNames) {
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const breakdown: GroupJokerEntry[] = [];
  let total = 0;
  for (const [groupName, birdCount] of counts) {
    const jokersEarned = calculateJokersFromGroup(birdCount);
    if (jokersEarned > 0) breakdown.push({ groupName, birdCount, jokersEarned });
    total += jokersEarned;
  }
  breakdown.sort((a, b) => b.jokersEarned - a.jokersEarned);
  return { total, breakdown };
}

/**
 * Tray preview: how many more birds of this group until the next joker
 * step, and what it's worth ("2 more Shrikes = +1 joker").
 */
export function jokerHint(birdCount: number): { birdsNeeded: number; reward: number } {
  return birdCount < 3
    ? { birdsNeeded: 3 - birdCount, reward: 1 }
    : { birdsNeeded: 1, reward: 0.5 };
}
