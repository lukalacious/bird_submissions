"use client";

import { motion } from "framer-motion";
import { Target, Check, ChevronRight } from "lucide-react";
import type { MonthlyChallenge } from "@/app/actions/gamification-actions";

interface MonthlyChallengesProps {
  challenges: MonthlyChallenge[];
}

function ChallengeItem({ challenge, index }: { challenge: MonthlyChallenge; index: number }) {
  const progress = Math.min(100, Math.round((challenge.current / challenge.target) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 24 }}
      className={`p-4 rounded-lg border ${
        challenge.completed
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <motion.div
          initial={challenge.completed ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            challenge.completed
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {challenge.completed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
            >
              <Check className="h-4 w-4" />
            </motion.div>
          ) : (
            <Target className="h-4 w-4" />
          )}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-medium ${
              challenge.completed ? "text-green-800" : "text-gray-900"
            }`}
          >
            {challenge.title}
          </h4>
          <p className="text-sm text-gray-500 mt-0.5">{challenge.description}</p>

          {/* Progress Bar */}
          {!challenge.completed && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-purple-600">
                  {challenge.current}/{challenge.target}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.1 + 0.2 }}
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                />
              </div>
            </div>
          )}

          {challenge.completed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-green-600 font-medium mt-2"
            >
              🎉 Challenge completed!
            </motion.p>
          )}
        </div>

        {/* Arrow for incomplete challenges */}
        {!challenge.completed && (
          <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

export function MonthlyChallenges({ challenges }: MonthlyChallengesProps) {
  const completedCount = challenges.filter((c) => c.completed).length;
  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  if (challenges.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-6 text-gray-500"
      >
        <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No challenges available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          {currentMonth} Challenges
        </h3>
        <span className="text-sm text-gray-500">
          {completedCount}/{challenges.length} completed
        </span>
      </div>

      {/* Challenge List */}
      <div className="space-y-3">
        {challenges.map((challenge, index) => (
          <ChallengeItem key={challenge.id} challenge={challenge} index={index} />
        ))}
      </div>
    </motion.div>
  );
}
