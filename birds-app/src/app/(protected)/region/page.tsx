import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ChevronRight, Calendar, Clock, Award, Users } from "lucide-react";
import { OpenMonthBirds } from "@/components/open-month-birds";
import { getCommunityFeed, getLeaderboard } from "@/app/actions/feed-actions";
import { getCurrentUserGamification } from "@/app/actions/gamification-actions";
import { GamificationPanel } from "./gamification-panel";
import { CommunitySection } from "./community-section";

async function getRegions() {
  return prisma.region.findMany({
    orderBy: { label: "asc" },
    include: {
      _count: {
        select: { birds: true },
      },
    },
  });
}

async function getUserSubmissionCounts(userId: string): Promise<{
  counts: Record<string, number>;
  maxBirdsPerPeriod: number;
  currentYear: number;
  currentMonth: number;
}> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const currentYear = settings?.currentYear ?? new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const maxBirdsPerPeriod = settings?.maxBirdsPerPeriod ?? 31;

  const counts = await prisma.submission.groupBy({
    by: ["regionId"],
    where: {
      userId,
      year: currentYear,
      month: currentMonth,
    },
    _count: {
      birdName: true,
    },
  });

  const countMap = Object.fromEntries(counts.map((c) => [c.regionId, c._count.birdName]));
  return { counts: countMap, maxBirdsPerPeriod, currentYear, currentMonth };
}

async function getUserSubmissions(userId: string) {
  return prisma.submission.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }, { birdName: "asc" }],
    select: {
      birdName: true,
      year: true,
      month: true,
      region: { select: { label: true } },
    },
  });
}

function monthYearLabel(year: number, month: number): string {
  const name = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  return `${name} ${year}`;
}

export default async function RegionSelectionPage() {
  const session = await auth();
  const userId = session!.user.id!;

  // Fetch all data in parallel
  const [
    regions,
    { counts: submissionCounts, maxBirdsPerPeriod, currentYear, currentMonth },
    submissions,
    gamification,
    communityFeed,
    monthlyLeaderboard,
    allTimeLeaderboard,
  ] = await Promise.all([
    getRegions(),
    getUserSubmissionCounts(userId),
    getUserSubmissions(userId),
    getCurrentUserGamification(),
    getCommunityFeed(15),
    getLeaderboard("month"),
    getLeaderboard("alltime"),
  ]);

  // Group submissions by (year, month)
  const byMonth = new Map<string, { year: number; month: number; birds: { name: string; region: string }[] }>();
  for (const s of submissions) {
    const key = `${s.year}-${s.month}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, { year: s.year, month: s.month, birds: [] });
    }
    byMonth.get(key)!.birds.push({ name: s.birdName, region: s.region.label });
  }

  const groups = Array.from(byMonth.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const currentMonthGroup = groups.find((g) => g.year === currentYear && g.month === currentMonth);
  const pastMonthGroups = groups.filter((g) => !(g.year === currentYear && g.month === currentMonth));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Region</h1>
        <p className="text-gray-600">
          Choose a region to start tracking your bird submissions for this year
        </p>
      </div>

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {regions.map((region) => {
          const submittedCount = submissionCounts[region.id] || 0;
          const percentMonth = Math.round((submittedCount / maxBirdsPerPeriod) * 100);

          return (
            <Link key={region.id} href={`/submit?region=${region.name}`}>
              <Card className="h-full hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MapPin className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{region.label}</CardTitle>
                        <CardDescription>{region._count.birds} bird species</CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Your progress this month</span>
                      <span className="font-medium text-purple-600">
                        {submittedCount} / {maxBirdsPerPeriod}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentMonth}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {submittedCount} of {maxBirdsPerPeriod} this month
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {regions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No regions available</h3>
            <p className="text-gray-500">
              Contact an administrator to add bird regions to the system.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Your Progress Section */}
      {gamification && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Award className="h-6 w-6 text-purple-600" />
            Your Progress
          </h2>
          <GamificationPanel gamification={gamification} />
        </div>
      )}

      {/* Community Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-600" />
          Community
        </h2>
        <CommunitySection
          feedEntries={communityFeed}
          monthlyLeaderboard={monthlyLeaderboard}
          allTimeLeaderboard={allTimeLeaderboard}
        />
      </div>

      {/* Submissions History */}
      {(currentMonthGroup || pastMonthGroups.length > 0) && (
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Submissions</h2>

          {/* Current Month (Open) */}
          {currentMonthGroup && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">
                      {monthYearLabel(currentMonthGroup.year, currentMonthGroup.month)}
                    </CardTitle>
                    <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      Open
                    </span>
                  </div>
                  <span className="text-sm font-medium text-purple-600">
                    {currentMonthGroup.birds.length} / {maxBirdsPerPeriod}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <OpenMonthBirds
                  birds={currentMonthGroup.birds}
                  userId={userId}
                  year={currentYear}
                  month={currentMonth}
                />
              </CardContent>
            </Card>
          )}

          {/* Past Months (Closed) */}
          {pastMonthGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                Previous Months
              </h3>
              {pastMonthGroups.map((group) => (
                <Card key={`${group.year}-${group.month}`} className="bg-gray-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-medium text-gray-700">
                          {monthYearLabel(group.year, group.month)}
                        </CardTitle>
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          Closed
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {group.birds.length} bird{group.birds.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-purple-600 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                        <span>Show bird list</span>
                        <span className="group-open:rotate-180 transition inline-block">▾</span>
                      </summary>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {group.birds.map((bird, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-700"
                          >
                            {bird.name}
                            <span className="text-gray-400 text-xs">({bird.region})</span>
                          </span>
                        ))}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
