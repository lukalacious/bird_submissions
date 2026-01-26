import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CommunityView } from "./community-view";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; region?: string; user?: string }>;
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

  // Get all regions for filter
  const regions = await prisma.region.findMany({
    select: { id: true, label: true },
    orderBy: { label: "asc" },
  });

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
  }));

  // Build where clause
  const where: {
    year: number;
    month: number;
    regionId?: string;
    userId?: string;
  } = { year, month };

  if (regionId) where.regionId = regionId;
  if (userId) where.userId = userId;

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
    />
  );
}
