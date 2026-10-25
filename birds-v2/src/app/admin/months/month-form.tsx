"use client";

import { useActionState, useMemo, useState } from "react";
import { X } from "lucide-react";
import { indexBirds, searchBirds } from "@/lib/bird-search";
import { saveMonth } from "./actions";

interface Species {
  id: string;
  scientificName: string;
  displayName: string;
  alphabeticalName: string;
}

function SpeciesPicker({ name, label, all, initial }: { name: string; label: string; all: Species[]; initial: string[] }) {
  const [chosen, setChosen] = useState(initial);
  const [query, setQuery] = useState("");
  const index = useMemo(() => indexBirds(all), [all]);
  const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
  const results = searchBirds(index, query, 8).filter((s) => !chosen.includes(s.id));

  return (
    <fieldset className="space-y-2">
      <legend className="text-lg font-semibold">{label}</legend>
      {chosen.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <ul className="flex flex-wrap gap-2">
        {chosen.map((id) => (
          <li key={id} className="flex items-center gap-1 rounded-full bg-paper-sunk py-1 pr-1 pl-3">
            {byId.get(id)?.displayName ?? id}
            <button type="button" aria-label={`Remove ${byId.get(id)?.displayName}`} onClick={() => setChosen((c) => c.filter((x) => x !== id))} className="grid size-8 place-items-center rounded-full">
              <X aria-hidden className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <label className="block">
        <span className="sr-only">Search species for {label}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any region's bird"
          className="block min-h-12 w-full rounded-xl border border-rule bg-paper-raised px-4"
        />
      </label>
      {results.length > 0 && (
        <ul className="rounded-xl border border-rule bg-paper-raised">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setChosen((c) => [...c, s.id]);
                  setQuery("");
                }}
                className="block min-h-12 w-full px-4 text-left hover:bg-paper-sunk"
              >
                {s.displayName} <span className="text-sm text-ink-soft italic">{s.scientificName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

interface Props {
  year: number;
  month: number;
  monthLabel: string;
  defaults: { maxBirds: number; threshold: number };
  overrides: { maxBirds: number | null; threshold: number | null };
  golden: string[];
  photo: string[];
  species: Species[];
}

export function MonthForm({ year, month, monthLabel, defaults, overrides, golden, photo, species }: Props) {
  const [state, action, pending] = useActionState(saveMonth, null);
  return (
    <form action={action} key={`${year}-${month}`} className="space-y-8">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="block font-semibold">Birds allowed in {monthLabel}</span>
          <span className="block text-sm text-ink-soft">Blank = the season default ({defaults.maxBirds}).</span>
          <input type="number" name="maxBirds" min={0} max={31} defaultValue={overrides.maxBirds ?? ""} className="block min-h-12 w-32 rounded-xl border border-rule bg-paper-raised px-4" />
        </label>
        <label className="block space-y-1">
          <span className="block font-semibold">Birds needed to stay in</span>
          <span className="block text-sm text-ink-soft">Blank = the season default ({defaults.threshold}).</span>
          <input type="number" name="threshold" min={0} max={31} defaultValue={overrides.threshold ?? ""} className="block min-h-12 w-32 rounded-xl border border-rule bg-paper-raised px-4" />
        </label>
      </div>
      <SpeciesPicker name="golden" label="Golden birds" all={species} initial={golden} />
      <SpeciesPicker name="photo" label="Photo birds" all={species} initial={photo} />
      {state && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-roller-wash p-4" : "rounded-xl border border-alarm/40 p-4 text-alarm"}>
          {state.ok ? state.message : state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink disabled:opacity-60">
        {pending ? "Saving…" : `Save ${monthLabel}`}
      </button>
    </form>
  );
}
