"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Bird, Users, Calendar, MapPin, Filter, Search, X, Trophy, AlertTriangle, MessageSquare, TrendingUp, Sparkles, ChevronDown, Gift } from "lucide-react";
import type { FeedEntry, LeaderboardEntry } from "@/app/actions/feed-actions";
import type { CommunityJokerEntry, CommunityMonthlyBreakdown } from "@/app/actions/joker-actions";
import { BirdUsersModal } from "@/components/community/bird-users-modal";

// Lazy load tab content - only loads when that tab is active
const ActivityFeed = dynamic(
  () => import("@/components/community/activity-feed").then((mod) => mod.ActivityFeed),
  { loading: () => <div className="animate-pulse h-48 bg-gray-100 rounded-lg" /> }
);

const Leaderboard = dynamic(
  () => import("@/components/gamification/leaderboard").then((mod) => mod.Leaderboard),
  { loading: () => <div className="animate-pulse h-48 bg-gray-100 rounded-lg" /> }
);

interface CommunitySubmission {
  birdName: string;
  count: number;
  users: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  }[];
  groupName: string | null;
  jokerContribution: number;
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
  const [selectedBird, setSelectedBird] = useState<CommunitySubmission | null>(null);

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
              <CardContent className="py-1.5 px-3">
                <div className="flex items-center gap-2">
                  {/* Compact index */}
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-600 font-bold text-[10px] flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Bird name - takes available space */}
                  <span className="font-medium text-gray-900 text-sm truncate flex-1 min-w-0">
                    {sub.birdName}
                  </span>

                  {/* Joker contribution badge */}
                  {sub.jokerContribution > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs flex-shrink-0 border-amber-300 bg-amber-50 text-amber-700">
                      <Sparkles className="h-3 w-3" />
                      {sub.jokerContribution}
                    </Badge>
                  )}

                  {/* Clickable user count badge */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBird(sub);
                    }}
                    className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded-full flex-shrink-0"
                    aria-label={`View ${sub.count} users who logged ${sub.birdName}`}
                  >
                    <Badge variant="secondary" className="gap-1 text-xs cursor-pointer hover:bg-gray-200 transition-colors">
                      <Users className="h-3 w-3" />
                      {sub.count}
                    </Badge>
                  </button>
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

      {/* Jokers View — Accumulated Balances */}
      {viewMode === "jokers" && (
        <JokersBalanceView
          jokerActivity={jokerActivity}
          currentYear={currentYear}
          updateFilter={updateFilter}
        />
      )}

      {/* Bird Users Modal */}
      {selectedBird && (
        <BirdUsersModal
          open={!!selectedBird}
          onClose={() => setSelectedBird(null)}
          birdName={selectedBird.birdName}
          users={selectedBird.users}
        />
      )}
    </div>
  );
}

// --- Jokers Balance View (extracted component) ---

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function JokersBalanceView({
  jokerActivity,
  currentYear,
  updateFilter,
}: {
  jokerActivity: CommunityJokerEntry[];
  currentYear: number;
  updateFilter: (key: string, value: string) => void;
}) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="font-medium">Joker Balances</span>
        <select
          value={currentYear}
          onChange={(e) => updateFilter("year", e.target.value)}
          className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
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
            const isExpanded = expandedUser === entry.userId;

            return (
              <Card key={entry.userId}>
                <CardContent className="py-3 px-4">
                  {/* Header row: avatar, name, balance badge */}
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : entry.userId)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={entry.userImage || undefined} />
                      <AvatarFallback className="text-sm bg-purple-100 text-purple-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {entry.userName || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>{entry.totalEarned} earned</span>
                        {entry.totalUsed > 0 && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-red-500">{entry.totalUsed} used</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        className={`text-sm font-bold ${
                          entry.available > 0
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                        variant="outline"
                      >
                        {Math.floor(entry.available)}
                      </Badge>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded: monthly breakdown */}
                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 border-t pt-3">
                      {entry.monthlyBreakdown.map((mb) => {
                        const monthKey = `${entry.userId}-${mb.month}`;
                        const isMonthExpanded = expandedMonth === monthKey;
                        const hasBonus = mb.bonusJokers !== 0;

                        return (
                          <div key={mb.month}>
                            <button
                              onClick={() => setExpandedMonth(isMonthExpanded ? null : monthKey)}
                              className="w-full flex items-center justify-between text-xs bg-gray-50 hover:bg-gray-100 rounded px-2.5 py-1.5 transition-colors"
                            >
                              <span className="font-medium text-gray-700">
                                {SHORT_MONTHS[mb.month - 1]}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  {mb.groupJokers > 0 && <span>{mb.groupJokers} groups</span>}
                                  {mb.groupJokers > 0 && hasBonus && " + "}
                                  {hasBonus && (
                                    <span className={mb.bonusJokers > 0 ? "text-amber-600" : "text-red-500"}>
                                      {mb.bonusJokers > 0 ? "+" : ""}{mb.bonusJokers} bonus
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold text-green-600">
                                  +{mb.totalJokers}
                                </span>
                                {mb.usedJokers > 0 && (
                                  <span className="text-red-500 font-medium">
                                    -{mb.usedJokers} used
                                  </span>
                                )}
                                {(hasBonus && mb.bonusBreakdown && mb.bonusBreakdown.length > 0) && (
                                  <ChevronDown
                                    className={`h-3 w-3 text-gray-400 transition-transform ${
                                      isMonthExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                )}
                              </div>
                            </button>

                            {/* Bonus breakdown detail */}
                            {isMonthExpanded && mb.bonusBreakdown && mb.bonusBreakdown.length > 0 && (
                              <div className="ml-3 mt-1 space-y-0.5">
                                {mb.bonusBreakdown.map((rule, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-xs text-gray-500 px-2 py-0.5"
                                  >
                                    <span className="flex items-center gap-1">
                                      <Gift className="h-3 w-3 text-amber-500" />
                                      {rule.rule}
                                    </span>
                                    <span className={`font-medium ${rule.value > 0 ? "text-green-600" : "text-red-500"}`}>
                                      {rule.value > 0 ? "+" : ""}{rule.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
  );
}
