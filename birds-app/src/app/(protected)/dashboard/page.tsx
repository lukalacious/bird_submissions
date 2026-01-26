import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Bird, Calendar, Sparkles, Target } from "lucide-react";
import { getMonthlySettings } from "@/lib/settings-utils";

async function getUserSubmissionCounts(userId: string): Promise<{
  thisMonthCount: number;
  totalCount: number;
  maxBirdsPerPeriod: number;
}> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const currentYear = settings?.currentYear ?? new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Get monthly-specific settings (falls back to global if no monthly override)
  const monthlySettings = await getMonthlySettings(currentYear, currentMonth);
  const maxBirdsPerPeriod = monthlySettings.maxBirdsPerPeriod;

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

  return { thisMonthCount, totalCount, maxBirdsPerPeriod };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const userName = session!.user.name?.split(" ")[0] || "there";

  const { thisMonthCount, totalCount, maxBirdsPerPeriod } = await getUserSubmissionCounts(userId);
  const remaining = Math.max(0, maxBirdsPerPeriod - thisMonthCount);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-6">
      {/* Welcome header */}
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
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.96] active:shadow-inner"
        >
          <Bird className="h-5 w-5" />
          <span className="hidden sm:inline">Submit Birds</span>
        </Link>
      </div>

      {/* Compact stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{thisMonthCount}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary rounded-md">
                <Bird className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Total birds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary rounded-md">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{maxBirdsPerPeriod}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Monthly goal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary rounded-md">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{remaining}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Monthly Progress</span>
            <span className="font-medium text-primary">
              {thisMonthCount} / {maxBirdsPerPeriod}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (thisMonthCount / maxBirdsPerPeriod) * 100)}%` }}
            />
          </div>
          {thisMonthCount >= maxBirdsPerPeriod && (
            <p className="text-sm text-primary mt-2 font-medium">
              🎉 Monthly goal reached!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
