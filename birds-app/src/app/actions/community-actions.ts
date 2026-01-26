"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface CommunitySubmission {
  birdName: string;
  count: number;
  users: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  }[];
}

interface MonthlyStats {
  totalSubmissions: number;
  uniqueBirds: number;
  uniqueUsers: number;
}

export async function getCommunitySubmissions(
  year: number,
  month: number,
  regionId?: string,
  userId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { submissions: [], stats: null, users: [], regions: [] };
  }

  // Build where clause
  const where: {
    year: number;
    month: number;
    regionId?: string;
    userId?: string;
  } = { year, month };

  if (regionId) {
    where.regionId = regionId;
  }
  if (userId) {
    where.userId = userId;
  }

  // Get all submissions for the month
  const submissions = await prisma.submission.findMany({
    where,
    include: {
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
          id: true,
          label: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate by bird name
  const birdMap = new Map<string, CommunitySubmission>();
  for (const sub of submissions) {
    const existing = birdMap.get(sub.birdName);
    if (existing) {
      existing.count++;
      if (!existing.users.find((u) => u.id === sub.user.id)) {
        existing.users.push(sub.user);
      }
    } else {
      birdMap.set(sub.birdName, {
        birdName: sub.birdName,
        count: 1,
        users: [sub.user],
      });
    }
  }

  // Sort by count descending
  const aggregatedSubmissions = Array.from(birdMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // Calculate stats
  const stats: MonthlyStats = {
    totalSubmissions: submissions.length,
    uniqueBirds: birdMap.size,
    uniqueUsers: new Set(submissions.map((s) => s.userId)).size,
  };

  // Get all users who submitted this month (for filter dropdown)
  const allMonthSubmissions = await prisma.submission.findMany({
    where: { year, month },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
    distinct: ["userId"],
  });

  const users = allMonthSubmissions.map((s) => ({
    id: s.user.id,
    name: s.user.username || s.user.name || "Anonymous",
  }));

  // Get all regions (for filter dropdown)
  const regions = await prisma.region.findMany({
    select: { id: true, label: true },
    orderBy: { label: "asc" },
  });

  return {
    submissions: aggregatedSubmissions,
    stats,
    users,
    regions,
  };
}

export async function getRecentActivity(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const recentSubmissions = await prisma.submission.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
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

  return recentSubmissions.map((sub) => ({
    id: sub.id,
    birdName: sub.birdName,
    region: sub.region.label,
    user: {
      id: sub.user.id,
      name: sub.user.username || sub.user.name || "Anonymous",
      image: sub.user.image,
    },
    createdAt: sub.createdAt,
  }));
}
