import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";

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

async function getUserSubmissionCounts(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const currentYear = settings?.currentYear || new Date().getFullYear();

  const counts = await prisma.submission.groupBy({
    by: ["regionId"],
    where: {
      userId,
      year: currentYear,
    },
    _count: {
      birdName: true,
    },
  });

  return Object.fromEntries(counts.map((c) => [c.regionId, c._count.birdName]));
}

export default async function RegionSelectionPage() {
  const session = await auth();
  const [regions, submissionCounts] = await Promise.all([
    getRegions(),
    getUserSubmissionCounts(session!.user.id!),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Region</h1>
        <p className="text-gray-600">
          Choose a region to start tracking your bird submissions for this year
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {regions.map((region) => {
          const submittedCount = submissionCounts[region.id] || 0;
          const totalBirds = region._count.birds;
          const percentComplete = Math.round((submittedCount / totalBirds) * 100);

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
                        <CardDescription>{totalBirds} bird species</CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Your progress this year</span>
                      <span className="font-medium text-purple-600">
                        {submittedCount} / {totalBirds}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentComplete}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{percentComplete}% complete</p>
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
    </div>
  );
}
