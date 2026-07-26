"use client";

import { Modal } from "@/components/ui/modal";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface JokerHistoryData {
  month: number;
  year: number;
  totalJokers: number;
  bonusJokers?: number;
  usedJokers: number;
  availableJokers: number;
  groupBreakdown: {
    groupName: string;
    birdCount: number;
    jokersEarned: number;
  }[];
  bonusBreakdown?: { rule: string; value: number }[] | null;
  shortfall?: number;
}

interface JokerHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  history: JokerHistoryData[];
  year: number;
}

export function JokerHistoryDialog({ open, onClose, history, year }: JokerHistoryDialogProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

  const toggleMonth = (month: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  // Calculate running balance
  let runningBalance = 0;
  const historyWithBalance = history
    .sort((a, b) => a.month - b.month)
    .map(month => {
      runningBalance += (month.totalJokers - month.usedJokers);
      return { ...month, runningBalance };
    });

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-1">Joker History</h2>
        <p className="text-muted-foreground mb-6">{year} Competition Year</p>

        {historyWithBalance.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No joker activity yet. Submit 3+ birds from the same family to earn jokers!
          </p>
        ) : (
          <div className="space-y-3">
            {historyWithBalance.map((month) => {
              const isExpanded = expandedMonths.has(month.month);
              return (
                <div key={month.month} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{MONTH_NAMES[month.month - 1]}</h3>
                    <span className="text-sm text-muted-foreground">
                      Balance: {month.runningBalance.toFixed(1)}
                    </span>
                  </div>

                  {(month.shortfall ?? 0) > 0 && (
                    <p className="mb-2 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-xs text-red-700">
                      ⚠ {month.shortfall!.toFixed(1)} more joker(s) were used than this
                      month now holds (a list edit reduced the total)
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-muted-foreground">Earned</span>
                      <p className="text-lg font-bold text-green-600">+{month.totalJokers.toFixed(1)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Used</span>
                      <p className="text-lg font-bold text-red-600">-{month.usedJokers.toFixed(1)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net</span>
                      <p className="text-lg font-bold">
                        {(month.totalJokers - month.usedJokers).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {(month.groupBreakdown.length > 0 || (month.bonusJokers != null && month.bonusJokers !== 0)) && (
                    <>
                      <button
                        onClick={() => toggleMonth(month.month)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <span>{isExpanded ? "Hide" : "Show"} breakdown</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 bg-secondary/30 rounded-md p-3">
                          {month.groupBreakdown.map((group) => (
                            <div key={group.groupName} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {group.groupName} ({group.birdCount} birds)
                              </span>
                              <span className="font-medium">+{group.jokersEarned.toFixed(1)}</span>
                            </div>
                          ))}
                          {month.bonusBreakdown && month.bonusBreakdown.length > 0 ? (
                            <>
                              <div className="border-t border-border/50 my-1" />
                              {month.bonusBreakdown.map((rule) => (
                                <div key={rule.rule} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{rule.rule}</span>
                                  <span className={rule.value >= 0 ? "text-green-600" : "text-red-600"}>
                                    {rule.value >= 0 ? "+" : ""}{rule.value}
                                  </span>
                                </div>
                              ))}
                            </>
                          ) : (
                            month.bonusJokers != null && month.bonusJokers !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Form Bonus</span>
                                <span className={month.bonusJokers >= 0 ? "text-green-600" : "text-red-600"}>
                                  {month.bonusJokers >= 0 ? "+" : ""}{month.bonusJokers.toFixed(1)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground border-t border-border pt-3">
          Jokers earned in a month become usable from the <em>next</em> month.
          Halves count towards your balance, but only whole jokers can be spent
          (4.5 available = 4 usable).
        </p>
      </div>
    </Modal>
  );
}
