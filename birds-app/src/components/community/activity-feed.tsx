"use client";

import { motion } from "framer-motion";
import { FeedItem } from "./feed-item";
import { Users, Clock, Calendar, History } from "lucide-react";
import type { FeedEntry } from "@/app/actions/feed-actions";

interface ActivityFeedProps {
  entries: FeedEntry[];
}

interface GroupedEntries {
  today: FeedEntry[];
  yesterday: FeedEntry[];
  thisWeek: FeedEntry[];
  earlier: FeedEntry[];
}

function groupEntriesByTime(entries: FeedEntry[]): GroupedEntries {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const grouped: GroupedEntries = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp);

    if (entryDate >= todayStart) {
      grouped.today.push(entry);
    } else if (entryDate >= yesterdayStart) {
      grouped.yesterday.push(entry);
    } else if (entryDate >= weekStart) {
      grouped.thisWeek.push(entry);
    } else {
      grouped.earlier.push(entry);
    }
  }

  return grouped;
}

interface TimeGroupProps {
  title: string;
  icon: React.ReactNode;
  entries: FeedEntry[];
  startIndex: number;
}

function TimeGroup({ title, icon, entries, startIndex }: TimeGroupProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 text-sm font-medium text-gray-500"
      >
        {icon}
        <span>{title}</span>
      </motion.div>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <FeedItem key={entry.id} entry={entry} index={startIndex + index} />
        ))}
      </div>
    </div>
  );
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const grouped = groupEntriesByTime(entries);

  const hasAnyEntries =
    grouped.today.length > 0 ||
    grouped.yesterday.length > 0 ||
    grouped.thisWeek.length > 0 ||
    grouped.earlier.length > 0;

  if (!hasAnyEntries) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 text-gray-500"
      >
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No activity yet</p>
        <p className="text-sm mt-1">Be the first to twitch a bird!</p>
      </motion.div>
    );
  }

  // Calculate start indices for stagger animation
  let currentIndex = 0;
  const todayStartIndex = currentIndex;
  currentIndex += grouped.today.length;
  const yesterdayStartIndex = currentIndex;
  currentIndex += grouped.yesterday.length;
  const thisWeekStartIndex = currentIndex;
  currentIndex += grouped.thisWeek.length;
  const earlierStartIndex = currentIndex;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <TimeGroup
        title="Today"
        icon={<Clock className="h-4 w-4" />}
        entries={grouped.today}
        startIndex={todayStartIndex}
      />
      <TimeGroup
        title="Yesterday"
        icon={<Calendar className="h-4 w-4" />}
        entries={grouped.yesterday}
        startIndex={yesterdayStartIndex}
      />
      <TimeGroup
        title="This Week"
        icon={<Calendar className="h-4 w-4" />}
        entries={grouped.thisWeek}
        startIndex={thisWeekStartIndex}
      />
      <TimeGroup
        title="Earlier"
        icon={<History className="h-4 w-4" />}
        entries={grouped.earlier}
        startIndex={earlierStartIndex}
      />
    </motion.div>
  );
}
