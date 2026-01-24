// App launch date - first 2 months everyone is Fledgling
export const APP_LAUNCH_DATE = new Date("2026-01-01");

// Level definitions - quartile based
// Bottom 25% = Fledgling, Middle 50% = Birder, Top 25% = Twitcher
export const LEVELS = [
  { level: 1, name: "Fledgling", icon: "🐣", percentileMin: 0, percentileMax: 25 },
  { level: 2, name: "Birder", icon: "🔭", percentileMin: 25, percentileMax: 75 },
  { level: 3, name: "Twitcher", icon: "🦅", percentileMin: 75, percentileMax: 100 },
] as const;

// Helper to get level by percentile
export function getLevelByPercentile(percentile: number): (typeof LEVELS)[number] {
  if (percentile >= 75) return LEVELS[2]; // Twitcher
  if (percentile >= 25) return LEVELS[1]; // Birder
  return LEVELS[0]; // Fledgling
}

// Check if we're still in the initial 2-month period where everyone is Fledgling
export function isInInitialPeriod(): boolean {
  const now = new Date();
  const twoMonthsAfterLaunch = new Date(APP_LAUNCH_DATE);
  twoMonthsAfterLaunch.setMonth(twoMonthsAfterLaunch.getMonth() + 2);
  return now < twoMonthsAfterLaunch;
}
