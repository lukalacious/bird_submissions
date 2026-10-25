"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getLevelByPercentile, isInInitialPeriod, LEVELS } from "@/lib/gamification-constants";
import { rankLeaderboard } from "@/lib/leaderboard-rank";

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
  totalJokersEarned: number;
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

  // For users who reached 31+, get their completion timestamps in a single batch query
  const qualifyingUserIds = userStats
    .filter((stat) => stat._count._all >= 31)
    .map((stat) => stat.userId);

  const userCompletionTimes: Map<string, Date | null> = new Map();

  if (qualifyingUserIds.length > 0) {
    // Fetch first 31 submissions for all qualifying users in one query
    const allCompletionSubmissions = await prisma.submission.findMany({
      where: {
        userId: { in: qualifyingUserIds },
        year: currentYear,
        month: currentMonth,
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true, createdAt: true },
    });

    // Group by user and extract the 31st submission timestamp
    const userSubmissions = new Map<string, Date[]>();
    for (const sub of allCompletionSubmissions) {
      if (!userSubmissions.has(sub.userId)) {
        userSubmissions.set(sub.userId, []);
      }
      userSubmissions.get(sub.userId)!.push(sub.createdAt);
    }

    for (const [userId, timestamps] of userSubmissions) {
      if (timestamps.length >= 31) {
        userCompletionTimes.set(userId, timestamps[30]);
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
 * Get leaderboard for a given period, sorted by total jokers earned
 * @param period - "month" for a single month (current by default), "alltime" for all time
 * @param challengeFilter - "all", "active" (non-eliminated), or "eliminated"
 * @param monthOverride - view a past month's standings (only used when period is "month")
 */
export async function getLeaderboard(
  period: "month" | "alltime",
  challengeFilter: "all" | "active" | "eliminated" = "all",
  monthOverride?: { year: number; month: number }
): Promise<LeaderboardEntry[]> {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const now = new Date();
  const currentYear = now.getFullYear();
  const targetYear = monthOverride?.year ?? currentYear;
  const targetMonth = monthOverride?.month ?? now.getMonth() + 1;

  // Build the where clause for time filtering
  const jokerWhereClause =
    period === "month"
      ? {
          year: targetYear,
          month: targetMonth,
        }
      : {};

  const submissionWhereClause =
    period === "month"
      ? {
          year: targetYear,
          month: targetMonth,
        }
      : {};

  // Get eliminated user IDs for filtering
  const eliminatedStatuses = await prisma.userChallengeStatus.findMany({
    where: { year: currentYear, isEliminated: true },
    select: { userId: true },
  });
  const eliminatedUserIds = new Set(eliminatedStatuses.map((s) => s.userId));

  // Birds seen per user and jokers earned per user, both for ALL users so the
  // ranking can use them. Joker immunity rows are not real birds, so exclude.
  const [submissionCounts, jokerTotals] = await Promise.all([
    prisma.submission.groupBy({
      by: ["userId"],
      where: { ...submissionWhereClause, isJokerSubmission: false },
      _count: { _all: true },
    }),
    prisma.userJoker.groupBy({
      by: ["userId"],
      where: jokerWhereClause,
      _sum: { totalJokers: true },
    }),
  ]);

  // Rank: most birds first, then most jokers as the tie-breaker
  const ranked = rankLeaderboard(
    submissionCounts.map((s) => ({ userId: s.userId, birds: s._count._all })),
    jokerTotals.map((j) => ({ userId: j.userId, jokers: j._sum.totalJokers || 0 }))
  );

  // Filter based on challenge filter
  let filteredUsers = ranked;
  if (challengeFilter === "active") {
    filteredUsers = ranked.filter((u) => !eliminatedUserIds.has(u.userId));
  } else if (challengeFilter === "eliminated") {
    filteredUsers = ranked.filter((u) => eliminatedUserIds.has(u.userId));
  }

  // Take top 10 after filtering
  filteredUsers = filteredUsers.slice(0, 10);

  // Get user details
  const userIds = filteredUsers.map((u) => u.userId);
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

  return filteredUsers.map((u, index) => {
    const user = userMap.get(u.userId);

    return {
      rank: index + 1,
      userId: u.userId,
      userName: user?.username || user?.name || null,
      userImage: user?.image || null,
      level: userLevelMap.get(u.userId)?.level || 1,
      submissionCount: u.birds,
      totalJokersEarned: u.jokers,
      isCurrentUser: u.userId === currentUserId,
      isEliminated: eliminatedUserIds.has(u.userId),
    };
  });
}
