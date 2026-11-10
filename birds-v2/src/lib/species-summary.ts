/**
 * Pure aggregation behind Sightings → Species: one row per species seen by
 * the club in a period, with who saw it. Kept free of the database so the
 * grouping rules are unit-tested.
 */

export interface SightingInput {
  userId: string;
  playerName: string;
  /** null for unlisted (custom) birds */
  speciesId: string | null;
  name: string;
  scientificName: string | null;
  family: string | null;
  month: number;
  isLifer: boolean;
  /** ISO timestamp of when it was added */
  at: string;
}

export interface SpeciesRow {
  key: string;
  name: string;
  scientificName: string | null;
  family: string | null;
  /** distinct players, in the order they added it */
  observers: string[];
  lifers: number;
  first: { playerName: string; at: string };
  /** players holding a family joker (3+ of this family in one month) that this bird counts towards */
  familyJokerHolders: number;
}

export interface SpeciesSummary {
  rows: SpeciesRow[];
  sightings: number;
  players: number;
}

const customKey = (name: string) => `custom:${name.trim().toLowerCase()}`;

export function summariseSpecies(input: SightingInput[]): SpeciesSummary {
  const sightings = [...input].sort((a, b) => a.at.localeCompare(b.at));

  // family jokers are earned per month: 3+ birds of one family in that month
  const perPlayerFamilyMonth = new Map<string, number>();
  for (const s of sightings) {
    if (!s.family) continue;
    const k = `${s.userId}|${s.family}|${s.month}`;
    perPlayerFamilyMonth.set(k, (perPlayerFamilyMonth.get(k) ?? 0) + 1);
  }
  const holdersByFamily = new Map<string, Set<string>>();
  for (const [k, n] of perPlayerFamilyMonth) {
    if (n < 3) continue;
    const [userId, family] = k.split("|");
    if (!holdersByFamily.has(family)) holdersByFamily.set(family, new Set());
    holdersByFamily.get(family)!.add(userId);
  }

  const bySpecies = new Map<string, { row: SpeciesRow; seenBy: Set<string>; names: Map<string, number> }>();
  for (const s of sightings) {
    const key = s.speciesId ?? customKey(s.name);
    let entry = bySpecies.get(key);
    if (!entry) {
      entry = {
        row: {
          key,
          name: s.name,
          scientificName: s.scientificName,
          family: s.family,
          observers: [],
          lifers: 0,
          first: { playerName: s.playerName, at: s.at },
          familyJokerHolders: s.family ? (holdersByFamily.get(s.family)?.size ?? 0) : 0,
        },
        seenBy: new Set(),
        names: new Map(),
      };
      bySpecies.set(key, entry);
    }
    entry.names.set(s.name, (entry.names.get(s.name) ?? 0) + 1);
    if (s.isLifer) entry.row.lifers += 1;
    if (!entry.seenBy.has(s.userId)) {
      entry.seenBy.add(s.userId);
      entry.row.observers.push(s.playerName);
    }
  }

  const rows = [...bySpecies.values()].map(({ row, names }) => {
    // regions name the same species differently: show the name most players used
    const [name] = [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { ...row, name };
  });
  rows.sort((a, b) => b.observers.length - a.observers.length || a.name.localeCompare(b.name));

  return { rows, sightings: sightings.length, players: new Set(sightings.map((s) => s.userId)).size };
}

export type SpeciesSort = "common" | "rare" | "az" | "family";

export function sortSpecies(rows: SpeciesRow[], sort: SpeciesSort): SpeciesRow[] {
  const byName = (a: SpeciesRow, b: SpeciesRow) => a.name.localeCompare(b.name);
  const sorted = [...rows];
  if (sort === "common") sorted.sort((a, b) => b.observers.length - a.observers.length || byName(a, b));
  if (sort === "rare") sorted.sort((a, b) => a.observers.length - b.observers.length || byName(a, b));
  if (sort === "az") sorted.sort(byName);
  if (sort === "family") sorted.sort((a, b) => (a.family ?? "￿").localeCompare(b.family ?? "￿") || byName(a, b));
  return sorted;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/-/g, " ");

/** Every typed word must appear in the bird's names, its family, or an observer's name. */
export function filterSpecies(rows: SpeciesRow[], query: string): SpeciesRow[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;
  return rows.filter((r) => {
    const hay = fold([r.name, r.scientificName ?? "", r.family ?? "", ...r.observers].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}
