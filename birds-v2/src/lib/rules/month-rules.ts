/**
 * Bird cap and elimination threshold for one month.
 *
 * A month with its own cap and no threshold of its own needs that cap, as in
 * v1: a 30-day month capped at 30 must not demand the season's 31. The
 * threshold can never exceed the cap, or nobody could be safe without a joker.
 */
export function resolveMonthRules(
  season: { maxBirdsPerPeriod: number; eliminationThreshold: number },
  monthly: { maxBirdsPerPeriod: number; eliminationThreshold: number | null } | null
): { maxBirds: number; eliminationThreshold: number } {
  const maxBirds = monthly?.maxBirdsPerPeriod ?? season.maxBirdsPerPeriod;
  const threshold = monthly ? (monthly.eliminationThreshold ?? monthly.maxBirdsPerPeriod) : season.eliminationThreshold;
  return { maxBirds, eliminationThreshold: Math.min(threshold, maxBirds) };
}
