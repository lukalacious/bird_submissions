"use client";

import { motion } from "framer-motion";
import { LEVELS, isInInitialPeriod } from "@/lib/gamification-constants";
import type { UserLevel } from "@/app/actions/gamification-actions";

interface LevelProgressProps {
  level: UserLevel;
}

export function LevelProgress({ level }: LevelProgressProps) {
  const currentLevelInfo = LEVELS.find((l) => l.level === level.level) || LEVELS[0];
  const inInitialPeriod = isInInitialPeriod();

  // Calculate what percentile range the user needs to reach for next level
  const getNextLevelTarget = () => {
    if (level.level === 1) return { name: "Birder", percentile: 25, icon: "🔭" };
    if (level.level === 2) return { name: "Twitcher", percentile: 75, icon: "🦅" };
    return null; // Already at top level
  };

  const nextLevel = getNextLevelTarget();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 border border-purple-100"
    >
      {/* Current Level Display */}
      <div className="flex items-center gap-3 mb-4">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="text-4xl"
        >
          {currentLevelInfo.icon}
        </motion.span>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{currentLevelInfo.name}</h3>
          <p className="text-sm text-gray-500">
            {level.totalSubmissions} birds spotted total
          </p>
        </div>
      </div>

      {/* Initial Period Message */}
      {inInitialPeriod && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3"
        >
          <p className="text-sm text-blue-700">
            Everyone starts as Fledgling! Rankings begin in March 2026.
          </p>
        </motion.div>
      )}

      {/* Rank and Stats (after initial period) */}
      {!inInitialPeriod && (
        <div className="space-y-3">
          {/* Rank Display */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Your Rank</span>
            <span className="font-medium text-purple-600">
              #{level.rank} of {level.totalUsers}
            </span>
          </div>

          {/* Percentile Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Percentile</span>
              <span className="font-medium text-purple-600">Top {100 - level.percentile}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
              {/* Level zone markers */}
              <div className="absolute inset-0 flex">
                <div className="w-1/4 border-r border-gray-300" title="Fledgling zone" />
                <div className="w-1/2 border-r border-gray-300" title="Birder zone" />
                <div className="w-1/4" title="Twitcher zone" />
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${level.percentile}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full relative z-10"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Fledgling</span>
              <span>Birder</span>
              <span>Twitcher</span>
            </div>
          </div>

          {/* Monthly Progress */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              This month: <span className="font-medium text-gray-700">{level.monthlySubmissions}/31</span> birds
            </p>
          </div>

          {/* Next Level Target */}
          {nextLevel && (
            <p className="text-xs text-gray-500 text-center">
              Reach top {100 - nextLevel.percentile}% to become{" "}
              <span className="font-medium">{nextLevel.icon} {nextLevel.name}</span>
            </p>
          )}
        </div>
      )}

      {/* Max Level Message */}
      {!inInitialPeriod && level.level === 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-purple-600 font-medium text-center mt-2"
        >
          You&apos;re in the top 25% - keep it up!
        </motion.p>
      )}
    </motion.div>
  );
}
