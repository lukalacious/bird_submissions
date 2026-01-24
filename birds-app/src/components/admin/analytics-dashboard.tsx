"use client";

import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  AreaChart,
  BarChart,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  ProgressBar,
} from "@tremor/react";
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
        <Text>Unable to load analytics data</Text>
      </Card>
    );
  }

  const maxSubmissions = Math.max(...regionData.map((r) => r.submissions), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Total Users</Text>
              <Metric>{overview.totalUsers}</Metric>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </Flex>
          <Text className="mt-2 text-sm text-gray-500">
            {overview.activeUsers} active
          </Text>
        </Card>

        <Card decoration="top" decorationColor="emerald">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Total Submissions</Text>
              <Metric>{overview.totalSubmissions.toLocaleString()}</Metric>
            </div>
            <Bird className="h-8 w-8 text-emerald-500" />
          </Flex>
          <Flex className="mt-2" justifyContent="start" alignItems="center">
            {monthlyComparison.change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <Text className="text-sm">
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
            </Text>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="amber">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Unique Species</Text>
              <Metric>{overview.uniqueSpecies.toLocaleString()}</Metric>
            </div>
            <Bird className="h-8 w-8 text-amber-500" />
          </Flex>
          <Text className="mt-2 text-sm text-gray-500">
            Submitted this year
          </Text>
        </Card>

        <Card decoration="top" decorationColor="violet">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Regions</Text>
              <Metric>{overview.totalRegions}</Metric>
            </div>
            <MapPin className="h-8 w-8 text-violet-500" />
          </Flex>
          <Text className="mt-2 text-sm text-gray-500">Active regions</Text>
        </Card>
      </Grid>

      {/* Submission Trends Chart */}
      <Card>
        <Title>Submissions Over Time</Title>
        <Text>Daily submissions for the last 30 days</Text>
        <AreaChart
          className="mt-4 h-72"
          data={trends}
          index="date"
          categories={["submissions"]}
          colors={["blue"]}
          valueFormatter={(value) => value.toString()}
          showLegend={false}
          showAnimation={true}
        />
      </Card>

      {/* Two column layout for region data and top submitters */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Submissions by Region */}
        <Card>
          <Title>Submissions by Region</Title>
          <Text>Total submissions per region</Text>
          <div className="mt-4 space-y-4">
            {regionData.map((item) => (
              <div key={item.region}>
                <Flex>
                  <Text>{item.region}</Text>
                  <Text>{item.submissions.toLocaleString()}</Text>
                </Flex>
                <ProgressBar
                  value={(item.submissions / maxSubmissions) * 100}
                  color="blue"
                  className="mt-1"
                />
              </div>
            ))}
            {regionData.length === 0 && (
              <Text className="text-gray-500">No submissions yet</Text>
            )}
          </div>
        </Card>

        {/* Top Submitters */}
        <Card>
          <Title>Top Submitters</Title>
          <Text>Users with most submissions</Text>
          <Table className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Rank</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Submissions
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topSubmitters.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>
                    <Badge
                      color={
                        user.rank === 1
                          ? "amber"
                          : user.rank === 2
                          ? "gray"
                          : user.rank === 3
                          ? "orange"
                          : "blue"
                      }
                    >
                      #{user.rank}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text className="font-medium">{user.name}</Text>
                    <Text className="text-xs text-gray-500">{user.email}</Text>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="font-semibold">{user.submissions}</Text>
                  </TableCell>
                </TableRow>
              ))}
              {topSubmitters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Text className="text-gray-500 text-center">
                      No submissions yet
                    </Text>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </Grid>

      {/* Monthly Stats */}
      <Card>
        <Title>Monthly Overview</Title>
        <Grid numItemsSm={2} className="gap-6 mt-4">
          <div>
            <Text>This Month</Text>
            <Metric>{monthlyComparison.thisMonth.toLocaleString()}</Metric>
            <Text className="text-sm text-gray-500">submissions</Text>
          </div>
          <div>
            <Text>Last Month</Text>
            <Metric>{monthlyComparison.lastMonth.toLocaleString()}</Metric>
            <Text className="text-sm text-gray-500">submissions</Text>
          </div>
        </Grid>
      </Card>
    </div>
  );
}
