import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CommunityView } from "./community-view";
import { getCommunityFeed, getLeaderboard } from "@/app/actions/feed-actions";
import { getCommunityJokerActivity } from "@/app/actions/joker-actions";

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
  const challengeFilter = (params.challenge as "all" | "active" | "eliminated") || "active";
  const viewMode = (params.view as "birds" | "feed" | "leaderboard" | "jokers") || "birds";

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

  // Get all bird names and their group info
  const birdNames = [...new Set(submissions.map((s) => s.birdName))];
  const birdsWithGroups = await prisma.bird.findMany({
    where: { fullName: { in: birdNames } },
    select: { fullName: true, groupName: true },
  });
  const birdGroupMap = new Map(birdsWithGroups.map((b) => [b.fullName, b.groupName]));

  // Calculate which users have completed which groups (3+ birds from same group)
  // First, get all submissions for this period to calculate group completions per user
  const allSubmissionsForPeriod = await prisma.submission.findMany({
    where: { year, month },
    select: { userId: true, birdName: true },
  });

  // Map user -> group -> bird count
  const userGroupCounts = new Map<string, Map<string, number>>();
  for (const sub of allSubmissionsForPeriod) {
    const group = birdGroupMap.get(sub.birdName);
    if (!group) continue;

    if (!userGroupCounts.has(sub.userId)) {
      userGroupCounts.set(sub.userId, new Map());
    }
    const groupCounts = userGroupCounts.get(sub.userId)!;
    groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
  }

  // For each group, count how many users completed it (3+ birds)
  const groupCompletionCount = new Map<string, number>();
  for (const [, groupCounts] of userGroupCounts) {
    for (const [group, count] of groupCounts) {
      if (count >= 3) {
        groupCompletionCount.set(group, (groupCompletionCount.get(group) || 0) + 1);
      }
    }
  }

  // Aggregate by bird name
  const birdMap = new Map<
    string,
    {
      birdName: string;
      count: number;
      users: { id: string; name: string | null; username: string | null; image: string | null }[];
      groupName: string | null;
      jokerContribution: number;
    }
  >();

  for (const sub of submissions) {
    const existing = birdMap.get(sub.birdName);
    const groupName = birdGroupMap.get(sub.birdName) || null;
    const jokerContribution = groupName ? (groupCompletionCount.get(groupName) || 0) : 0;

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
        groupName,
        jokerContribution,
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

  // Fetch activity feed, leaderboard, and joker data
  const [communityFeed, monthlyLeaderboard, allTimeLeaderboard, jokerActivity] = await Promise.all([
    getCommunityFeed(50),
    getLeaderboard("month", challengeFilter),
    getLeaderboard("alltime", challengeFilter),
    getCommunityJokerActivity(year),
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
      jokerActivity={jokerActivity}
    />
  );
}
