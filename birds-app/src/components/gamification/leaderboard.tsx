"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, TrendingUp, Calendar, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { LEVELS } from "@/lib/gamification-constants";
import { getLeaderboard } from "@/app/actions/feed-actions";
import type { LeaderboardEntry } from "@/app/actions/feed-actions";

interface LeaderboardProps {
  monthlyEntries: LeaderboardEntry[];
  allTimeEntries: LeaderboardEntry[];
  /** Passed through when fetching past months so the filter stays consistent */
  challengeFilter?: "all" | "active" | "eliminated";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-gray-500 w-5 text-center">{rank}</span>;
  }
}

function getRankBg(rank: number) {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200";
    case 2:
      return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200";
    case 3:
      return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200";
    default:
      return "bg-white border-gray-100";
  }
}

function getUserInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getLevelInfo(level: number) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

function LeaderboardItem({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const levelInfo = getLevelInfo(entry.level);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 24 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${getRankBg(entry.rank)} ${
        entry.isCurrentUser ? "ring-2 ring-purple-400 ring-offset-1" : ""
      }`}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 flex justify-center">
        {getRankIcon(entry.rank)}
      </div>

      {/* Avatar */}
      <Avatar className="h-9 w-9">
        <AvatarImage src={entry.userImage || undefined} alt={entry.userName || "User"} />
        <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
          {getUserInitials(entry.userName)}
        </AvatarFallback>
      </Avatar>

      {/* Name and Level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${
            entry.isEliminated
              ? "text-gray-500"
              : entry.isCurrentUser
                ? "text-purple-700"
                : "text-gray-900"
          }`}>
            {entry.userName || "Anonymous"}
            {entry.isCurrentUser && (
              <span className="text-xs text-purple-500 ml-1">(you)</span>
            )}
          </span>
          {entry.isEliminated && (
            <span className="flex items-center gap-0.5 text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
              <AlertTriangle className="h-3 w-3" />
              Eliminated
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>{levelInfo.icon}</span>
          <span>{levelInfo.name}</span>
        </div>
      </div>

      {/* Score - Jokers Earned */}
      <div className="flex-shrink-0 text-right">
        <motion.span
          key={entry.totalJokersEarned}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="font-bold text-lg text-gray-900"
        >
          {entry.totalJokersEarned}
        </motion.span>
        <p className="text-xs text-gray-500">jokers</p>
      </div>
    </motion.div>
  );
}

export function Leaderboard({
  monthlyEntries,
  allTimeEntries,
  challengeFilter = "all",
}: LeaderboardProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [activeTab, setActiveTab] = useState<"month" | "alltime">("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  // Cache of past-month leaderboards fetched on demand
  const [pastMonths, setPastMonths] = useState<Record<number, LeaderboardEntry[]>>({});
  const [isPending, startTransition] = useTransition();

  const entries =
    activeTab === "alltime"
      ? allTimeEntries
      : selectedMonth === currentMonth
        ? monthlyEntries
        : pastMonths[selectedMonth] ?? [];

  const isLoadingMonth =
    activeTab === "month" &&
    selectedMonth !== currentMonth &&
    pastMonths[selectedMonth] === undefined &&
    isPending;

  function handleMonthChange(month: number) {
    setSelectedMonth(month);
    setActiveTab("month");
    if (month !== currentMonth && pastMonths[month] === undefined) {
      startTransition(async () => {
        const data = await getLeaderboard("month", challengeFilter, {
          year: currentYear,
          month,
        });
        setPastMonths((prev) => ({ ...prev, [month]: data }));
      });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-600" />
          Leaderboard
        </h3>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {/* Month picker — native select for mobile friendliness */}
          <div
            className={`relative flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "month"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>{MONTH_NAMES[selectedMonth - 1]}</span>
            <ChevronDown className="h-3 w-3" />
            <select
              aria-label="Select leaderboard month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              onFocus={() => setActiveTab("month")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {MONTH_NAMES.slice(0, currentMonth).map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setActiveTab("alltime")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "alltime"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            All Time
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab === "alltime" ? "alltime" : `month-${selectedMonth}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {isLoadingMonth ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="h-8 w-8 mx-auto mb-2 text-purple-400 animate-spin" />
                <p className="text-sm">Loading {MONTH_NAMES[selectedMonth - 1]}...</p>
              </div>
            ) : entries.length > 0 ? (
              entries.slice(0, 5).map((entry, index) => (
                <LeaderboardItem key={entry.userId} entry={entry} index={index} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {activeTab === "month" && selectedMonth !== currentMonth
                    ? `No jokers recorded for ${MONTH_NAMES[selectedMonth - 1]}`
                    : "No submissions yet"}
                </p>
                {activeTab === "month" && selectedMonth === currentMonth && (
                  <p className="text-xs mt-1">Be the first to top the leaderboard!</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
