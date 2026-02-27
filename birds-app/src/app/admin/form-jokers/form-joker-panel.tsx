"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  processFormJokers,
  assignBonusToUser,
  getAllUsersForMatching,
  getProcessingResults,
  type FormJokerResult,
} from "@/app/actions/form-joker-actions";
import type { ProcessingHistoryEntry } from "./page";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface FormJokerPanelProps {
  processingHistory: ProcessingHistoryEntry[];
  currentYear: number;
}

export function FormJokerPanel({ processingHistory, currentYear }: FormJokerPanelProps) {
  const router = useRouter();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState<FormJokerResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // User list for assignment (lazy-loaded)
  const [userList, setUserList] = useState<{ id: string; name: string; email: string }[] | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Per-row assignment state: email → { selectedUserId, status }
  const [assignments, setAssignments] = useState<
    Record<string, { selectedUserId: string; status: "idle" | "assigning" | "assigned" }>
  >({});

  // Build lookup from processing history
  const processedMonths = new Map(
    processingHistory.map((h) => [h.month, h])
  );

  // Lazy-load users when unmatched results appear
  const unmatchedResults = results?.filter((r) => !r.matched) || [];
  useEffect(() => {
    if (unmatchedResults.length > 0 && !userList && !loadingUsers) {
      setLoadingUsers(true);
      getAllUsersForMatching().then((users) => {
        setUserList(users);
        setLoadingUsers(false);
      });
    }
  }, [unmatchedResults.length, userList, loadingUsers]);

  async function handleProcess() {
    setLoading(true);
    setError(null);
    setResults(null);
    setShowConfirm(false);
    setAssignments({});

    try {
      const res = await processFormJokers(year, month);
      if (res.success) {
        setResults(res.results);
        if (res.error) setError(res.error);
        // Refresh server component to update processing grid
        router.refresh();
      } else {
        setError(res.error || "Failed to process form jokers");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(email: string, bonus: number, breakdown: { rule: string; value: number }[]) {
    const assignment = assignments[email];
    if (!assignment?.selectedUserId) return;

    setAssignments((prev) => ({
      ...prev,
      [email]: { ...prev[email], status: "assigning" },
    }));

    const res = await assignBonusToUser(
      assignment.selectedUserId,
      bonus,
      breakdown,
      year,
      month
    );

    if (res.success) {
      setAssignments((prev) => ({
        ...prev,
        [email]: { ...prev[email], status: "assigned" },
      }));
      router.refresh();
    } else {
      setAssignments((prev) => ({
        ...prev,
        [email]: { ...prev[email], status: "idle" },
      }));
      setError(res.error || "Failed to assign bonus");
    }
  }

  async function handleMonthClick(m: number) {
    setMonth(m);
    setShowConfirm(false);
    setError(null);
    setAssignments({});

    // If month was already processed, load the saved results
    if (processedMonths.has(m)) {
      setLoadingResults(true);
      setResults(null);
      try {
        const saved = await getProcessingResults(year, m);
        setResults(saved);
      } catch {
        setError("Failed to load saved results");
      } finally {
        setLoadingResults(false);
      }
    } else {
      setResults(null);
    }
  }

  const matchedResults = results?.filter((r) => r.matched) || [];
  const totalBonus = matchedResults.reduce((sum, r) => sum + r.bonus, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              min={2025}
              max={2030}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Process Form Jokers
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleProcess}
                  disabled={loading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Processing..." : `Confirm: Process ${MONTH_NAMES[month - 1]} ${year}`}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Processing Status Grid */}
      {year === currentYear && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold mb-3 text-sm text-gray-700">
            Processing Status — {currentYear}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTH_SHORT.map((name, i) => {
              const m = i + 1;
              const entry = processedMonths.get(m);
              const isSelected = month === m;
              const isProcessed = !!entry;

              return (
                <button
                  key={m}
                  onClick={() => handleMonthClick(m)}
                  title={
                    entry
                      ? `Processed ${new Date(entry.processedAt).toLocaleDateString()} by ${entry.processedBy} — ${entry.matchedCount} matched, ${entry.unmatchedCount} unmatched`
                      : `${MONTH_NAMES[i]} — not yet processed`
                  }
                  className={`
                    relative flex flex-col items-center justify-center rounded-lg px-2 py-2 text-xs font-medium transition-all
                    ${isSelected ? "ring-2 ring-purple-500 ring-offset-1" : ""}
                    ${isProcessed
                      ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100"
                    }
                  `}
                >
                  {isProcessed && (
                    <Check className="w-3.5 h-3.5 mb-0.5 text-green-600" />
                  )}
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading saved results */}
      {loadingResults && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
          Loading saved results...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Responses</span>
                <p className="text-lg font-bold">{results.length}</p>
              </div>
              <div>
                <span className="text-gray-500">Matched Users</span>
                <p className="text-lg font-bold text-green-600">{matchedResults.length}</p>
              </div>
              <div>
                <span className="text-gray-500">Unmatched</span>
                <p className="text-lg font-bold text-red-600">{unmatchedResults.length}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Bonus Awarded</span>
                <p className="text-lg font-bold text-purple-600">{totalBonus}</p>
              </div>
            </div>
          </div>

          {/* Matched Users Table */}
          {matchedResults.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="font-semibold p-4 pb-2">Matched Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">User</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Bonus</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matchedResults.map((r) => (
                      <tr key={r.email}>
                        <td className="px-4 py-2 text-gray-600">{r.email}</td>
                        <td className="px-4 py-2 font-medium">{r.userName || "—"}</td>
                        <td className={`px-4 py-2 text-right font-bold ${r.bonus >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {r.bonus >= 0 ? "+" : ""}{r.bonus}
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {r.breakdown.map((b) => `${b.rule}: ${b.value >= 0 ? "+" : ""}${b.value}`).join(", ") || "No bonus"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmatched Emails — with assignment UI */}
          {unmatchedResults.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
              <h3 className="font-semibold p-4 pb-2 text-red-700">Unmatched Emails</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-red-600">Email</th>
                      <th className="text-right px-4 py-2 font-medium text-red-600">Would-Be Bonus</th>
                      <th className="text-left px-4 py-2 font-medium text-red-600">Breakdown</th>
                      <th className="text-left px-4 py-2 font-medium text-red-600">Assign To</th>
                      <th className="text-left px-4 py-2 font-medium text-red-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {unmatchedResults.map((r) => {
                      const assignment = assignments[r.email];
                      const isAssigned = assignment?.status === "assigned";
                      const isAssigning = assignment?.status === "assigning";

                      return (
                        <tr key={r.email}>
                          <td className="px-4 py-2 text-gray-600">{r.email}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-400">{r.bonus}</td>
                          <td className="px-4 py-2 text-gray-400">
                            {r.breakdown.map((b) => `${b.rule}: ${b.value >= 0 ? "+" : ""}${b.value}`).join(", ") || "No bonus"}
                          </td>
                          <td className="px-4 py-2">
                            {isAssigned ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                <Check className="w-3 h-3" />
                                Assigned
                              </span>
                            ) : loadingUsers ? (
                              <span className="text-xs text-gray-400">Loading users...</span>
                            ) : (
                              <select
                                value={assignment?.selectedUserId || ""}
                                onChange={(e) =>
                                  setAssignments((prev) => ({
                                    ...prev,
                                    [r.email]: {
                                      selectedUserId: e.target.value,
                                      status: "idle",
                                    },
                                  }))
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                                disabled={isAssigning}
                              >
                                <option value="">Select user...</option>
                                {userList?.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {!isAssigned && !loadingUsers && (
                              <button
                                onClick={() => handleAssign(r.email, r.bonus, r.breakdown)}
                                disabled={!assignment?.selectedUserId || isAssigning}
                                className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isAssigning ? "..." : "Assign"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
