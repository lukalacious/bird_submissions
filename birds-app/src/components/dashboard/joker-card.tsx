"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useState, Suspense, lazy } from "react";

// Lazy load the dialog - only loaded when user clicks to open
const JokerHistoryDialog = lazy(() =>
  import("./joker-history-dialog").then((mod) => ({
    default: mod.JokerHistoryDialog,
  }))
);

interface JokerCardProps {
  totalJokers: number;
  usedJokers: number;
  availableJokers: number;
  history: any[]; // JokerHistoryData[]
  year: number;
}

export function JokerCard({ totalJokers, usedJokers, availableJokers, history, year }: JokerCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <Card
        className="bg-gradient-to-br from-amber-50/50 to-yellow-50/50 border-amber-200/50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setHistoryOpen(true)}
      >
        <CardContent className="p-2">
          <div className="flex flex-col items-center text-center gap-1">
            <div className="p-1.5 bg-amber-500/10 rounded-md">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-amber-700">{availableJokers.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground leading-tight">Jokers</p>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <span>{totalJokers.toFixed(1)} earned</span>
              <span>•</span>
              <span>{usedJokers.toFixed(1)} used</span>
            </div>
          </div>
        </CardContent>
      </Card>

{historyOpen && (
        <Suspense fallback={null}>
          <JokerHistoryDialog
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            history={history}
            year={year}
          />
        </Suspense>
      )}
    </>
  );
}
