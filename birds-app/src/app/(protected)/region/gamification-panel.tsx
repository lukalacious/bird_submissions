"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LevelProgress } from "@/components/gamification/level-progress";
import { StreakCounter } from "@/components/gamification/streak-counter";
import { MonthlyChallenges } from "@/components/gamification/monthly-challenges";
import type { UserGamification } from "@/app/actions/gamification-actions";

interface GamificationPanelProps {
  gamification: UserGamification;
}

export function GamificationPanel({ gamification }: GamificationPanelProps) {
  return (
    <div className="space-y-6">
      {/* Top Row: Level and Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Level Progress */}
        <div>
          <LevelProgress level={gamification.level} />
        </div>

        {/* Streak Counter */}
        <div>
          <StreakCounter streak={gamification.streak} />
        </div>
      </div>

      {/* Monthly Challenges */}
      <Card>
        <CardContent className="p-4">
          <MonthlyChallenges challenges={gamification.monthlyChallenges} />
        </CardContent>
      </Card>
    </div>
  );
}
