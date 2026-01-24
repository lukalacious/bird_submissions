"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Helper to check if current user is admin
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Get overview statistics
export async function getAnalyticsOverview() {
  try {
    await requireAdmin();

    const [totalUsers, totalSubmissions, uniqueSpecies, totalRegions] =
      await Promise.all([
        prisma.user.count(),
        prisma.submission.count(),
        prisma.submission
          .groupBy({
            by: ["birdName"],
          })
          .then((results) => results.length),
        prisma.region.count(),
      ]);

    // Get active users (users with at least one submission)
    const activeUsers = await prisma.submission
      .groupBy({
        by: ["userId"],
      })
      .then((results) => results.length);

    return {
      totalUsers,
      activeUsers,
      totalSubmissions,
      uniqueSpecies,
      totalRegions,
    };
  } catch (error) {
    console.error("Failed to get analytics overview:", error);
    return null;
  }
}

// Get submissions over time (last 30 days)
export async function getSubmissionTrends() {
  try {
    await requireAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const submissions = await prisma.submission.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by date
    const dailyCounts: Record<string, number> = {};
    
    // Initialize all days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyCounts[dateStr] = 0;
    }

    // Count submissions per day
    submissions.forEach((submission) => {
      const dateStr = submission.createdAt.toISOString().split("T")[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    });

    // Convert to array for Tremor
    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      submissions: count,
    }));
  } catch (error) {
    console.error("Failed to get submission trends:", error);
    return [];
  }
}

// Get submissions by region
export async function getSubmissionsByRegion() {
  try {
    await requireAdmin();

    const regions = await prisma.region.findMany({
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    return regions
      .map((region) => ({
        region: region.label,
        submissions: region._count.submissions,
      }))
      .sort((a, b) => b.submissions - a.submissions);
  } catch (error) {
    console.error("Failed to get submissions by region:", error);
    return [];
  }
}

// Get top submitters
export async function getTopSubmitters(limit = 10) {
  try {
    await requireAdmin();

    const topUsers = await prisma.submission.groupBy({
      by: ["userId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = topUsers.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return topUsers.map((item, index) => {
      const user = userMap.get(item.userId);
      return {
        rank: index + 1,
        name: user?.name || user?.email?.split("@")[0] || "Unknown",
        email: user?.email || "",
        submissions: item._count.id,
      };
    });
  } catch (error) {
    console.error("Failed to get top submitters:", error);
    return [];
  }
}

// Get monthly comparison (this month vs last month)
export async function getMonthlyComparison() {
  try {
    await requireAdmin();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonth, lastMonth] = await Promise.all([
      prisma.submission.count({
        where: {
          createdAt: { gte: thisMonthStart },
        },
      }),
      prisma.submission.count({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
      }),
    ]);

    const change = lastMonth > 0 
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) 
      : thisMonth > 0 ? 100 : 0;

    return {
      thisMonth,
      lastMonth,
      change,
    };
  } catch (error) {
    console.error("Failed to get monthly comparison:", error);
    return { thisMonth: 0, lastMonth: 0, change: 0 };
  }
}
