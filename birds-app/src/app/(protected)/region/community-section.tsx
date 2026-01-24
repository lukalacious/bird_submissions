"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityFeed } from "@/components/community/activity-feed";
import { Leaderboard } from "@/components/gamification/leaderboard";
import { MessageSquare, Trophy } from "lucide-react";
import type { FeedEntry, LeaderboardEntry } from "@/app/actions/feed-actions";

interface CommunitySectionProps {
  feedEntries: FeedEntry[];
  monthlyLeaderboard: LeaderboardEntry[];
  allTimeLeaderboard: LeaderboardEntry[];
}

export function CommunitySection({
  feedEntries,
  monthlyLeaderboard,
  allTimeLeaderboard,
}: CommunitySectionProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "leaderboard">("feed");

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "feed"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Activity Feed
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "leaderboard"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </button>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-4">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "feed" ? (
              <ActivityFeed entries={feedEntries} />
            ) : (
              <Leaderboard
                monthlyEntries={monthlyLeaderboard}
                allTimeEntries={allTimeLeaderboard}
              />
            )}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
