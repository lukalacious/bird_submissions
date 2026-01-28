import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BirdSubmissionForm } from "@/components/bird-submission-form";
import { RegionSelector } from "@/components/region-selector";
import { getMonthlySettings } from "@/lib/settings-utils";
import { getUserJokerInfo } from "@/app/actions/joker-actions";
import type { ResetPeriod } from "@prisma/client";

interface SubmitPageProps {
  searchParams: Promise<{ region?: string }>;
}

async function getRegionData(regionName: string) {
  const region = await prisma.region.findUnique({
    where: { name: regionName },
    include: {
      birds: {
        orderBy: { alphabeticalName: "asc" },
      },
    },
  });
  return region;
}

async function getSubmittedBirds(
  userId: string,
  regionId: string,
  year: number,
  month: number,
  resetPeriod: ResetPeriod
): Promise<string[]> {
  const where: { userId: string; regionId: string; year?: number; month?: number } = {
    userId,
    regionId,
  };
  if (resetPeriod === "MONTHLY") {
    where.year = year;
    where.month = month;
  } else if (resetPeriod === "YEARLY") {
    where.year = year;
  }
  const submissions = await prisma.submission.findMany({
    where,
    select: { birdName: true },
  });
  return submissions.map((s) => s.birdName);
}

async function getSettings() {
  return prisma.settings.findUnique({ where: { id: "default" } });
}

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const session = await auth();
  const params = await searchParams;
  let regionName = params.region;

  // If no region specified, try to use user's default region
  if (!regionName) {
    const user = await prisma.user.findUnique({
      where: { id: session!.user.id! },
      select: {
        defaultRegion: {
          select: { name: true },
        },
      },
    });

    if (user?.defaultRegion?.name) {
      redirect(`/twitch?region=${user.defaultRegion.name}`);
    } else {
      // No default region - show region selector instead of redirecting
      const regions = await prisma.region.findMany({
        select: {
          id: true,
          name: true,
          label: true,
        },
        orderBy: { label: "asc" },
      });

      return <RegionSelector regions={regions} />;
    }
  }

  const [region, settings] = await Promise.all([
    getRegionData(regionName),
    getSettings(),
  ]);

  if (!region) {
    redirect("/dashboard");
  }

  const currentYear = settings?.currentYear ?? new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const resetPeriod = settings?.resetPeriod ?? "YEARLY";

  // Get monthly-specific settings (falls back to global if no monthly override)
  const monthlySettings = await getMonthlySettings(currentYear, currentMonth);
  const maxBirdsPerPeriod = monthlySettings.maxBirdsPerPeriod;

  const [submittedBirds, currentMonthCount, jokerInfo] = await Promise.all([
    getSubmittedBirds(
      session!.user.id!,
      region.id,
      currentYear,
      currentMonth,
      resetPeriod
    ),
    prisma.submission.count({
      where: {
        userId: session!.user.id!,
        regionId: region.id,
        year: currentYear,
        month: currentMonth,
      },
    }),
    getUserJokerInfo(session!.user.id!, currentYear, currentMonth),
  ]);

  const jokerData = jokerInfo || {
    totalJokers: 0,
    usedJokers: 0,
    availableJokers: 0,
    groupBreakdown: []
  };

  const maxBirds = Math.max(0, maxBirdsPerPeriod - currentMonthCount);

  // Mark birds as disabled if already submitted (per resetPeriod)
  const birdsWithStatus = region.birds.map((bird) => ({
    ...bird,
    isDisabled: submittedBirds.includes(bird.fullName),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <BirdSubmissionForm
        region={region}
        birds={birdsWithStatus}
        maxBirds={maxBirds}
        currentYear={currentYear}
        currentMonth={currentMonth}
        userId={session!.user.id!}
        availableJokers={jokerData.availableJokers}
        regionId={region.id}
      />
    </div>
  );
}
