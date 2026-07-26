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

// Returns submitted bird names in THIS region plus the scientific names of
// every species submitted in ANY region (same species can't be twitched twice
// across regions — e.g. African Fish Eagle in SA and East Africa).
async function getSubmittedBirds(
  userId: string,
  regionId: string,
  year: number,
  month: number,
  resetPeriod: ResetPeriod
): Promise<{ birdNames: string[]; scientificNames: Set<string> }> {
  const where: { userId: string; year?: number; month?: number } = { userId };
  if (resetPeriod === "MONTHLY") {
    where.year = year;
    where.month = month;
  } else if (resetPeriod === "YEARLY") {
    where.year = year;
  }
  const submissions = await prisma.submission.findMany({
    where,
    select: { birdName: true, regionId: true, isCustomBird: true },
  });

  const birdNames = submissions
    .filter((s) => s.regionId === regionId)
    .map((s) => s.birdName);

  const realSubmissions = submissions.filter((s) => !s.isCustomBird);
  const scientificNames = new Set<string>();
  if (realSubmissions.length > 0) {
    const birds = await prisma.bird.findMany({
      where: {
        OR: realSubmissions.map((s) => ({
          regionId: s.regionId,
          fullName: s.birdName,
        })),
      },
      select: { scientificName: true },
    });
    for (const b of birds) scientificNames.add(b.scientificName);
  }

  return { birdNames, scientificNames };
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

  const [region, settings, allRegions] = await Promise.all([
    getRegionData(regionName),
    getSettings(),
    prisma.region.findMany({
      select: { id: true, name: true, label: true },
      orderBy: { label: "asc" },
    }),
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
    // Cross-region count: monthly cap is shared across all regions
    prisma.submission.count({
      where: {
        userId: session!.user.id!,
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
    availableJokersForUse: 0,
    groupBreakdown: []
  };

  const maxBirds = Math.max(0, maxBirdsPerPeriod - currentMonthCount);

  // Mark birds as disabled if already submitted (per resetPeriod) —
  // by name in this region, or by species (scientificName) in any region
  const birdsWithStatus = region.birds.map((bird) => ({
    ...bird,
    isDisabled:
      submittedBirds.birdNames.includes(bird.fullName) ||
      submittedBirds.scientificNames.has(bird.scientificName),
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
        availableJokers={jokerData.availableJokersForUse}
        regionId={region.id}
        allRegions={allRegions}
      />
    </div>
  );
}
