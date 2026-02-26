"use client";

import { useState } from "react";
import { processFormJokers, type FormJokerResult } from "@/app/actions/form-joker-actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function FormJokerPanel() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FormJokerResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleProcess() {
    setLoading(true);
    setError(null);
    setResults(null);
    setShowConfirm(false);

    try {
      const res = await processFormJokers(year, month);
      if (res.success) {
        setResults(res.results);
        if (res.error) setError(res.error); // "No form responses" info message
      } else {
        setError(res.error || "Failed to process form jokers");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const matchedResults = results?.filter((r) => r.matched) || [];
  const unmatchedResults = results?.filter((r) => !r.matched) || [];
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

          {/* Unmatched Emails */}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {unmatchedResults.map((r) => (
                      <tr key={r.email}>
                        <td className="px-4 py-2 text-gray-600">{r.email}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-400">{r.bonus}</td>
                        <td className="px-4 py-2 text-gray-400">
                          {r.breakdown.map((b) => `${b.rule}: ${b.value >= 0 ? "+" : ""}${b.value}`).join(", ") || "No bonus"}
                        </td>
                      </tr>
                    ))}
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
