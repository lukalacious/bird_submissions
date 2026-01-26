"use client";

import { AlertTriangle, Shield, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EliminationBannerProps {
  isEliminated: boolean;
  eliminationMonth: number | null;
  jokersAvailable: number;
  currentSubmissions: number;
  threshold: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function EliminationBanner({
  isEliminated,
  eliminationMonth,
  jokersAvailable,
  currentSubmissions,
  threshold,
}: EliminationBannerProps) {
  if (isEliminated) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-800">You&apos;ve been eliminated</p>
              <p className="text-sm text-red-600">
                Eliminated in {eliminationMonth ? MONTH_NAMES[eliminationMonth - 1] : "a previous month"}.
                You can still submit birds but won&apos;t be eligible for the challenge.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const birdsNeeded = threshold - currentSubmissions;
  const isAtRisk = birdsNeeded > 0;
  const isSafe = currentSubmissions >= threshold;

  if (isSafe) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">You&apos;re safe this month!</p>
              <p className="text-sm text-green-600">
                You&apos;ve submitted {currentSubmissions} birds, meeting the {threshold} bird threshold.
              </p>
            </div>
            {jokersAvailable > 0 && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                <Shield className="h-3 w-3" />
                {jokersAvailable} joker{jokersAvailable !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              {birdsNeeded} more bird{birdsNeeded !== 1 ? "s" : ""} needed
            </p>
            <p className="text-sm text-amber-600">
              Submit {birdsNeeded} more to avoid elimination ({currentSubmissions}/{threshold}).
              {jokersAvailable > 0 && ` You have ${jokersAvailable} joker${jokersAvailable !== 1 ? "s" : ""} as backup.`}
            </p>
          </div>
          {jokersAvailable > 0 && (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
              <Shield className="h-3 w-3" />
              {jokersAvailable}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
