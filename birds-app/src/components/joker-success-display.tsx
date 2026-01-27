"use client";

import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JokerSuccessDisplayProps {
  jokersEarned: number;
  groupBreakdown: Array<{
    groupName: string;
    birdCount: number;
    jokersEarned: number;
  }>;
}

export function JokerSuccessDisplay({
  jokersEarned,
  groupBreakdown,
}: JokerSuccessDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Don't show if no jokers earned
  if (jokersEarned === 0 || groupBreakdown.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mt-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 p-4"
    >
      {/* Main joker display */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Shield className="h-8 w-8 text-amber-600 fill-amber-200" />
        </motion.div>
        <div>
          <div className="text-2xl font-bold text-amber-900">
            +{jokersEarned.toFixed(1)} Joker{jokersEarned !== 1 ? "s" : ""}!
          </div>
          <div className="text-sm text-amber-700">
            Earned from this submission
          </div>
        </div>
      </div>

      {/* Expandable breakdown */}
      {groupBreakdown.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-center gap-2 text-sm text-amber-800 hover:text-amber-900 transition-colors py-1"
          >
            <span>
              {showBreakdown ? "Hide" : "View"} breakdown
            </span>
            {showBreakdown ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 pt-2 border-t border-amber-200">
                  {groupBreakdown.map((group) => (
                    <div
                      key={group.groupName}
                      className="flex items-center justify-between text-sm bg-white/50 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-amber-600" />
                        <span className="font-medium text-amber-900">
                          {group.groupName}
                        </span>
                      </div>
                      <div className="text-amber-700">
                        {group.birdCount} birds = +
                        {group.jokersEarned.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-amber-600 text-center">
                  3 birds from same group = 1 joker, +0.5 per additional bird
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
