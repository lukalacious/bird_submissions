"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, Bird } from "lucide-react";
import { LEVELS } from "@/lib/gamification-constants";
import type { FeedEntry } from "@/app/actions/feed-actions";

interface FeedItemProps {
  entry: FeedEntry;
  index: number;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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

export function FeedItem({ entry, index }: FeedItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const levelInfo = getLevelInfo(entry.userLevel);
  const birdCount = entry.birdNames.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 ring-2 ring-purple-100">
          <AvatarImage src={entry.userImage || undefined} alt={entry.userName || "User"} />
          <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-medium">
            {getUserInitials(entry.userName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Name */}
            <span className="font-semibold text-gray-900 truncate">
              {entry.userName || "Anonymous"}
            </span>

            {/* Level badge */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
              title={levelInfo.name}
            >
              {levelInfo.icon} {levelInfo.name}
            </span>
          </div>

          {/* Action text */}
          <p className="text-gray-600 text-sm mt-1">
            spotted{" "}
            <span className="font-medium text-purple-600">
              {birdCount} {birdCount === 1 ? "bird" : "birds"}
            </span>{" "}
            in <span className="font-medium text-gray-700">{entry.regionLabel}</span>
          </p>

          {/* Expandable bird list */}
          {birdCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-2 text-sm text-gray-500 hover:text-purple-600 transition-colors"
            >
              <Bird className="h-4 w-4" />
              <span>{isExpanded ? "Hide" : "Show"} birds</span>
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>
          )}

          {/* Bird names */}
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? "auto" : 0,
              opacity: isExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
              {entry.birdNames.map((bird, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                >
                  {bird}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatRelativeTime(new Date(entry.timestamp))}
        </span>
      </div>
    </motion.div>
  );
}
