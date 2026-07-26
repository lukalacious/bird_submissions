"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { computeGroupJokers, recalculateGroupJokers } from "@/lib/joker-groups";

interface JokerInfo {
  totalJokers: number;
  bonusJokers: number;
  usedJokers: number;
  availableJokers: number;
  /** Jokers available for use this month (excludes jokers earned this month) */
  availableJokersForUse: number;
  groupBreakdown: {
    groupName: string;
    birdCount: number;
    jokersEarned: number;
  }[];
  /** Per-rule detail of the form bonus (golden birds, lifers, photos, ...) */
  bonusBreakdown: { rule: string; value: number }[] | null;
  /** Positive when more jokers were used than the month now holds (e.g. after edits) */
  shortfall: number;
}

// Get available jokers from PREVIOUS months only (jokers earned in month X can only be used in months > X)
async function getAvailableJokersFromPreviousMonths(
  userId: string,
  year: number,
  currentMonth: number
): Promise<{ available: number; jokerRecords: { id: string; month: number; available: number }[] }> {
  // Get all joker records from months BEFORE the current month
  const jokerRecords = await prisma.userJoker.findMany({
    where: {
      userId,
      year,
      month: { lt: currentMonth }, // Only months before current
    },
    orderBy: { month: "asc" }, // Oldest first for FIFO usage
  });

  const recordsWithAvailable = jokerRecords
    .map((j) => ({
      id: j.id,
      month: j.month,
      available: j.totalJokers - j.usedJokers,
    }))
    .filter((r) => r.available > 0);

  const totalAvailable = recordsWithAvailable.reduce((sum, r) => sum + r.available, 0);

  return {
    available: totalAvailable,
    jokerRecords: recordsWithAvailable,
  };
}

// Get joker info for a user for a specific month
export async function getUserJokerInfo(
  userId?: string,
  year?: number,
  month?: number
): Promise<JokerInfo | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const targetUserId = userId || session.user.id;
  const settings = await prisma.settings.findFirst();
  const targetYear = year || settings?.currentYear || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  // Group-based jokers, region-scoped (see lib/joker-groups.ts)
  const { groupJokers: totalEarnedJokers, groupBreakdown } = await computeGroupJokers(
    prisma,
    targetUserId,
    targetYear,
    targetMonth
  );

  // Get used jokers from database for this specific month
  const jokerRecord = await prisma.userJoker.findUnique({
    where: {
      userId_year_month: {
        userId: targetUserId,
        year: targetYear,
        month: targetMonth,
      },
    },
  });

  const usedJokers = jokerRecord?.usedJokers || 0;
  const bonusJokers = jokerRecord?.bonusJokers || 0;
  const totalJokers = totalEarnedJokers + bonusJokers;

  // Get available jokers from PREVIOUS months (for use this month)
  const { available: availableFromPrevious } = await getAvailableJokersFromPreviousMonths(
    targetUserId,
    targetYear,
    targetMonth
  );

  return {
    totalJokers,
    bonusJokers,
    usedJokers,
    availableJokers: Math.max(0, totalJokers - usedJokers),
    availableJokersForUse: Math.floor(availableFromPrevious), // Only whole jokers can be used
    groupBreakdown: groupBreakdown.sort((a, b) => b.jokersEarned - a.jokersEarned),
    bonusBreakdown:
      (jokerRecord?.bonusBreakdown as { rule: string; value: number }[] | null) ?? null,
    shortfall: Math.max(0, usedJokers - totalJokers),
  };
}

// Recalculate and update jokers for a user/year/month
export async function recalculateJokers(
  userId: string,
  year: number,
  month: number
): Promise<{ success: boolean; jokers: number }> {
  try {
    const { totalJokers } = await recalculateGroupJokers(prisma, userId, year, month);
    return { success: true, jokers: totalJokers };
  } catch (error) {
    console.error("Failed to update jokers:", error);
    return { success: false, jokers: 0 };
  }
}

// Use a joker (called during elimination check)
// Uses jokers from PREVIOUS months only - jokers earned in month X can only be used in months > X
export async function useJoker(
  userId: string,
  year: number,
  month: number
): Promise<{ success: boolean; remainingJokers: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, remainingJokers: 0 };
  }

  // Get available jokers from previous months only
  const { available, jokerRecords } = await getAvailableJokersFromPreviousMonths(
    userId,
    year,
    month
  );

  if (available < 1 || jokerRecords.length === 0) {
    return { success: false, remainingJokers: 0 };
  }

  try {
    // Use from the oldest month (FIFO)
    const jokerToUse = jokerRecords[0];
    await prisma.userJoker.update({
      where: { id: jokerToUse.id },
      data: { usedJokers: { increment: 1 } },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      remainingJokers: Math.floor(available) - 1,
    };
  } catch (error) {
    console.error("Failed to use joker:", error);
    return { success: false, remainingJokers: 0 };
  }
}

// Get joker summary for all months in a year
export async function getYearlyJokerSummary(userId?: string, year?: number) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const targetUserId = userId || session.user.id;
  const settings = await prisma.settings.findFirst();
  const targetYear = year || settings?.currentYear || new Date().getFullYear();

  const jokers = await prisma.userJoker.findMany({
    where: {
      userId: targetUserId,
      year: targetYear,
    },
    orderBy: { month: "asc" },
  });

  return jokers.map((j) => ({
    month: j.month,
    earned: j.totalJokers,
    used: j.usedJokers,
    available: j.totalJokers - j.usedJokers,
  }));
}

// Use a joker for immunity (creates a submission that counts towards monthly goal)
// Users can use multiple jokers per month - no limit on redemptions
export async function useJokerForImmunity(
  regionId: string,
  year?: number,
  month?: number
): Promise<{ success: boolean; error?: string; remaining?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const userId = session.user.id;
  const settings = await prisma.settings.findFirst();
  const targetYear = year || settings?.currentYear || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  try {
    // Get available jokers from PREVIOUS months only (can't use jokers earned this month)
    const { available, jokerRecords } = await getAvailableJokersFromPreviousMonths(
      userId,
      targetYear,
      targetMonth
    );

    if (available < 1) {
      return { success: false, error: "No jokers available (jokers earned this month cannot be used until next month)" };
    }

    // Count existing joker submissions to generate unique name
    const existingJokerCount = await prisma.submission.count({
      where: {
        userId,
        regionId,
        year: targetYear,
        month: targetMonth,
        isJokerSubmission: true,
      },
    });

    // Create a unique joker submission name (e.g., "🃏 Joker #1", "🃏 Joker #2")
    const jokerNumber = existingJokerCount + 1;
    const jokerBirdName = `🃏 Joker #${jokerNumber}`;

    // ATOMIC: the joker submission and the joker deduction must succeed or
    // fail together — otherwise a mid-failure grants a free submission.
    const jokerToUse = jokerRecords[0];
    await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          userId,
          regionId,
          birdName: jokerBirdName,
          year: targetYear,
          month: targetMonth,
          isCustomBird: false,
          isJokerSubmission: true,
        },
      });

      // Deduct from the oldest month's joker record (FIFO)
      if (jokerToUse) {
        await tx.userJoker.update({
          where: { id: jokerToUse.id },
          data: { usedJokers: { increment: 1 } },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/twitch");
    revalidatePath("/submissions");

    const remaining = Math.floor(available) - 1;
    return { success: true, remaining };
  } catch (error) {
    console.error("Failed to use joker:", error);
    return { success: false, error: "Failed to use joker" };
  }
}

// Get joker history for entire year with group breakdowns
export async function getJokerHistory(userId?: string, year?: number) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const targetUserId = userId || session.user.id;
  const settings = await prisma.settings.findFirst();
  const targetYear = year || settings?.currentYear || new Date().getFullYear();

  // Get all months 1-12 for the year
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const history = await Promise.all(
    months.map(async (month) => {
      const jokerInfo = await getUserJokerInfo(targetUserId, targetYear, month);
      return {
        month,
        year: targetYear,
        ...jokerInfo,
        hasData: jokerInfo && (jokerInfo.totalJokers > 0 || jokerInfo.bonusJokers !== 0)
      };
    })
  );

  // Filter out months with no data
  return history.filter(h => h.hasData);
}

// Community joker activity - shows all users' accumulated joker balances
// This is public data for transparency
export interface CommunityMonthlyBreakdown {
  month: number;
  groupJokers: number;
  bonusJokers: number;
  totalJokers: number;
  usedJokers: number;
  bonusBreakdown: { rule: string; value: number }[] | null;
}

export interface CommunityJokerEntry {
  userId: string;
  userName: string | null;
  userImage: string | null;
  totalEarned: number;
  totalUsed: number;
  available: number;
  monthlyBreakdown: CommunityMonthlyBreakdown[];
}

export async function getCommunityJokerActivity(
  year: number
): Promise<CommunityJokerEntry[]> {
  // Get ALL UserJoker records for the year
  const allRecords = await prisma.userJoker.findMany({
    where: { year },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
    orderBy: { month: "asc" },
  });

  // Group records by userId
  const userRecordsMap = new Map<string, typeof allRecords>();
  for (const record of allRecords) {
    const existing = userRecordsMap.get(record.userId) || [];
    existing.push(record);
    userRecordsMap.set(record.userId, existing);
  }

  // Build community joker entries with cumulative totals + monthly breakdowns
  const entries: CommunityJokerEntry[] = [];

  for (const [userId, records] of userRecordsMap) {
    const totalEarned = records.reduce((sum, r) => sum + r.totalJokers, 0);
    const totalUsed = records.reduce((sum, r) => sum + r.usedJokers, 0);
    const available = totalEarned - totalUsed;

    if (totalEarned === 0 && totalUsed === 0) continue;

    const monthlyBreakdown: CommunityMonthlyBreakdown[] = records.map((r) => ({
      month: r.month,
      groupJokers: r.jokers,
      bonusJokers: r.bonusJokers,
      totalJokers: r.totalJokers,
      usedJokers: r.usedJokers,
      bonusBreakdown: r.bonusBreakdown as { rule: string; value: number }[] | null,
    }));

    entries.push({
      userId,
      userName: records[0].user.username || records[0].user.name,
      userImage: records[0].user.image,
      totalEarned,
      totalUsed,
      available,
      monthlyBreakdown,
    });
  }

  // Sort by available balance (highest first)
  return entries.sort((a, b) => b.available - a.available);
}
