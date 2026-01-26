import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  getAnalyticsOverview,
  getSubmissionTrends,
  getSubmissionsByRegion,
  getTopSubmitters,
  getMonthlyComparison,
} from "@/app/actions/analytics-actions";

async function getRecentSubmissions() {
  return prisma.submission.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      region: { select: { label: true } },
    },
  });
}

function ErrorFallback({ error }: { error?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Analytics and overview of Twitch</p>
      </div>
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
            <p className="text-gray-600 mb-4 max-w-md">
              {error || "There was a problem loading the analytics data. This could be a temporary database connection issue."}
            </p>
            <Button asChild>
              <Link href="/admin">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminDashboard() {
  try {
    const [overview, trends, regionData, topSubmitters, monthlyComparison, recentSubmissions] =
      await Promise.all([
        getAnalyticsOverview(),
        getSubmissionTrends(),
        getSubmissionsByRegion(),
        getTopSubmitters(),
        getMonthlyComparison(),
        getRecentSubmissions(),
      ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Analytics and overview of Twitch</p>
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard
          overview={overview}
          trends={trends}
          regionData={regionData}
          topSubmitters={topSubmitters}
          monthlyComparison={monthlyComparison}
        />

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Latest bird submissions across all users</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
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
  } catch (e) {
    console.error("Failed to load admin dashboard data:", e);
    const error = e instanceof Error ? e.message : "Failed to load dashboard data";
    return <ErrorFallback error={error} />;
  }
}
