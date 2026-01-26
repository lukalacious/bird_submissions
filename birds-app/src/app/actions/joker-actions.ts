"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface JokerInfo {
  totalJokers: number;
  usedJokers: number;
  availableJokers: number;
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

  // Get used jokers from database
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

  return {
    totalJokers: totalEarnedJokers,
    usedJokers,
    availableJokers: Math.max(0, totalEarnedJokers - usedJokers),
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
export async function useJoker(
  userId: string,
  year: number,
  month: number
): Promise<{ success: boolean; remainingJokers: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, remainingJokers: 0 };
  }

  const jokerRecord = await prisma.userJoker.findUnique({
    where: {
      userId_year_month: { userId, year, month },
    },
  });

  if (!jokerRecord) {
    return { success: false, remainingJokers: 0 };
  }

  const available = jokerRecord.jokers - jokerRecord.usedJokers;
  if (available < 1) {
    return { success: false, remainingJokers: 0 };
  }

  try {
    const updated = await prisma.userJoker.update({
      where: {
        userId_year_month: { userId, year, month },
      },
      data: {
        usedJokers: { increment: 1 },
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      remainingJokers: updated.jokers - updated.usedJokers,
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
