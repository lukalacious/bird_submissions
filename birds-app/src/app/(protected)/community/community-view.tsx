"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bird, Users, Calendar, MapPin, Filter } from "lucide-react";

interface CommunitySubmission {
  birdName: string;
  count: number;
  users: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  }[];
}

interface CommunityViewProps {
  submissions: CommunitySubmission[];
  stats: {
    totalSubmissions: number;
    uniqueBirds: number;
    uniqueUsers: number;
  };
  regions: { id: string; label: string }[];
  users: { id: string; name: string }[];
  currentYear: number;
  currentMonth: number;
  selectedRegion?: string;
  selectedUser?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CommunityView({
  submissions,
  stats,
  regions,
  users,
  currentYear,
  currentMonth,
  selectedRegion,
  selectedUser,
}: CommunityViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/community?${params.toString()}`);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: MONTH_NAMES[i],
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Submissions</h1>
          <p className="text-gray-600">
            See what birds everyone has spotted this month
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Year */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Year</label>
              <select
                value={currentYear}
                onChange={(e) => updateFilter("year", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Month</label>
              <select
                value={currentMonth}
                onChange={(e) => updateFilter("month", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Region</label>
              <select
                value={selectedRegion || ""}
                onChange={(e) => updateFilter("region", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* User */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">User</label>
              <select
                value={selectedUser || ""}
                onChange={(e) => updateFilter("user", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.totalSubmissions}</div>
            <div className="text-sm text-gray-500">Total Submissions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.uniqueBirds}</div>
            <div className="text-sm text-gray-500">Unique Species</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.uniqueUsers}</div>
            <div className="text-sm text-gray-500">Participants</div>
          </CardContent>
        </Card>
      </div>

      {/* Month header */}
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar className="h-4 w-4" />
        <span className="font-medium">
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </span>
        {selectedRegion && (
          <>
            <span>•</span>
            <MapPin className="h-4 w-4" />
            <span>{regions.find((r) => r.id === selectedRegion)?.label}</span>
          </>
        )}
      </div>

      {/* Bird list */}
      {submissions.length > 0 ? (
        <div className="space-y-3">
          {submissions.map((sub, index) => (
            <Card key={sub.birdName}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sub.birdName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {sub.users.slice(0, 5).map((user) => {
                          const initials = (user.username || user.name || "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <Avatar key={user.id} className="h-6 w-6 border-2 border-white -ml-1 first:ml-0">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="text-[10px] bg-gray-200">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                        {sub.users.length > 5 && (
                          <span className="text-xs text-gray-500 ml-1">
                            +{sub.users.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {sub.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Bird className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-500">
              No birds have been submitted for this period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
