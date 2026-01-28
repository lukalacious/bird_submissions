import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CommunityView } from "./community-view";
import { getCommunityFeed, getLeaderboard } from "@/app/actions/feed-actions";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; region?: string; user?: string; challenge?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const params = await searchParams;

  // Get current settings for default year
  const settings = await prisma.settings.findFirst();
  const currentYear = settings?.currentYear || new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Parse search params
  const year = params.year ? parseInt(params.year) : currentYear;
  const month = params.month ? parseInt(params.month) : currentMonth;
  const regionId = params.region || undefined;
  const userId = params.user || undefined;
  const challengeFilter = (params.challenge as "all" | "active" | "eliminated") || "all";
  const viewMode = (params.view as "birds" | "feed" | "leaderboard") || "birds";

  // Get all regions for filter
  const regions = await prisma.region.findMany({
    select: { id: true, label: true },
    orderBy: { label: "asc" },
  });

  // Get eliminated user IDs for the current year
  const eliminatedStatuses = await prisma.userChallengeStatus.findMany({
    where: { year, isEliminated: true },
    select: { userId: true },
  });
  const eliminatedUserIds = new Set(eliminatedStatuses.map((s) => s.userId));

  // Get all users who have submitted this year (for filter)
  const usersWithSubmissions = await prisma.submission.findMany({
    where: { year },
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

  const users = usersWithSubmissions.map((s) => ({
    id: s.user.id,
    name: s.user.username || s.user.name || "Anonymous",
    isEliminated: eliminatedUserIds.has(s.user.id),
  }));

  // Build where clause with challenge filter
  const where: {
    year: number;
    month: number;
    regionId?: string;
    userId?: string | { in: string[] } | { notIn: string[] };
  } = { year, month };

  if (regionId) where.regionId = regionId;

  // Apply challenge filter
  if (challengeFilter === "active") {
    // Only show submissions from non-eliminated users
    where.userId = userId
      ? userId
      : { notIn: Array.from(eliminatedUserIds) };
  } else if (challengeFilter === "eliminated") {
    // Only show submissions from eliminated users
    const eliminatedArray = Array.from(eliminatedUserIds);
    if (eliminatedArray.length > 0) {
      where.userId = userId
        ? (eliminatedUserIds.has(userId) ? userId : "no-match")
        : { in: eliminatedArray };
    } else {
      // No eliminated users, return empty
      where.userId = "no-match";
    }
  } else if (userId) {
    where.userId = userId;
  }

  // Get submissions
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
    },
    orderBy: { birdName: "asc" },
  });

  // Aggregate by bird name
  const birdMap = new Map<
    string,
    {
      birdName: string;
      count: number;
      users: { id: string; name: string | null; username: string | null; image: string | null }[];
    }
  >();

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

  const aggregatedSubmissions = Array.from(birdMap.values()).sort((a, b) => b.count - a.count);

  // Stats
  const stats = {
    totalSubmissions: submissions.length,
    uniqueBirds: birdMap.size,
    uniqueUsers: new Set(submissions.map((s) => s.userId)).size,
  };

  // Fetch activity feed and leaderboard data
  const [communityFeed, monthlyLeaderboard, allTimeLeaderboard] = await Promise.all([
    getCommunityFeed(50),
    getLeaderboard("month", challengeFilter),
    getLeaderboard("alltime", challengeFilter),
  ]);

  return (
    <CommunityView
      submissions={aggregatedSubmissions}
      stats={stats}
      regions={regions}
      users={users}
      currentYear={year}
      currentMonth={month}
      selectedRegion={regionId}
      selectedUser={userId}
      challengeFilter={challengeFilter}
      eliminatedUserIds={Array.from(eliminatedUserIds)}
      viewMode={viewMode}
      feedEntries={communityFeed}
      monthlyLeaderboard={monthlyLeaderboard}
      allTimeLeaderboard={allTimeLeaderboard}
    />
  );
}
