"use client";

import { Shield, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JokerPreviewCardProps {
  jokersToEarn: number;
  groupBreakdown: Array<{
    groupName: string;
    count: number;
    jokersEarned: number;
  }>;
}

export function JokerPreviewCard({
  jokersToEarn,
  groupBreakdown,
}: JokerPreviewCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Don't show if no jokers will be earned
  if (jokersToEarn === 0 || groupBreakdown.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 p-4"
    >
      {/* Preview header with pulsing icon */}
      <div className="flex items-start gap-3">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="flex-shrink-0 mt-0.5"
        >
          <Shield className="h-7 w-7 text-amber-600 fill-amber-200" />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-amber-900">
              You will earn {jokersToEarn.toFixed(1)} Joker
              {jokersToEarn !== 1 ? "s" : ""}!
            </h3>
            <Info className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm text-amber-700">
            From this submission
          </p>
        </div>
      </div>

      {/* Expandable breakdown */}
      {groupBreakdown.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-center gap-2 text-sm text-amber-800 hover:text-amber-900 transition-colors py-1 font-medium"
          >
            <span>
              {showBreakdown ? "Hide" : "Show"} breakdown by group
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
                <div className="mt-3 space-y-2 pt-2 border-t border-amber-300">
                  {groupBreakdown.map((group) => (
                    <div
                      key={group.groupName}
                      className="flex items-center justify-between text-sm bg-white/60 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-amber-600 fill-amber-100" />
                        <span className="font-medium text-amber-900">
                          {group.groupName}
                        </span>
                      </div>
                      <div className="text-amber-700 font-medium">
                        {group.count} birds = +{group.jokersEarned.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-amber-600 text-center bg-amber-100/50 rounded px-3 py-2">
                  <strong>Joker Formula:</strong> 3 birds from same group = 1 joker, +0.5 per additional bird
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
