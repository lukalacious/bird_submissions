import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";

async function getRegions() {
  return prisma.region.findMany({
    orderBy: { label: "asc" },
  });
}

function monthYearLabel(year: number, month: number): string {
  const name = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  return `${name} ${year}`;
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const regionName = params.region;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [regions, settings] = await Promise.all([
    getRegions(),
    prisma.settings.findUnique({ where: { id: "default" } }),
  ]);
  const maxBirdsPerPeriod = settings?.maxBirdsPerPeriod ?? 31;

  // No region: show region cards
  if (!regionName) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Submissions</h1>
          <p className="text-gray-600">
            Choose a region to view your submissions by month
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {regions.map((region) => (
            <Link
              key={region.id}
              href={`/submissions?region=${encodeURIComponent(region.name)}`}
            >
              <Card className="h-full hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MapPin className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{region.label}</CardTitle>
                        <CardDescription>View submissions by month</CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {regions.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No regions available</h3>
              <p className="text-gray-500">Contact an administrator to add regions.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // With region: fetch submissions and show by month
  const region = await prisma.region.findUnique({ where: { name: regionName } });
  if (!region) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Region not found.</p>
        <Link href="/submissions" className="text-purple-600 hover:underline mt-2 inline-block py-2 min-h-[44px]">
          ← Back to My Submissions
        </Link>
      </div>
    );
  }

  const submissions = await prisma.submission.findMany({
    where: { userId: session!.user.id!, regionId: region.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { year: true, month: true, birdName: true },
  });

  // Group by (year, month)
  const byMonth = new Map<string, { year: number; month: number; birds: string[] }>();
  for (const s of submissions) {
    const key = `${s.year}-${s.month}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, { year: s.year, month: s.month, birds: [] });
    }
    byMonth.get(key)!.birds.push(s.birdName);
  }
  const groups = Array.from(byMonth.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-gray-600">{region.label}</p>
        </div>
        <Link
          href="/submissions"
          className="text-purple-600 hover:underline text-sm flex items-center gap-1 py-2 min-h-[44px]"
        >
          ← Change region
        </Link>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-600">No submissions yet for {region.label}.</p>
            <Link
              href={`/submit?region=${encodeURIComponent(region.name)}`}
              className="text-purple-600 hover:underline mt-2 inline-block py-2 min-h-[44px]"
            >
              Submit birds →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
        {groups.map((g) => {
          const label = monthYearLabel(g.year, g.month);
          const isThisMonth = g.year === currentYear && g.month === currentMonth;

          return (
            <Card key={`${g.year}-${g.month}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>
                    {label}
                    {isThisMonth && (
                      <span className="ml-2 text-sm font-normal text-purple-600">
                        (this month)
                      </span>
                    )}
                  </span>
                  <span className="text-base font-medium text-gray-600">
                    {isThisMonth
                      ? `${g.birds.length} / ${maxBirdsPerPeriod}`
                      : `${g.birds.length} bird${g.birds.length !== 1 ? "s" : ""}`}
                  </span>
                </CardTitle>
                {isThisMonth && g.birds.length > 0 && (
                  <CardDescription>In progress</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {g.birds.length > 0 ? (
                  isThisMonth ? (
                    <ul className="flex flex-wrap gap-2">
                      {g.birds.sort((a, b) => a.localeCompare(b)).map((b) => (
                        <li
                          key={b}
                          className="rounded-full bg-purple-100 px-2.5 py-0.5 text-sm text-purple-800"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-purple-600 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                        <span>Show bird list</span>
                        <span className="group-open:rotate-180 transition inline-block">▾</span>
                      </summary>
                      <ul className="flex flex-wrap gap-2 mt-2">
                        {g.birds.sort((a, b) => a.localeCompare(b)).map((b) => (
                          <li
                            key={b}
                            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-700"
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )
                ) : (
                  <p className="text-sm text-gray-500">No birds submitted</p>
                )}
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}
