import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BirdSubmissionForm } from "@/components/bird-submission-form";
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
  const regionName = params.region;

  if (!regionName) {
    redirect("/region");
  }

  const [region, settings] = await Promise.all([
    getRegionData(regionName),
    getSettings(),
  ]);

  if (!region) {
    redirect("/region");
  }

  const currentYear = settings?.currentYear ?? new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const maxBirdsPerPeriod = settings?.maxBirdsPerPeriod ?? 31;
  const resetPeriod = settings?.resetPeriod ?? "YEARLY";

  const [submittedBirds, currentMonthCount] = await Promise.all([
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
  ]);

  const maxBirds = Math.max(0, maxBirdsPerPeriod - currentMonthCount);

  // Mark birds as disabled if already submitted (per resetPeriod)
  const birdsWithStatus = region.birds.map((bird) => ({
    ...bird,
    isDisabled: submittedBirds.includes(bird.fullName),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <BirdSubmissionForm
        region={region}
        birds={birdsWithStatus}
        maxBirds={maxBirds}
        currentYear={currentYear}
        currentMonth={currentMonth}
        userId={session!.user.id!}
      />
    </div>
  );
}
