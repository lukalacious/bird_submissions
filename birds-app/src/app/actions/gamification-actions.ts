"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LEVELS, getLevelByPercentile, isInInitialPeriod } from "@/lib/gamification-constants";

export interface UserLevel {
  level: number;
  name: string;
  icon: string;
  totalSubmissions: number;
  monthlySubmissions: number;
  percentile: number;
  rank: number;
  totalUsers: number;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  isActiveThisMonth: boolean;
}

export interface MonthlyChallenge {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface UserGamification {
  level: UserLevel;
  streak: UserStreak;
  monthlyChallenges: MonthlyChallenge[];
}

/**
 * Calculate user level based on quartile ranking
 * - During first 2 months: Everyone is Fledgling
 * - After: Top 25% = Twitcher, Middle 50% = Birder, Bottom 25% = Fledgling
 * - Ranking based on speed to reach period limit (31 birds)
 */
export async function getUserLevel(userId: string): Promise<UserLevel> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Get user's total submissions
  const totalSubmissions = await prisma.submission.count({
    where: { userId },
  });

  // Get user's submissions this month
  const monthlySubmissions = await prisma.submission.count({
    where: {
      userId,
      year: currentYear,
      month: currentMonth,
    },
  });

  // During first 2 months, everyone is Fledgling
  if (isInInitialPeriod()) {
    const totalUsers = await prisma.user.count();
    return {
      level: LEVELS[0].level,
      name: LEVELS[0].name,
      icon: LEVELS[0].icon,
      totalSubmissions,
      monthlySubmissions,
      percentile: 0,
      rank: 0,
      totalUsers,
    };
  }

  // Get all users' monthly performance for ranking
  const userRankings = await calculateUserRankings(currentYear, currentMonth);
  const totalUsers = userRankings.length;

  // Find current user's rank
  const userRankIndex = userRankings.findIndex((r) => r.userId === userId);
  const rank = userRankIndex === -1 ? totalUsers : userRankIndex + 1;

  // Calculate percentile (higher is better)
  // rank 1 = 100th percentile, rank N = close to 0th percentile
  const percentile = totalUsers > 0 ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;

  // Get level based on percentile
  const levelInfo = getLevelByPercentile(percentile);

  return {
    level: levelInfo.level,
    name: levelInfo.name,
    icon: levelInfo.icon,
    totalSubmissions,
    monthlySubmissions,
    percentile,
    rank,
    totalUsers,
  };
}

/**
 * Calculate user rankings for the current month
 * Ranking criteria:
 * 1. Users who reached 31 birds first (by earliest completion date)
 * 2. Users who haven't reached 31 yet, ranked by submission count
 */
async function calculateUserRankings(
  year: number,
  month: number
): Promise<{ userId: string; count: number; completedAt: Date | null }[]> {
  // Get all users with their monthly submission counts
  const userStats = await prisma.submission.groupBy({
    by: ["userId"],
    where: { year, month },
    _count: { _all: true },
  });

  // For users who reached 31+, get their completion timestamp
  const userCompletionTimes: Map<string, Date | null> = new Map();

  for (const stat of userStats) {
    if (stat._count._all >= 31) {
      // Find when they hit 31 submissions
      const submissions = await prisma.submission.findMany({
        where: { userId: stat.userId, year, month },
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
    // Both completed - sort by completion time
    if (a.completedAt && b.completedAt) {
      return a.completedAt.getTime() - b.completedAt.getTime();
    }
    // Only a completed - a ranks higher
    if (a.completedAt && !b.completedAt) return -1;
    // Only b completed - b ranks higher
    if (!a.completedAt && b.completedAt) return 1;
    // Neither completed - sort by count descending
    return b.count - a.count;
  });

  return rankings;
}

/**
 * Calculate streak from months with submissions
 */
function calculateStreak(
  monthsWithSubmissions: { year: number; month: number }[]
): { currentStreak: number; longestStreak: number; isActiveThisMonth: boolean } {
  if (monthsWithSubmissions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActiveThisMonth: false };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Sort by date descending
  const sorted = [...monthsWithSubmissions].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Check if active this month
  const isActiveThisMonth =
    sorted[0]?.year === currentYear && sorted[0]?.month === currentMonth;

  // Calculate current streak
  let currentStreak = 0;
  let expectedYear = currentYear;
  let expectedMonth = currentMonth;

  // If not active this month, start from last month
  if (!isActiveThisMonth) {
    expectedMonth--;
    if (expectedMonth === 0) {
      expectedMonth = 12;
      expectedYear--;
    }
  }

  for (const entry of sorted) {
    if (entry.year === expectedYear && entry.month === expectedMonth) {
      currentStreak++;
      expectedMonth--;
      if (expectedMonth === 0) {
        expectedMonth = 12;
        expectedYear--;
      }
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let streak = 0;
  let prevYear = 0;
  let prevMonth = 0;

  // Sort ascending for longest streak calculation
  const sortedAsc = [...monthsWithSubmissions].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  for (const entry of sortedAsc) {
    const isConsecutive =
      (entry.year === prevYear && entry.month === prevMonth + 1) ||
      (entry.year === prevYear + 1 && entry.month === 1 && prevMonth === 12);

    if (isConsecutive || streak === 0) {
      streak++;
    } else {
      streak = 1;
    }

    longestStreak = Math.max(longestStreak, streak);
    prevYear = entry.year;
    prevMonth = entry.month;
  }

  return { currentStreak, longestStreak, isActiveThisMonth };
}

/**
 * Get user's streak information
 */
export async function getUserStreak(userId: string): Promise<UserStreak> {
  const monthsWithSubmissions = await prisma.submission.groupBy({
    by: ["year", "month"],
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return calculateStreak(monthsWithSubmissions);
}

/**
 * Get progress toward monthly challenges
 */
export async function getMonthlyProgress(userId: string): Promise<MonthlyChallenge[]> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Get current month submissions
  const currentMonthCount = await prisma.submission.count({
    where: {
      userId,
      year: currentYear,
      month: currentMonth,
    },
  });

  // Get regions user has submitted to this month
  const currentMonthRegions = await prisma.submission.groupBy({
    by: ["regionId"],
    where: {
      userId,
      year: currentYear,
      month: currentMonth,
    },
  });

  // Get all regions user has ever submitted to
  const allUserRegions = await prisma.submission.groupBy({
    by: ["regionId"],
    where: { userId },
  });

  // Get total regions available
  const totalRegions = await prisma.region.count();

  // Get user's personal best for a month
  const personalBest = await prisma.submission.groupBy({
    by: ["year", "month"],
    where: { userId },
    _count: { _all: true },
    orderBy: { _count: { birdName: "desc" } },
    take: 1,
  });

  const userPersonalBest = personalBest[0]?._count._all || 0;

  // Build challenges
  const challenges: MonthlyChallenge[] = [];

  // Challenge 1: Reach the monthly limit (31 birds)
  challenges.push({
    id: "reach_limit",
    title: "Complete the month",
    description: "Twitch 31 bird sightings this month",
    current: currentMonthCount,
    target: 31,
    completed: currentMonthCount >= 31,
  });

  // Challenge 2: Submit to a new region (only if user hasn't covered all)
  if (allUserRegions.length < totalRegions) {
    const regionsThisMonth = currentMonthRegions.length;
    challenges.push({
      id: "new_region",
      title: "Explore a new region",
      description: "Twitch in a region you haven't visited before",
      current: regionsThisMonth > 0 ? 1 : 0,
      target: 1,
      completed: regionsThisMonth > 0,
    });
  }

  // Challenge 3: Beat personal best (only if they have a previous best)
  if (userPersonalBest > 0) {
    challenges.push({
      id: "personal_best",
      title: "Beat your personal best",
      description: `Your best: ${userPersonalBest} birds in a month`,
      current: currentMonthCount,
      target: userPersonalBest + 1,
      completed: currentMonthCount > userPersonalBest,
    });
  }

  return challenges;
}

/**
 * Get all gamification data for current user
 */
export async function getCurrentUserGamification(): Promise<UserGamification | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const [level, streak, monthlyChallenges] = await Promise.all([
    getUserLevel(userId),
    getUserStreak(userId),
    getMonthlyProgress(userId),
  ]);

  return {
    level,
    streak,
    monthlyChallenges,
  };
}
