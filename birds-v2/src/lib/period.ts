import { nextMonth, previousMonth, type ChallengeMonth } from "@/lib/challenge-time";

/** First season in the database (v1's 2026 season is migrated in). */
export const FIRST_SEASON = 2026;

/** What a Sightings view covers: one challenge month, or a whole season. */
export type Period = { kind: "month"; year: number; month: number } | { kind: "season"; year: number };

const isAfter = (a: ChallengeMonth, b: ChallengeMonth) => a.year > b.year || (a.year === b.year && a.month > b.month);

/**
 * Reads the `m` URL parameter: "2026-11" is a month, "2026" a season.
 * Anything missing, malformed, in the future or before the first season
 * falls back to the current month, so a bad link never errors.
 */
export function parsePeriod(raw: string | string[] | undefined, current: ChallengeMonth): Period {
  const fallback: Period = { kind: "month", ...current };
  if (typeof raw !== "string") return fallback;

  const season = /^(\d{4})$/.exec(raw);
  if (season) {
    const year = Number(season[1]);
    return year >= FIRST_SEASON && year <= current.year ? { kind: "season", year } : fallback;
  }
  const month = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (month) {
    const target = { year: Number(month[1]), month: Number(month[2]) };
    if (target.month < 1 || target.month > 12 || target.year < FIRST_SEASON || isAfter(target, current)) return fallback;
    return { kind: "month", ...target };
  }
  return fallback;
}

export function periodParam(p: Period): string {
  return p.kind === "season" ? String(p.year) : `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/** The periods either side of `p`, or null where there is nothing to show. */
export function neighbours(p: Period, current: ChallengeMonth): { prev: Period | null; next: Period | null } {
  if (p.kind === "season") {
    return {
      prev: p.year > FIRST_SEASON ? { kind: "season", year: p.year - 1 } : null,
      next: p.year < current.year ? { kind: "season", year: p.year + 1 } : null,
    };
  }
  const before = previousMonth(p);
  const after = nextMonth(p);
  return {
    prev: before.year >= FIRST_SEASON ? { kind: "month", ...before } : null,
    next: isAfter(after, current) ? null : { kind: "month", ...after },
  };
}
