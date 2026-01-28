"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getLevelByPercentile, isInInitialPeriod, LEVELS } from "@/lib/gamification-constants";

export interface FeedEntry {
  id: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
  userLevel: number;
  regionLabel: string;
  birdNames: string[];
  timestamp: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  level: number;
  submissionCount: number;
  isCurrentUser: boolean;
  isEliminated: boolean;
}

/**
 * Calculate user rankings for the current month
 * Returns a map of userId -> { rank, percentile, level }
 */
async function calculateUserLevels(): Promise<Map<string, { rank: number; percentile: number; level: number }>> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // During initial period, everyone is Fledgling
  if (isInInitialPeriod()) {
    const users = await prisma.user.findMany({ select: { id: true } });
    const levelMap = new Map<string, { rank: number; percentile: number; level: number }>();
    users.forEach((u) => levelMap.set(u.id, { rank: 0, percentile: 0, level: 1 }));
    return levelMap;
  }

  // Get all users' monthly submission counts
  const userStats = await prisma.submission.groupBy({
    by: ["userId"],
    where: { year: currentYear, month: currentMonth },
    _count: { _all: true },
  });

  // For users who reached 31+, get their completion timestamp
  const userCompletionTimes: Map<string, Date | null> = new Map();

  for (const stat of userStats) {
    if (stat._count._all >= 31) {
      const submissions = await prisma.submission.findMany({
        where: { userId: stat.userId, year: currentYear, month: currentMonth },
        orderBy: { createdAt: "asc" },
        take: 31,
        select: { createdAt: true },
      });
      if (submissions.length >= 31) {
        userCompletionTimes.set(stat.userId, submissions[30].createdAt);
      }
    }
  }

  // Build ranking list
  const rankings = userStats.map((stat) => ({
    userId: stat.userId,
    count: stat._count._all,
    completedAt: userCompletionTimes.get(stat.userId) || null,
  }));

  // Sort: completed users first (by completion time), then by count
  rankings.sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return a.completedAt.getTime() - b.completedAt.getTime();
    }
    if (a.completedAt && !b.completedAt) return -1;
    if (!a.completedAt && b.completedAt) return 1;
    return b.count - a.count;
  });

  const totalUsers = rankings.length;
  const levelMap = new Map<string, { rank: number; percentile: number; level: number }>();

  rankings.forEach((r, index) => {
    const rank = index + 1;
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;
    const levelInfo = getLevelByPercentile(percentile);
    levelMap.set(r.userId, { rank, percentile, level: levelInfo.level });
  });

  return levelMap;
}

/**
 * Get community feed with recent submissions
 * Groups consecutive submissions by the same user within 5 minutes
 */
export async function getCommunityFeed(limit = 20): Promise<FeedEntry[]> {
  // Get recent submissions with user and region info
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    take: limit * 3, // Fetch more to account for grouping
    select: {
      id: true,
      userId: true,
      birdName: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
      region: {
        select: {
          label: true,
        },
      },
    },
  });

  // Get user levels based on quartile ranking
  const userLevelMap = await calculateUserLevels();

  // Group submissions by user and time window (5 minutes)
  const feedEntries: FeedEntry[] = [];
  let currentGroup: {
    userId: string;
    userName: string | null;
    userImage: string | null;
    regionLabel: string;
    birdNames: string[];
    timestamp: Date;
    firstId: string;
  } | null = null;

  const FIVE_MINUTES = 5 * 60 * 1000;

  for (const submission of submissions) {
    const shouldStartNewGroup =
      !currentGroup ||
      currentGroup.userId !== submission.userId ||
      currentGroup.regionLabel !== submission.region.label ||
      submission.createdAt.getTime() < currentGroup.timestamp.getTime() - FIVE_MINUTES;

    if (shouldStartNewGroup) {
      // Save current group if exists
      if (currentGroup) {
        feedEntries.push({
          id: currentGroup.firstId,
          userId: currentGroup.userId,
          userName: currentGroup.userName,
          userImage: currentGroup.userImage,
          userLevel: userLevelMap.get(currentGroup.userId)?.level || 1,
          regionLabel: currentGroup.regionLabel,
          birdNames: currentGroup.birdNames,
          timestamp: currentGroup.timestamp,
        });
      }

      // Start new group
      currentGroup = {
        userId: submission.userId,
        userName: submission.user.username || submission.user.name,
        userImage: submission.user.image,
        regionLabel: submission.region.label,
        birdNames: [submission.birdName],
        timestamp: submission.createdAt,
        firstId: submission.id,
      };
    } else {
      // Add to current group
      currentGroup!.birdNames.push(submission.birdName);
    }

    // Stop if we have enough entries
    if (feedEntries.length >= limit) break;
  }

  // Don't forget the last group
  if (currentGroup && feedEntries.length < limit) {
    feedEntries.push({
      id: currentGroup.firstId,
      userId: currentGroup.userId,
      userName: currentGroup.userName,
      userImage: currentGroup.userImage,
      userLevel: userLevelMap.get(currentGroup.userId)?.level || 1,
      regionLabel: currentGroup.regionLabel,
      birdNames: currentGroup.birdNames,
      timestamp: currentGroup.timestamp,
    });
  }

  return feedEntries.slice(0, limit);
}

/**
 * Get leaderboard for a given period
 * @param period - "month" for current month, "alltime" for all time
 * @param challengeFilter - "all", "active" (non-eliminated), or "eliminated"
 */
export async function getLeaderboard(
  period: "month" | "alltime",
  challengeFilter: "all" | "active" | "eliminated" = "all"
): Promise<LeaderboardEntry[]> {
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Build the where clause for time filtering
  const now = new Date();
  const currentYear = now.getFullYear();
  const whereClause =
    period === "month"
      ? {
          year: currentYear,
          month: now.getMonth() + 1,
        }
      : {};

  // Get eliminated user IDs for filtering
  const eliminatedStatuses = await prisma.userChallengeStatus.findMany({
    where: { year: currentYear, isEliminated: true },
    select: { userId: true },
  });
  const eliminatedUserIds = new Set(eliminatedStatuses.map((s) => s.userId));

  // Get submission counts grouped by user
  const userCounts = await prisma.submission.groupBy({
    by: ["userId"],
    where: whereClause,
    _count: { _all: true },
    orderBy: { _count: { birdName: "desc" } },
    take: 50, // Get more to account for filtering
  });

  // Filter based on challenge filter
  let filteredCounts = userCounts;
  if (challengeFilter === "active") {
    filteredCounts = userCounts.filter((uc) => !eliminatedUserIds.has(uc.userId));
  } else if (challengeFilter === "eliminated") {
    filteredCounts = userCounts.filter((uc) => eliminatedUserIds.has(uc.userId));
  }

  // Take top 10 after filtering
  filteredCounts = filteredCounts.slice(0, 10);

  // Get user details
  const userIds = filteredCounts.map((uc) => uc.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Get user levels based on quartile ranking
  const userLevelMap = await calculateUserLevels();

  return filteredCounts.map((uc, index) => {
    const user = userMap.get(uc.userId);

    return {
      rank: index + 1,
      userId: uc.userId,
      userName: user?.username || user?.name || null,
      userImage: user?.image || null,
      level: userLevelMap.get(uc.userId)?.level || 1,
      submissionCount: uc._count._all,
      isCurrentUser: uc.userId === currentUserId,
      isEliminated: eliminatedUserIds.has(uc.userId),
    };
  });
}
