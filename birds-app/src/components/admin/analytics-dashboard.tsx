"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Bird, MapPin, TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalSubmissions: number;
  uniqueSpecies: number;
  totalRegions: number;
}

interface SubmissionTrend {
  date: string;
  submissions: number;
}

interface RegionData {
  region: string;
  submissions: number;
}

interface TopSubmitter {
  rank: number;
  name: string;
  email: string;
  submissions: number;
}

interface MonthlyComparison {
  thisMonth: number;
  lastMonth: number;
  change: number;
}

interface AnalyticsDashboardProps {
  overview: AnalyticsOverview | null;
  trends: SubmissionTrend[];
  regionData: RegionData[];
  topSubmitters: TopSubmitter[];
  monthlyComparison: MonthlyComparison;
}

export function AnalyticsDashboard({
  overview,
  trends,
  regionData,
  topSubmitters,
  monthlyComparison,
}: AnalyticsDashboardProps) {
  if (!overview) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Unable to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  const maxSubmissions = Math.max(...regionData.map((r) => r.submissions), 1);
  const maxTrend = Math.max(...trends.map((t) => t.submissions), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-3xl font-bold">{overview.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {overview.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-emerald-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Submissions</p>
                <p className="text-3xl font-bold">{overview.totalSubmissions.toLocaleString()}</p>
              </div>
              <Bird className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-center">
              {monthlyComparison.change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className="text-sm">
                <span
                  className={
                    monthlyComparison.change >= 0
                      ? "text-emerald-500"
                      : "text-red-500"
                  }
                >
                  {monthlyComparison.change >= 0 ? "+" : ""}
                  {monthlyComparison.change}%
                </span>{" "}
                vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Unique Species</p>
                <p className="text-3xl font-bold">{overview.uniqueSpecies.toLocaleString()}</p>
              </div>
              <Bird className="h-8 w-8 text-amber-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Twitched this year
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-violet-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Regions</p>
                <p className="text-3xl font-bold">{overview.totalRegions}</p>
              </div>
              <MapPin className="h-8 w-8 text-violet-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Active regions</p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Trends Chart - Simple Bar Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions Over Time</CardTitle>
          <p className="text-sm text-gray-500">Daily submissions for the last 30 days</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="h-48 flex items-end gap-1 min-w-[280px]">
            {trends.map((item, index) => (
              <div
                key={index}
                className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                style={{ height: `${(item.submissions / maxTrend) * 100}%`, minHeight: item.submissions > 0 ? '4px' : '0' }}
                title={`${item.date}: ${item.submissions} submissions`}
              />
            ))}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{trends[0]?.date || ''}</span>
            <span>{trends[trends.length - 1]?.date || ''}</span>
          </div>
        </CardContent>
      </Card>

      {/* Two column layout for region data and top submitters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions by Region */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions by Region</CardTitle>
            <p className="text-sm text-gray-500">Total submissions per region</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionData.map((item) => (
                <div key={item.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.region}</span>
                    <span>{item.submissions.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(item.submissions / maxSubmissions) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {regionData.length === 0 && (
                <p className="text-gray-500">No submissions yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Twitchers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Twitchers</CardTitle>
            <p className="text-sm text-gray-500">Users with most twitches</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[260px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Rank</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {topSubmitters.map((user) => (
                  <tr key={user.email} className="border-b last:border-0">
                    <td className="py-3">
                      <Badge
                        variant={user.rank <= 3 ? "default" : "secondary"}
                        className={
                          user.rank === 1
                            ? "bg-amber-500"
                            : user.rank === 2
                            ? "bg-gray-400"
                            : user.rank === 3
                            ? "bg-orange-400"
                            : ""
                        }
                      >
                        #{user.rank}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="py-3 text-right font-semibold">{user.submissions}</td>
                  </tr>
                ))}
                {topSubmitters.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">
                      No submissions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-3xl font-bold">{monthlyComparison.thisMonth.toLocaleString()}</p>
              <p className="text-sm text-gray-500">submissions</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Month</p>
              <p className="text-3xl font-bold">{monthlyComparison.lastMonth.toLocaleString()}</p>
              <p className="text-sm text-gray-500">submissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
