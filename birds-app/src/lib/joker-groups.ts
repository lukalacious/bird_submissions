/**
 * Session-free group-joker computation.
 * Used by server actions (joker-actions.ts) AND one-off scripts (scripts/*.ts),
 * so it must not import auth/next-auth. The Prisma client is passed in.
 */
import type { PrismaClient } from "@prisma/client";

export interface GroupBreakdownEntry {
  groupName: string;
  birdCount: number;
  jokersEarned: number;
}

// 3 birds in a group = 1 joker, +0.5 for each additional bird
export function calculateJokersFromGroup(birdCount: number): number {
  if (birdCount < 3) return 0;
  return 1 + (birdCount - 3) * 0.5;
}

/**
 * Compute group-based jokers for a user/year/month from their submissions.
 * Bird group lookup is scoped to the submission's region: the same bird name
 * can exist in multiple regions with different groupNames.
 */
export async function computeGroupJokers(
  db: PrismaClient,
  userId: string,
  year: number,
  month: number
): Promise<{ groupJokers: number; groupBreakdown: GroupBreakdownEntry[] }> {
  const submissions = await db.submission.findMany({
    where: { userId, year, month },
    select: { birdName: true, regionId: true },
  });

  if (submissions.length === 0) {
    return { groupJokers: 0, groupBreakdown: [] };
  }

  // Look up birds by (fullName, regionId) pairs — deduped
  const pairKey = (name: string, regionId: string) => `${regionId}:${name}`;
  const uniquePairs = new Map<string, { fullName: string; regionId: string }>();
  for (const sub of submissions) {
    uniquePairs.set(pairKey(sub.birdName, sub.regionId), {
      fullName: sub.birdName,
      regionId: sub.regionId,
    });
  }

  const birds = await db.bird.findMany({
    where: { OR: [...uniquePairs.values()] },
    select: { fullName: true, regionId: true, groupName: true },
  });

  const birdGroupMap = new Map<string, string>();
  for (const bird of birds) {
    if (bird.groupName) {
      birdGroupMap.set(pairKey(bird.fullName, bird.regionId), bird.groupName);
    }
  }

  // Count birds per group (groups merge across regions by name — intended,
  // e.g. "Flycatcher" in SA + "Flycatcher" in EA form one group)
  const groupCounts = new Map<string, number>();
  for (const sub of submissions) {
    const group = birdGroupMap.get(pairKey(sub.birdName, sub.regionId));
    if (group) {
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    }
  }

  const groupBreakdown: GroupBreakdownEntry[] = [];
  let groupJokers = 0;
  for (const [groupName, count] of groupCounts) {
    const jokersEarned = calculateJokersFromGroup(count);
    if (count >= 3) {
      groupBreakdown.push({ groupName, birdCount: count, jokersEarned });
    }
    groupJokers += jokersEarned;
  }

  groupBreakdown.sort((a, b) => b.jokersEarned - a.jokersEarned);
  return { groupJokers, groupBreakdown };
}

/**
 * Recalculate and persist group jokers for a user/year/month.
 * Preserves bonusJokers (form-based) — only the group component is rewritten.
 */
export async function recalculateGroupJokers(
  db: PrismaClient,
  userId: string,
  year: number,
  month: number
): Promise<{ success: boolean; groupJokers: number; totalJokers: number }> {
  const { groupJokers } = await computeGroupJokers(db, userId, year, month);

  const existing = await db.userJoker.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });
  const existingBonusJokers = existing?.bonusJokers || 0;
  const totalJokers = groupJokers + existingBonusJokers;

  await db.userJoker.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: {
      userId,
      year,
      month,
      jokers: groupJokers,
      totalJokers: groupJokers, // no bonus yet on create
      usedJokers: 0,
    },
    update: {
      jokers: groupJokers,
      totalJokers,
    },
  });

  return { success: true, groupJokers, totalJokers };
}
