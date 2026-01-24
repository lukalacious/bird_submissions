"use client";

import { motion } from "framer-motion";
import { Flame, Award } from "lucide-react";
import type { UserStreak } from "@/app/actions/gamification-actions";

interface StreakCounterProps {
  streak: UserStreak;
}

export function StreakCounter({ streak }: StreakCounterProps) {
  const hasActiveStreak = streak.currentStreak > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100"
    >
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              hasActiveStreak
                ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }
                : {}
            }
            transition={{
              duration: 1.5,
              repeat: hasActiveStreak ? Infinity : 0,
              repeatDelay: 2,
            }}
            className="relative"
          >
            <Flame
              className={`h-10 w-10 ${
                hasActiveStreak ? "text-orange-500" : "text-gray-300"
              }`}
            />
            {hasActiveStreak && streak.isActiveThisMonth && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 blur-sm"
              >
                <Flame className="h-10 w-10 text-orange-400" />
              </motion.div>
            )}
          </motion.div>

          <div>
            <motion.span
              key={streak.currentStreak}
              initial={{ scale: 1.3, color: "#f97316" }}
              animate={{ scale: 1, color: "#1f2937" }}
              className="text-3xl font-bold text-gray-900"
            >
              {streak.currentStreak}
            </motion.span>
            <p className="text-sm text-gray-600">
              {streak.currentStreak === 1 ? "month" : "months"} streak
              {!streak.isActiveThisMonth && streak.currentStreak > 0 && (
                <span className="text-orange-500 ml-1">(submit to keep it!)</span>
              )}
            </p>
          </div>
        </div>

        {/* Longest Streak */}
        {streak.longestStreak > 0 && (
          <div className="flex items-center gap-2 text-gray-500">
            <Award className="h-5 w-5" />
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-700">{streak.longestStreak}</p>
              <p className="text-xs">best streak</p>
            </div>
          </div>
        )}
      </div>

      {/* Streak Status Messages */}
      {streak.currentStreak === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-sm text-gray-500 text-center"
        >
          Submit this month to start a streak!
        </motion.p>
      )}

      {streak.isActiveThisMonth && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-sm text-green-600 text-center font-medium"
        >
          ✓ Streak secured for this month!
        </motion.p>
      )}
    </motion.div>
  );
}
