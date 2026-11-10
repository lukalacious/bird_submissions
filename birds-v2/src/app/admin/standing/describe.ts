import type { Standing } from "@/lib/rules/standing";

const birds = (n: number) => `${n} ${n === 1 ? "bird" : "birds"}`;

/** One admin-facing sentence for a month-end forecast. */
export function describeStanding(s: Standing, birdCount: number, threshold: number, monthName: string): string {
  switch (s.kind) {
    case "out":
      return "Out of this season.";
    case "exempt":
      return `First month: ${birds(birdCount)} so far, and it doesn't count towards elimination.`;
    case "safe":
      return `Safe for ${monthName} with ${birds(birdCount)} (needs ${threshold}).`;
    case "covered":
      return `${birds(birdCount)} in ${monthName}, ${s.shortfall} short of ${threshold}. Jokers cover it at month-end.`;
    case "at-risk":
      return s.reason === "empty-months"
        ? `No birds for too many months in a row. Out at month-end unless they twitch ${birds(s.birdsToSafety)}.`
        : `${birds(birdCount)} in ${monthName}, ${s.shortfall} short of ${threshold}, and not enough jokers. Out at month-end unless they twitch ${s.birdsToSafety} more.`;
  }
}

export const STANDING_LABEL: Record<Standing["kind"], string> = {
  out: "Out",
  exempt: "First month",
  safe: "Safe",
  covered: "Jokers cover it",
  "at-risk": "At risk",
};
