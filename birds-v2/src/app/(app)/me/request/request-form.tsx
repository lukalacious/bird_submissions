"use client";

import { useActionState, useMemo, useState } from "react";
import { indexBirds, searchBirds } from "@/lib/bird-search";
import type { ChecklistBird } from "@/lib/checklist";
import { createChangeRequest } from "./actions";

export function RequestForm({ submissionId, birdLabel, regionBirds }: { submissionId: string; birdLabel: string; regionBirds: ChecklistBird[] }) {
  const [state, action, pending] = useActionState(createChangeRequest, null);
  const [type, setType] = useState<"SWAP" | "DELETE" | "OTHER">("SWAP");
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState<ChecklistBird | null>(null);
  const index = useMemo(() => indexBirds(regionBirds), [regionBirds]);
  const results = searchBirds(index, query, 8);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="submissionId" value={submissionId} />
      <fieldset className="space-y-2">
        <legend className="font-semibold">What should happen to {birdLabel}?</legend>
        {([
          ["SWAP", "Swap it for a different bird"],
          ["DELETE", "Remove it"],
          ["OTHER", "Something else"],
        ] as const).map(([value, text]) => (
          <label key={value} className="flex min-h-12 items-center gap-3 rounded-xl border border-rule bg-paper-raised px-4">
            <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="size-5" />
            {text}
          </label>
        ))}
      </fieldset>

      {type === "SWAP" && (
        <div className="space-y-2">
          <label htmlFor="replacement-search" className="font-semibold">The bird it should be</label>
          {replacement ? (
            <p className="flex items-center justify-between rounded-xl bg-roller-wash px-4 py-3">
              {replacement.displayName}
              <button type="button" onClick={() => setReplacement(null)} className="font-semibold text-roller">Change</button>
            </p>
          ) : (
            <>
              <input id="replacement-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a few letters" className="block min-h-12 w-full rounded-xl border border-rule bg-paper-raised px-4" />
              <ul className="space-y-1">
                {results.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setReplacement(b)} className="min-h-12 w-full rounded-xl px-4 text-left hover:bg-paper-sunk">
                      {b.displayName} <span className="text-sm text-ink-soft italic">{b.scientificName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {replacement && <input type="hidden" name="replacementBirdId" value={replacement.id} />}
        </div>
      )}

      <label className="block space-y-1">
        <span className="block font-semibold">Note for the admin {type === "OTHER" ? "" : "(optional)"}</span>
        <textarea name="note" rows={3} maxLength={500} className="block w-full rounded-xl border border-rule bg-paper-raised p-4" />
      </label>

      {state && !state.ok && <p role="alert" className="rounded-xl border border-alarm/40 p-4 text-alarm">{state.error}</p>}
      <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink disabled:opacity-60">
        {pending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
