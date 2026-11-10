"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { filterSpecies, sortSpecies, type SpeciesRow, type SpeciesSort } from "@/lib/species-summary";

const SORTS: { key: SpeciesSort; label: string }[] = [
  { key: "common", label: "Most seen" },
  { key: "rare", label: "Rarest" },
  { key: "az", label: "A to Z" },
  { key: "family", label: "By family" },
];

const DAY = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

/** The club's species list for a period: searchable, sortable, each row opens to show who saw it. */
export function SpeciesList({ rows, periodLabel }: { rows: SpeciesRow[]; periodLabel: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SpeciesSort>("common");
  const shown = useMemo(() => sortSpecies(filterSpecies(rows, query), sort), [rows, query, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-56">
          <span className="mb-1 block text-sm font-semibold">Find a bird, family or player</span>
          <span className="relative block">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. kingfisher, Alcedinidae, Dale"
              className="min-h-12 w-full rounded-xl border border-rule bg-paper-raised pr-3 pl-10"
            />
          </span>
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Order</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SpeciesSort)}
            className="min-h-12 rounded-xl border border-rule bg-paper-raised px-3"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p role="status" className="text-sm text-ink-soft">
        {query.trim()
          ? `${shown.length} of ${rows.length} species match “${query.trim()}”`
          : `${rows.length} species in ${periodLabel}`}
      </p>

      {shown.length === 0 ? (
        <p className="text-ink-soft">{rows.length === 0 ? `Nothing twitched in ${periodLabel} yet.` : "No species match."}</p>
      ) : (
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
          {shown.map((r) => (
            <li key={r.key}>
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block truncate text-sm text-ink-soft">
                      {r.scientificName && <i>{r.scientificName}</i>}
                      {r.scientificName && r.family && " · "}
                      {r.family}
                      {!r.scientificName && !r.family && "Unlisted bird"}
                    </span>
                  </span>
                  {r.observers.length === 1 && (
                    <span className="rounded-full bg-weaver px-2 py-0.5 text-sm font-semibold text-weaver-ink">only one</span>
                  )}
                  <span className="min-w-9 rounded-full bg-paper-sunk px-2 py-1 text-center font-semibold tabular-nums">
                    {r.observers.length}
                    <span className="sr-only"> {r.observers.length === 1 ? "player" : "players"}</span>
                  </span>
                </summary>
                <div className="space-y-1 px-4 pb-3 text-sm">
                  <p>
                    <span className="text-ink-soft">Seen by </span>
                    {r.observers.join(", ")}
                  </p>
                  <p className="text-ink-soft">
                    First: {r.first.playerName}, {DAY.format(new Date(r.first.at))}
                    {r.lifers > 0 && ` · a lifer for ${r.lifers}`}
                  </p>
                  {r.family && r.familyJokerHolders > 0 && (
                    <p className="flex items-center gap-1">
                      <Sparkles aria-hidden className="size-4 text-lilac" />
                      {r.familyJokerHolders} {r.familyJokerHolders === 1 ? "player has" : "players have"} a joker from {r.family}
                    </p>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
