/**
 * Month-end elimination for one player (pure — the cron fetches and writes).
 *
 * A player needs `threshold` birds in the month. Each missing bird costs one
 * joker, taken from earlier months of the season, oldest first. Not enough
 * jokers → eliminated.
 *
 * Two rules await Dale's ruling and are settings:
 * - poolFractions: v1 only spent from a month holding ≥ 1 whole joker, so
 *   0.5 + 0.5 from two months couldn't be used. Pooled = they can.
 * - maxEmptyMonths: v1 let jokers cover a completely empty month forever
 *   (~8 inactive players survived that way). With a limit, that many empty
 *   months in a row eliminates regardless of jokers. null = v1 behaviour.
 */

export interface JokerMonth {
  year: number;
  month: number;
  available: number; // totalJokers − usedJokers
}

export interface JokerDraw {
  fromYear: number;
  fromMonth: number;
  amount: number;
}

export type EliminationPlan =
  | { outcome: "safe" }
  | { outcome: "covered"; shortfall: number; draws: JokerDraw[] }
  | { outcome: "eliminated"; shortfall: number; reason: "not-enough-jokers" | "empty-months" };

export function planElimination(input: {
  birdCount: number;
  threshold: number;
  /** earlier months of the season, any order */
  jokerMonths: JokerMonth[];
  /** consecutive months with zero birds, ending with this one */
  emptyStreak: number;
  maxEmptyMonths: number | null;
  poolFractions: boolean;
}): EliminationPlan {
  const shortfall = Math.max(0, input.threshold - input.birdCount);
  if (shortfall === 0) return { outcome: "safe" };

  if (input.maxEmptyMonths !== null && input.emptyStreak >= input.maxEmptyMonths) {
    return { outcome: "eliminated", shortfall, reason: "empty-months" };
  }

  const months = [...input.jokerMonths]
    .filter((m) => m.available > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const draws: JokerDraw[] = [];
  let needed = shortfall;

  if (input.poolFractions) {
    for (const m of months) {
      if (needed <= 0) break;
      const amount = Math.min(m.available, needed);
      draws.push({ fromYear: m.year, fromMonth: m.month, amount });
      needed = round(needed - amount);
    }
  } else {
    // v1: whole jokers only, each from a month that still has ≥ 1
    const left = new Map(months.map((m) => [`${m.year}-${m.month}`, m.available]));
    while (needed > 0) {
      const source = months.find((m) => (left.get(`${m.year}-${m.month}`) ?? 0) >= 1);
      if (!source) break;
      const key = `${source.year}-${source.month}`;
      left.set(key, round(left.get(key)! - 1));
      const last = draws.at(-1);
      if (last && last.fromYear === source.year && last.fromMonth === source.month) last.amount += 1;
      else draws.push({ fromYear: source.year, fromMonth: source.month, amount: 1 });
      needed -= 1;
    }
  }

  return needed > 0
    ? { outcome: "eliminated", shortfall, reason: "not-enough-jokers" }
    : { outcome: "covered", shortfall, draws };
}

// Joker values are halves; keep float noise out of comparisons
const round = (n: number) => Math.round(n * 100) / 100;
