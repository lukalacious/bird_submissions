"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Bird, Users, Calendar, MapPin, Filter, Search, X, Trophy, AlertTriangle, MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { ActivityFeed } from "@/components/community/activity-feed";
import { Leaderboard } from "@/components/gamification/leaderboard";
import type { FeedEntry, LeaderboardEntry } from "@/app/actions/feed-actions";
import type { CommunityJokerEntry } from "@/app/actions/joker-actions";

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

type ChallengeFilter = "all" | "active" | "eliminated";
type ViewMode = "birds" | "feed" | "leaderboard" | "jokers";

interface CommunityViewProps {
  submissions: CommunitySubmission[];
  stats: {
    totalSubmissions: number;
    uniqueBirds: number;
    uniqueUsers: number;
  };
  regions: { id: string; label: string }[];
  users: { id: string; name: string; isEliminated?: boolean }[];
  currentYear: number;
  currentMonth: number;
  selectedRegion?: string;
  selectedUser?: string;
  challengeFilter: ChallengeFilter;
  eliminatedUserIds: string[];
  viewMode: ViewMode;
  feedEntries: FeedEntry[];
  monthlyLeaderboard: LeaderboardEntry[];
  allTimeLeaderboard: LeaderboardEntry[];
  jokerActivity: CommunityJokerEntry[];
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
  challengeFilter,
  eliminatedUserIds,
  viewMode,
  feedEntries,
  monthlyLeaderboard,
  allTimeLeaderboard,
  jokerActivity,
}: CommunityViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const query = searchQuery.toLowerCase();
    return submissions.filter((sub) =>
      sub.birdName.toLowerCase().includes(query) ||
      sub.users.some(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query)
      )
    );
  }, [submissions, searchQuery]);

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
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Community</h1>
          <p className="text-sm text-gray-600">
            Birds, activity feed, and leaderboards
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 bg-purple-50 rounded-lg">
        <button
          onClick={() => updateFilter("view", "birds")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "birds"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Bird className="h-4 w-4" />
          Birds
        </button>
        <button
          onClick={() => updateFilter("view", "feed")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "feed"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Activity
        </button>
        <button
          onClick={() => updateFilter("view", "leaderboard")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "leaderboard"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Leaderboard
        </button>
        <button
          onClick={() => updateFilter("view", "jokers")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "jokers"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Jokers
        </button>
      </div>

      {/* Search - only show for birds view */}
      {viewMode === "birds" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search birds, users, or usernames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Challenge Filter Tabs - show for birds and leaderboard */}
      {(viewMode === "birds" || viewMode === "leaderboard") && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => updateFilter("challenge", "all")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              challengeFilter === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="h-4 w-4" />
            All Players
          </button>
          <button
            onClick={() => updateFilter("challenge", "active")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              challengeFilter === "active"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Main Challenge
          </button>
          <button
            onClick={() => updateFilter("challenge", "eliminated")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              challengeFilter === "eliminated"
                ? "bg-white text-red-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Eliminated
            {eliminatedUserIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                {eliminatedUserIds.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filters - only for birds view */}
      {viewMode === "birds" && (
      <div className="bg-gray-50/50 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={currentYear}
            onChange={(e) => updateFilter("year", e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={currentMonth}
            onChange={(e) => updateFilter("month", e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedRegion || ""}
            onChange={(e) => updateFilter("region", e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <select
            value={selectedUser || ""}
            onChange={(e) => updateFilter("user", e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.isEliminated ? "❌" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      )}

      {/* Stats - only for birds view */}
      {viewMode === "birds" && (
      <div className="flex items-center justify-around py-2 px-3 bg-gray-50/50 rounded-lg text-sm">
        <div className="text-center">
          <span className="text-xl font-bold text-purple-600">{stats.totalSubmissions}</span>
          <span className="text-xs text-gray-500 ml-1">submissions</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="text-center">
          <span className="text-xl font-bold text-green-600">{stats.uniqueBirds}</span>
          <span className="text-xs text-gray-500 ml-1">species</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="text-center">
          <span className="text-xl font-bold text-blue-600">{stats.uniqueUsers}</span>
          <span className="text-xs text-gray-500 ml-1">users</span>
        </div>
      </div>
      )}

      {/* Month header + search results - only for birds view */}
      {viewMode === "birds" && (
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span className="font-medium">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          {selectedRegion && (
            <>
              <span>•</span>
              <MapPin className="h-3.5 w-3.5" />
              <span>{regions.find((r) => r.id === selectedRegion)?.label}</span>
            </>
          )}
        </div>
        {searchQuery && (
          <span className="text-xs text-gray-500">
            {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? "s" : ""} for "{searchQuery}"
          </span>
        )}
      </div>
      )}

      {/* Bird list - only for birds view */}
      {viewMode === "birds" && (filteredSubmissions.length > 0 ? (
        <div className="space-y-1.5">
          {filteredSubmissions.map((sub, index) => (
            <Card key={sub.birdName}>
              <CardContent className="py-2.5 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-bold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{sub.birdName}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {sub.users.slice(0, 5).map((user) => {
                          const initials = (user.username || user.name || "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <Avatar key={user.id} className="h-5 w-5 border-2 border-white -ml-1 first:ml-0">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="text-[8px] bg-gray-200">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                        {sub.users.length > 5 && (
                          <span className="text-xs text-gray-500 ml-1">
                            +{sub.users.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Users className="h-3 w-3" />
                    {sub.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Bird className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              {searchQuery ? "No matches found" : "No twitches yet"}
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? `No birds or users match "${searchQuery}"`
                : "No birds have been twitched for this period."}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Activity Feed View */}
      {viewMode === "feed" && (
        <Card>
          <CardContent className="p-4">
            <ActivityFeed entries={feedEntries} />
          </CardContent>
        </Card>
      )}

      {/* Leaderboard View */}
      {viewMode === "leaderboard" && (
        <Card>
          <CardContent className="p-4">
            <Leaderboard
              monthlyEntries={monthlyLeaderboard}
              allTimeEntries={allTimeLeaderboard}
            />
          </CardContent>
        </Card>
      )}

      {/* Jokers View */}
      {viewMode === "jokers" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium">
              {MONTH_NAMES[currentMonth - 1]} {currentYear} Joker Activity
            </span>
          </div>

          {jokerActivity.length > 0 ? (
            <div className="space-y-2">
              {jokerActivity.map((entry) => {
                const initials = (entry.userName || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <Card key={entry.userId}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entry.userImage || undefined} />
                          <AvatarFallback className="text-sm bg-purple-100 text-purple-700">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
                              {entry.userName || "Anonymous"}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {entry.totalEarned} earned
                            </Badge>
                          </div>

                          {/* Group breakdown */}
                          {entry.groupBreakdown.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {entry.groupBreakdown.map((group) => (
                                <div
                                  key={group.groupName}
                                  className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1"
                                >
                                  <span>
                                    {group.groupName} ({group.birdCount} birds)
                                  </span>
                                  <span className="font-medium text-green-600">
                                    +{group.jokersEarned} joker{group.jokersEarned !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Usage info */}
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            {entry.totalUsed > 0 && (
                              <span className="text-red-600">
                                {entry.totalUsed} used
                              </span>
                            )}
                            <span className="text-gray-500">
                              {Math.floor(entry.available)} available next month
                            </span>
                          </div>

                          {/* Joker submissions (when used) */}
                          {entry.jokerSubmissions.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Used: </span>
                              {entry.jokerSubmissions.map((js, i) => (
                                <span key={i}>
                                  {js.birdName} ({new Date(js.createdAt).toLocaleDateString()})
                                  {i < entry.jokerSubmissions.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <Sparkles className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  No jokers earned yet
                </h3>
                <p className="text-sm text-gray-500">
                  Earn jokers by twitching 3+ birds from the same group in a month.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
