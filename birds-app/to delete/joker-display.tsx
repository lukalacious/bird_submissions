"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Bird, Info } from "lucide-react";

interface JokerInfo {
  totalJokers: number;
  usedJokers: number;
  availableJokers: number;
  groupBreakdown: {
    groupName: string;
    birdCount: number;
    jokersEarned: number;
  }[];
}

interface JokerDisplayProps {
  jokerInfo: JokerInfo;
  compact?: boolean;
}

export function JokerDisplay({ jokerInfo, compact = false }: JokerDisplayProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium">
          {jokerInfo.availableJokers.toFixed(1)} joker{jokerInfo.availableJokers !== 1 ? "s" : ""}
        </span>
        {jokerInfo.usedJokers > 0 && (
          <span className="text-xs text-gray-500">
            ({jokerInfo.usedJokers} used)
          </span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-amber-600" />
          Jokers Earned
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div>
            <p className="text-2xl font-bold text-amber-700">
              {jokerInfo.availableJokers.toFixed(1)}
            </p>
            <p className="text-sm text-amber-600">Available jokers</p>
          </div>
          {jokerInfo.usedJokers > 0 && (
            <Badge variant="secondary" className="bg-gray-100">
              {jokerInfo.usedJokers} used
            </Badge>
          )}
        </div>

        {/* How jokers work */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-700">
            Earn jokers by twitching multiple birds from the same group.
            3 birds = 1 joker, +0.5 for each additional bird.
          </p>
        </div>

        {/* Group breakdown */}
        {jokerInfo.groupBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Group breakdown:</p>
            <div className="space-y-2">
              {jokerInfo.groupBreakdown.map((group) => (
                <div
                  key={group.groupName}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Bird className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{group.groupName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.birdCount} birds
                    </Badge>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">
                    +{group.jokersEarned.toFixed(1)} joker{group.jokersEarned !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {jokerInfo.groupBreakdown.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            Twitch 3+ birds from the same group to earn jokers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
