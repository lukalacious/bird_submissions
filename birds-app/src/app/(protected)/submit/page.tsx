import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BirdSubmissionForm } from "@/components/bird-submission-form";

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

async function getSubmittedBirds(userId: string, regionId: string, year: number) {
  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      regionId,
      year,
    },
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

  const currentYear = settings?.currentYear || new Date().getFullYear();
  const maxBirds = settings?.maxBirdsPerSubmission || 31;

  const submittedBirds = await getSubmittedBirds(
    session!.user.id!,
    region.id,
    currentYear
  );

  // Mark birds as disabled if already submitted
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
        userId={session!.user.id!}
      />
    </div>
  );
}
