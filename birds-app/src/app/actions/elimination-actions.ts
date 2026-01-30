"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface EliminationStatus {
  isEliminated: boolean;
  eliminatedAt: Date | null;
  eliminationMonth: number | null;
  joinedMonth: number;
  jokersAvailable: number;
}

export async function getUserEliminationStatus(
  userId?: string,
  year?: number
): Promise<EliminationStatus | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const targetUserId = userId || session.user.id;
  const settings = await prisma.settings.findFirst();
  const targetYear = year || settings?.currentYear || new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const status = await prisma.userChallengeStatus.findUnique({
    where: {
      userId_year: {
        userId: targetUserId,
        year: targetYear,
      },
    },
  });

  // Get jokers for this user/year from PREVIOUS months only
  // (jokers earned in month X can only be used in months > X)
  const jokerData = await prisma.userJoker.findMany({
    where: {
      userId: targetUserId,
      year: targetYear,
      month: { lt: currentMonth }, // Only previous months
    },
  });

  const totalJokers = jokerData.reduce((sum, j) => sum + j.jokers, 0);
  const usedJokers = jokerData.reduce((sum, j) => sum + j.usedJokers, 0);

  if (!status) {
    // User hasn't been initialized for this year - they're active by default
    return {
      isEliminated: false,
      eliminatedAt: null,
      eliminationMonth: null,
      joinedMonth: 1,
      jokersAvailable: Math.floor(totalJokers - usedJokers),
    };
  }

  return {
    isEliminated: status.isEliminated,
    eliminatedAt: status.eliminatedAt,
    eliminationMonth: status.eliminationMonth,
    joinedMonth: status.joinedMonth,
    jokersAvailable: Math.floor(totalJokers - usedJokers),
  };
}

export async function initializeUserChallenge(userId: string, year: number, joinMonth?: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const currentMonth = new Date().getMonth() + 1;
  const effectiveJoinMonth = joinMonth || currentMonth;

  try {
    await prisma.userChallengeStatus.upsert({
      where: {
        userId_year: { userId, year },
      },
      create: {
        userId,
        year,
        joinedMonth: effectiveJoinMonth,
        isEliminated: false,
      },
      update: {}, // Don't update if exists
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to initialize user challenge:", error);
    return { success: false, error: "Failed to initialize challenge status" };
  }
}

export async function checkAndUpdateElimination(
  userId: string,
  year: number,
  month: number
): Promise<{ eliminated: boolean; usedJoker: boolean }> {
  const settings = await prisma.settings.findFirst();
  const threshold = settings?.eliminationThreshold || 30;

  // Get user's challenge status
  let status = await prisma.userChallengeStatus.findUnique({
    where: { userId_year: { userId, year } },
  });

  // Initialize if not exists
  if (!status) {
    status = await prisma.userChallengeStatus.create({
      data: {
        userId,
        year,
        joinedMonth: month, // They join in the month they first submit
      },
    });
  }

  // Skip check if user joined after this month
  if (status.joinedMonth > month) {
    return { eliminated: false, usedJoker: false };
  }

  // Already eliminated
  if (status.isEliminated) {
    return { eliminated: true, usedJoker: false };
  }

  // Count submissions for the month
  const submissionCount = await prisma.submission.count({
    where: { userId, year, month },
  });

  // If they meet the threshold, they're safe
  if (submissionCount >= threshold) {
    return { eliminated: false, usedJoker: false };
  }

  // Check if they have jokers available from PREVIOUS months
  // (jokers earned in month X can only be used in months > X)
  const jokerRecords = await prisma.userJoker.findMany({
    where: {
      userId,
      year,
      month: { lt: month }, // Only previous months
    },
    orderBy: { month: "asc" }, // Oldest first for FIFO usage
  });

  const availableJokers = jokerRecords.reduce(
    (sum, j) => sum + (j.jokers - j.usedJokers),
    0
  );

  if (availableJokers >= 1) {
    // Find the oldest joker record with available jokers (FIFO)
    const jokerToUse = jokerRecords.find((j) => j.jokers - j.usedJokers >= 1);
    if (jokerToUse) {
      await prisma.userJoker.update({
        where: { id: jokerToUse.id },
        data: { usedJokers: { increment: 1 } },
      });
      return { eliminated: false, usedJoker: true };
    }
  }

  // Eliminate the user
  await prisma.userChallengeStatus.update({
    where: { userId_year: { userId, year } },
    data: {
      isEliminated: true,
      eliminatedAt: new Date(),
      eliminationMonth: month,
    },
  });

  return { eliminated: true, usedJoker: false };
}

export async function getEliminationLeaderboard(year?: number) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const settings = await prisma.settings.findFirst();
  const targetYear = year || settings?.currentYear || new Date().getFullYear();

  // Get all users with their challenge status
  const users = await prisma.user.findMany({
    where: {
      submissions: { some: { year: targetYear } },
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      challengeStatus: {
        where: { year: targetYear },
        select: {
          isEliminated: true,
          eliminationMonth: true,
          joinedMonth: true,
        },
      },
      submissions: {
        where: { year: targetYear },
        select: { month: true },
      },
    },
  });

  return users.map((user) => {
    const status = user.challengeStatus[0];
    const monthCounts = new Map<number, number>();
    for (const sub of user.submissions) {
      monthCounts.set(sub.month, (monthCounts.get(sub.month) || 0) + 1);
    }

    return {
      id: user.id,
      name: user.username || user.name || "Anonymous",
      image: user.image,
      isEliminated: status?.isEliminated || false,
      eliminationMonth: status?.eliminationMonth || null,
      joinedMonth: status?.joinedMonth || 1,
      monthlySubmissions: Object.fromEntries(monthCounts),
    };
  });
}

// Admin: manually eliminate a user
export async function adminEliminateUser(userId: string, year: number, month: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.userChallengeStatus.upsert({
      where: { userId_year: { userId, year } },
      create: {
        userId,
        year,
        isEliminated: true,
        eliminatedAt: new Date(),
        eliminationMonth: month,
      },
      update: {
        isEliminated: true,
        eliminatedAt: new Date(),
        eliminationMonth: month,
      },
    });

    revalidatePath("/admin/elimination");
    return { success: true };
  } catch (error) {
    console.error("Failed to eliminate user:", error);
    return { success: false, error: "Failed to eliminate user" };
  }
}

// Admin: reinstate a user
export async function adminReinstateUser(userId: string, year: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.userChallengeStatus.update({
      where: { userId_year: { userId, year } },
      data: {
        isEliminated: false,
        eliminatedAt: null,
        eliminationMonth: null,
      },
    });

    revalidatePath("/admin/elimination");
    return { success: true };
  } catch (error) {
    console.error("Failed to reinstate user:", error);
    return { success: false, error: "Failed to reinstate user" };
  }
}
