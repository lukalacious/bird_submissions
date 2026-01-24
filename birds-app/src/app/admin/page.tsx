import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bird, MapPin, FileSpreadsheet } from "lucide-react";

async function getStats() {
  const [
    userCount,
    birdCount,
    regionCount,
    submissionCount,
    settings,
    recentSubmissions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.bird.count(),
    prisma.region.count(),
    prisma.submission.count(),
    prisma.settings.findUnique({ where: { id: "default" } }),
    prisma.submission.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        region: { select: { label: true } },
      },
    }),
  ]);

  const currentYear = settings?.currentYear || new Date().getFullYear();
  const yearSubmissions = await prisma.submission.count({
    where: { year: currentYear },
  });

  return {
    userCount,
    birdCount,
    regionCount,
    submissionCount,
    yearSubmissions,
    currentYear,
    recentSubmissions,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your Bird Submission Tracker</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-gray-500">registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Bird Species</CardTitle>
            <Bird className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.birdCount}</div>
            <p className="text-xs text-gray-500">across all regions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Regions</CardTitle>
            <MapPin className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.regionCount}</div>
            <p className="text-xs text-gray-500">available regions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stats.currentYear} Submissions
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.yearSubmissions}</div>
            <p className="text-xs text-gray-500">birds submitted this year</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>Latest bird submissions across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentSubmissions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{submission.birdName}</p>
                    <p className="text-sm text-gray-500">
                      by {submission.user.name || submission.user.email} • {submission.region.label}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
