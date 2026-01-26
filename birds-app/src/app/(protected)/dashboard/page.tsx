import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ChevronRight, Award, Users, Clock, FileText, Bird, Calendar, Sparkles } from "lucide-react";
import { OpenMonthBirds } from "@/components/open-month-birds";
import { getCommunityFeed } from "@/app/actions/feed-actions";
import { getCurrentUserGamification } from "@/app/actions/gamification-actions";
import { GamificationPanel } from "../region/gamification-panel";
import { ActivityFeed } from "@/components/community/activity-feed";
import { getMonthlySettings } from "@/lib/settings-utils";

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

  // Get monthly-specific settings (falls back to global if no monthly override)
  const monthlySettings = await getMonthlySettings(currentYear, currentMonth);
  const maxBirdsPerPeriod = monthlySettings.maxBirdsPerPeriod;

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
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      birdName: true,
      year: true,
      month: true,
      createdAt: true,
      region: { select: { label: true } },
    },
    take: 50, // Recent submissions for dashboard
  });
}

function monthYearLabel(year: number, month: number): string {
  const name = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  return `${name} ${year}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("default", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const userName = session!.user.name?.split(" ")[0] || "there";

  const [
    regions,
    { counts: submissionCounts, maxBirdsPerPeriod, currentYear, currentMonth },
    submissions,
    gamification,
    communityFeed,
  ] = await Promise.all([
    getRegions(),
    getUserSubmissionCounts(userId),
    getUserSubmissions(userId),
    getCurrentUserGamification(),
    getCommunityFeed(5),
  ]);

  // Group submissions by (year, month) for the current month display
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

  // Get total submission count for stats
  const totalSubmissions = submissions.length;
  const thisMonthCount = currentMonthGroup?.birds.length || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8">
      {/* Personalized welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-display text-2xl md:text-3xl text-foreground mb-1">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground">
            {thisMonthCount > 0
              ? `You've logged ${thisMonthCount} bird${thisMonthCount !== 1 ? "s" : ""} this month`
              : "Ready to log some birds?"}
          </p>
        </div>
        <Link
          href="/submit"
          className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.96] active:shadow-inner"
        >
          <Bird className="h-5 w-5" />
          Submit Birds
        </Link>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{thisMonthCount}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <Bird className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">Total birds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{regions.length}</p>
                <p className="text-xs text-muted-foreground">Regions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{maxBirdsPerPeriod - thisMonthCount}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gamification */}
      {gamification && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Your Progress
          </h2>
          <GamificationPanel gamification={gamification} />
        </section>
      )}

      {/* Submit birds - Region cards */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Submit birds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regions.map((region) => {
            const submittedCount = submissionCounts[region.id] || 0;
            const percentMonth = Math.round((submittedCount / maxBirdsPerPeriod) * 100);
            return (
              <Link key={region.id} href={`/submit?region=${region.name}`}>
                <Card className="h-full hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-lg">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base md:text-lg">{region.label}</CardTitle>
                          <CardDescription className="text-xs">{region._count.birds} species</CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground text-xs">This month</span>
                        <span className="font-medium text-primary text-sm">
                          {submittedCount}/{maxBirdsPerPeriod}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${percentMonth}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Submissions - Minimal card format with Species + Date */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Your Recent Submissions
          </h2>
          <Link
            href="/submissions"
            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {submissions.length > 0 ? (
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {submissions.slice(0, 12).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <span className="font-medium text-sm text-foreground truncate pr-2">
                      {submission.birdName}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(submission.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
              {submissions.length > 12 && (
                <Link
                  href="/submissions"
                  className="block text-center text-sm text-primary hover:text-primary/80 mt-3 py-2 border-t border-border"
                >
                  View all {submissions.length} submissions
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Bird className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No submissions yet</p>
              <Link href="/submit" className="text-primary hover:underline text-sm mt-2 inline-block">
                Submit your first bird
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Community Activity
          </h2>
          <Link
            href="/activity"
            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-4">
            <ActivityFeed entries={communityFeed} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
