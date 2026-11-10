import { planElimination, type JokerMonth } from "./elimination";

/**
 * Where a player stands in a month that hasn't closed yet: what the
 * month-end job would do if it ran on today's numbers. Built on the same
 * planElimination the job uses, so the forecast can't disagree with it.
 */

/** Consecutive months with no birds, counting back from `month` to the month the player joined. */
export function emptyStreak(birdsInMonth: (month: number) => number, month: number, joinedMonth: number): number {
  let streak = 0;
  for (let m = month; m >= joinedMonth && birdsInMonth(m) === 0; m--) streak++;
  return streak;
}

export type Standing =
  | { kind: "out"; eliminationMonth: number | null }
  /** first month on record: it doesn't count towards elimination */
  | { kind: "exempt" }
  | { kind: "safe" }
  | { kind: "covered"; shortfall: number }
  | { kind: "at-risk"; shortfall: number; reason: "not-enough-jokers" | "empty-months"; birdsToSafety: number };

export function forecastStanding(input: {
  month: number;
  threshold: number;
  status: { isEliminated: boolean; eliminationMonth: number | null; joinedMonth: number } | null;
  birdsInMonth: (month: number) => number;
  /** jokers from earlier months of the season */
  jokerMonths: JokerMonth[];
  maxEmptyMonths: number | null;
  poolFractions: boolean;
}): Standing {
  const { month, status, threshold } = input;
  if (status?.isEliminated) return { kind: "out", eliminationMonth: status.eliminationMonth };
  if (!status || status.joinedMonth >= month) return { kind: "exempt" };

  const planWith = (extraBirds: number) => {
    const birdCount = input.birdsInMonth(month) + extraBirds;
    return planElimination({
      birdCount,
      threshold,
      jokerMonths: input.jokerMonths,
      emptyStreak: emptyStreak((m) => (m === month ? birdCount : input.birdsInMonth(m)), month, status.joinedMonth),
      maxEmptyMonths: input.maxEmptyMonths,
      poolFractions: input.poolFractions,
    });
  };

  const plan = planWith(0);
  if (plan.outcome === "safe") return { kind: "safe" };
  if (plan.outcome === "covered") return { kind: "covered", shortfall: plan.shortfall };

  // fewest extra birds that turn "eliminated" into safe or covered
  let birdsToSafety = 1;
  while (birdsToSafety < plan.shortfall && planWith(birdsToSafety).outcome === "eliminated") birdsToSafety++;
  return { kind: "at-risk", shortfall: plan.shortfall, reason: plan.reason, birdsToSafety };
}
