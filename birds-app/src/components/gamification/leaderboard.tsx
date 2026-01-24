"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, TrendingUp, Calendar } from "lucide-react";
import { LEVELS } from "@/lib/gamification-constants";
import type { LeaderboardEntry } from "@/app/actions/feed-actions";

interface LeaderboardProps {
  monthlyEntries: LeaderboardEntry[];
  allTimeEntries: LeaderboardEntry[];
}

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
          <span className={`font-medium truncate ${entry.isCurrentUser ? "text-purple-700" : "text-gray-900"}`}>
            {entry.userName || "Anonymous"}
            {entry.isCurrentUser && (
              <span className="text-xs text-purple-500 ml-1">(you)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>{levelInfo.icon}</span>
          <span>{levelInfo.name}</span>
        </div>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <motion.span
          key={entry.submissionCount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="font-bold text-lg text-gray-900"
        >
          {entry.submissionCount}
        </motion.span>
        <p className="text-xs text-gray-500">birds</p>
      </div>
    </motion.div>
  );
}

export function Leaderboard({ monthlyEntries, allTimeEntries }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<"month" | "alltime">("month");
  const entries = activeTab === "month" ? monthlyEntries : allTimeEntries;
  const currentMonth = new Date().toLocaleString("default", { month: "long" });

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
          <button
            onClick={() => setActiveTab("month")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "month"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="h-4 w-4" />
            {currentMonth}
          </button>
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
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {entries.length > 0 ? (
              entries.slice(0, 5).map((entry, index) => (
                <LeaderboardItem key={entry.userId} entry={entry} index={index} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No submissions yet</p>
                <p className="text-xs mt-1">Be the first to top the leaderboard!</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
