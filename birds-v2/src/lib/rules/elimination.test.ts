import { describe, expect, it } from "vitest";
import { planElimination } from "./elimination";

const base = { threshold: 31, emptyStreak: 0, maxEmptyMonths: null, poolFractions: true };
const m = (month: number, available: number) => ({ year: 2026, month, available });

describe("planElimination", () => {
  it("is safe at or above the threshold", () => {
    expect(planElimination({ ...base, birdCount: 31, jokerMonths: [] })).toEqual({ outcome: "safe" });
  });

  it("covers a shortfall from the oldest months first", () => {
    expect(planElimination({ ...base, birdCount: 28, jokerMonths: [m(3, 5), m(1, 2)] })).toEqual({
      outcome: "covered",
      shortfall: 3,
      draws: [
        { fromYear: 2026, fromMonth: 1, amount: 2 },
        { fromYear: 2026, fromMonth: 3, amount: 1 },
      ],
    });
  });

  it("eliminates when jokers run out", () => {
    expect(planElimination({ ...base, birdCount: 25, jokerMonths: [m(1, 2)] })).toEqual({
      outcome: "eliminated",
      shortfall: 6,
      reason: "not-enough-jokers",
    });
  });

  describe("half jokers (Dale ruling #2)", () => {
    const halves = [m(1, 0.5), m(2, 0.5)];

    it("pooled: 0.5 + 0.5 covers one missing bird", () => {
      expect(planElimination({ ...base, birdCount: 30, jokerMonths: halves })).toMatchObject({
        outcome: "covered",
        draws: [
          { fromMonth: 1, amount: 0.5 },
          { fromMonth: 2, amount: 0.5 },
        ],
      });
    });

    it("v1 behaviour: halves in different months can't be spent", () => {
      expect(planElimination({ ...base, poolFractions: false, birdCount: 30, jokerMonths: halves })).toMatchObject({
        outcome: "eliminated",
      });
    });

    it("v1 behaviour: whole jokers from one month are grouped into one draw", () => {
      expect(planElimination({ ...base, poolFractions: false, birdCount: 28, jokerMonths: [m(1, 2.5), m(2, 4)] })).toEqual({
        outcome: "covered",
        shortfall: 3,
        draws: [
          { fromYear: 2026, fromMonth: 1, amount: 2 },
          { fromYear: 2026, fromMonth: 2, amount: 1 },
        ],
      });
    });
  });

  describe("empty months (Dale ruling #3)", () => {
    const rich = [m(1, 100)];

    it("v1 behaviour: jokers cover an empty month indefinitely", () => {
      expect(planElimination({ ...base, birdCount: 0, emptyStreak: 6, jokerMonths: rich })).toMatchObject({ outcome: "covered" });
    });

    it("with a limit of 2: the second empty month in a row eliminates", () => {
      const limited = { ...base, maxEmptyMonths: 2, birdCount: 0, jokerMonths: rich };
      expect(planElimination({ ...limited, emptyStreak: 1 })).toMatchObject({ outcome: "covered" });
      expect(planElimination({ ...limited, emptyStreak: 2 })).toEqual({ outcome: "eliminated", shortfall: 31, reason: "empty-months" });
    });
  });
});
