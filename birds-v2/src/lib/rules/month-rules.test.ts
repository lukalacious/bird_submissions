import { describe, expect, it } from "vitest";
import { resolveMonthRules } from "./month-rules";

const season = { maxBirdsPerPeriod: 31, eliminationThreshold: 31 };

describe("resolveMonthRules", () => {
  it("uses the season values when the month has no override", () => {
    expect(resolveMonthRules(season, null)).toEqual({ maxBirds: 31, eliminationThreshold: 31 });
  });

  it("a capped month with no threshold of its own needs its cap, not the season's 31", () => {
    expect(resolveMonthRules(season, { maxBirdsPerPeriod: 30, eliminationThreshold: null })).toEqual({ maxBirds: 30, eliminationThreshold: 30 });
  });

  it("keeps an explicit monthly threshold", () => {
    expect(resolveMonthRules(season, { maxBirdsPerPeriod: 28, eliminationThreshold: 25 })).toEqual({ maxBirds: 28, eliminationThreshold: 25 });
  });

  it("never asks for more birds than the month allows", () => {
    expect(resolveMonthRules(season, { maxBirdsPerPeriod: 28, eliminationThreshold: 30 })).toEqual({ maxBirds: 28, eliminationThreshold: 28 });
    expect(resolveMonthRules({ maxBirdsPerPeriod: 30, eliminationThreshold: 31 }, null)).toEqual({ maxBirds: 30, eliminationThreshold: 30 });
  });
});
