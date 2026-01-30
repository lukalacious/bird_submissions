"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface JokerInfo {
  totalJokers: number;
  usedJokers: number;
  availableJokers: number;
  /** Jokers available for use this month (excludes jokers earned this month) */
  availableJokersForUse: number;
  groupBreakdown: {
    groupName: string;
    birdCount: number;
    jokersEarned: number;
  }[];
}

// Calculate jokers earned from a count of birds in the same group
// 3 birds = 1 joker, +0.5 for each additional bird
function calculateJokersFromGroup(birdCount: number): number {
  if (birdCount < 3) return 0;
  // 3 birds = 1, 4 birds = 1.5, 5 birds = 2, etc.
  return 1 + (birdCount - 3) * 0.5;
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
      available: j.jokers - j.usedJokers,
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

  // Get all submissions for this user/year/month with bird group info
  const submissions = await prisma.submission.findMany({
    where: {
      userId: targetUserId,
      year: targetYear,
      month: targetMonth,
    },
    select: {
      birdName: true,
    },
  });

  // Get bird group data for submitted birds
  const birdNames = submissions.map((s) => s.birdName);
  const birds = await prisma.bird.findMany({
    where: {
      fullName: { in: birdNames },
    },
    select: {
      fullName: true,
      groupName: true,
    },
  });

  // Create a map of bird name to group
  const birdGroupMap = new Map<string, string>();
  for (const bird of birds) {
    if (bird.groupName) {
      birdGroupMap.set(bird.fullName, bird.groupName);
    }
  }

  // Count birds per group
  const groupCounts = new Map<string, number>();
  for (const sub of submissions) {
    const group = birdGroupMap.get(sub.birdName);
    if (group) {
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    }
  }

  // Calculate jokers per group
  const groupBreakdown: JokerInfo["groupBreakdown"] = [];
  let totalEarnedJokers = 0;

  for (const [groupName, count] of groupCounts) {
    const jokersEarned = calculateJokersFromGroup(count);
    if (count >= 3) {
      groupBreakdown.push({
        groupName,
        birdCount: count,
        jokersEarned,
      });
    }
    totalEarnedJokers += jokersEarned;
  }

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

  // Get available jokers from PREVIOUS months (for use this month)
  const { available: availableFromPrevious } = await getAvailableJokersFromPreviousMonths(
    targetUserId,
    targetYear,
    targetMonth
  );

  return {
    totalJokers: totalEarnedJokers,
    usedJokers,
    availableJokers: Math.max(0, totalEarnedJokers - usedJokers),
    availableJokersForUse: Math.floor(availableFromPrevious), // Only whole jokers can be used
    groupBreakdown: groupBreakdown.sort((a, b) => b.jokersEarned - a.jokersEarned),
  };
}

// Recalculate and update jokers for a user/year/month
export async function recalculateJokers(
  userId: string,
  year: number,
  month: number
): Promise<{ success: boolean; jokers: number }> {
  const jokerInfo = await getUserJokerInfo(userId, year, month);
  if (!jokerInfo) {
    return { success: false, jokers: 0 };
  }

  try {
    await prisma.userJoker.upsert({
      where: {
        userId_year_month: { userId, year, month },
      },
      create: {
        userId,
        year,
        month,
        jokers: jokerInfo.totalJokers,
        usedJokers: 0,
      },
      update: {
        jokers: jokerInfo.totalJokers,
      },
    });

    return { success: true, jokers: jokerInfo.totalJokers };
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
    earned: j.jokers,
    used: j.usedJokers,
    available: j.jokers - j.usedJokers,
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

    // Create a special "joker submission" that counts towards monthly goal
    await prisma.submission.create({
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
    const jokerToUse = jokerRecords[0];
    if (jokerToUse) {
      await prisma.userJoker.update({
        where: { id: jokerToUse.id },
        data: { usedJokers: { increment: 1 } },
      });
    }

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
        hasData: jokerInfo && jokerInfo.totalJokers > 0
      };
    })
  );

  // Filter out months with no data
  return history.filter(h => h.hasData);
}
