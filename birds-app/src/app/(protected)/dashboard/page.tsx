import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Bird, Calendar, Target } from "lucide-react";
import { getMonthlySettings } from "@/lib/settings-utils";
import { getUserJokerInfo, getJokerHistory } from "@/app/actions/joker-actions";
import { getUserEliminationStatus } from "@/app/actions/elimination-actions";
import { JokerCard } from "@/components/dashboard/joker-card";
import { GameRules } from "@/components/dashboard/game-rules";
import { EliminationBanner } from "@/components/gamification/elimination-banner";

async function getUserSubmissionCounts(userId: string): Promise<{
  thisMonthCount: number;
  totalCount: number;
  maxBirdsPerPeriod: number;
  eliminationThreshold: number;
}> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const currentYear = settings?.currentYear ?? new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Get monthly-specific settings (falls back to global if no monthly override)
  const monthlySettings = await getMonthlySettings(currentYear, currentMonth);
  const maxBirdsPerPeriod = monthlySettings.maxBirdsPerPeriod;
  const eliminationThreshold = monthlySettings.eliminationThreshold;

  const [thisMonthCount, totalCount] = await Promise.all([
    prisma.submission.count({
      where: {
        userId,
        year: currentYear,
        month: currentMonth,
      },
    }),
    prisma.submission.count({
      where: { userId },
    }),
  ]);

  return { thisMonthCount, totalCount, maxBirdsPerPeriod, eliminationThreshold };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const userName = session!.user.name?.split(" ")[0] || "there";

  const { thisMonthCount, totalCount, maxBirdsPerPeriod, eliminationThreshold } = await getUserSubmissionCounts(userId);

  // Fetch joker data and elimination status
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const currentYear = settings?.currentYear ?? new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [jokerInfo, jokerHistory, eliminationStatus] = await Promise.all([
    getUserJokerInfo(userId, currentYear, currentMonth),
    getJokerHistory(userId, currentYear),
    getUserEliminationStatus(userId, currentYear)
  ]);

  const jokerData = jokerInfo || {
    totalJokers: 0,
    usedJokers: 0,
    availableJokers: 0,
    groupBreakdown: []
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-6">
      {/* Elimination Status Banner */}
      <EliminationBanner
        isEliminated={eliminationStatus?.isEliminated ?? false}
        eliminationMonth={eliminationStatus?.eliminationMonth ?? null}
        jokersAvailable={eliminationStatus?.jokersAvailable ?? 0}
        currentSubmissions={thisMonthCount}
        threshold={eliminationThreshold}
      />

      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground">
            {thisMonthCount > 0
              ? `You've logged ${thisMonthCount} bird${thisMonthCount !== 1 ? "s" : ""} this month`
              : "Ready to log some birds?"}
          </p>
        </div>
        <Link
          href="/twitch"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.96] active:shadow-inner"
        >
          <Bird className="h-5 w-5" />
          <span className="hidden sm:inline">Twitch Birds</span>
        </Link>
      </div>

      {/* Compact stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center gap-1">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-primary">{thisMonthCount}</p>
              <p className="text-sm text-muted-foreground leading-tight">This month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center gap-1">
              <div className="p-1.5 bg-secondary rounded-md">
                <Bird className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground leading-tight">Total birds</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center gap-1">
              <div className="p-1.5 bg-secondary rounded-md">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{maxBirdsPerPeriod}</p>
              <p className="text-sm text-muted-foreground leading-tight">Monthly goal</p>
            </div>
          </CardContent>
        </Card>

        <JokerCard
          totalJokers={jokerData.totalJokers}
          usedJokers={jokerData.usedJokers}
          availableJokers={jokerData.availableJokers}
          history={jokerHistory}
          year={currentYear}
        />
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Monthly Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{thisMonthCount}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-lg font-semibold text-muted-foreground">{maxBirdsPerPeriod}</span>
              <span className="text-sm text-muted-foreground ml-1">
                ({Math.min(100, Math.round((thisMonthCount / maxBirdsPerPeriod) * 100))}%)
              </span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all shadow-sm"
              style={{ width: `${Math.min(100, (thisMonthCount / maxBirdsPerPeriod) * 100)}%` }}
            />
          </div>
          {thisMonthCount >= maxBirdsPerPeriod && (
            <p className="text-sm text-primary mt-3 font-semibold flex items-center gap-1">
              <span className="text-base">🎉</span> Monthly goal reached!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Game Rules */}
      <GameRules rules={settings?.rules ?? null} />
    </div>
  );
}
