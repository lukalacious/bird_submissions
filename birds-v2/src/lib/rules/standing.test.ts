import { describe, expect, it } from "vitest";
import { emptyStreak, forecastStanding } from "./standing";

const joined = { isEliminated: false, eliminationMonth: null, joinedMonth: 1 };
const birds = (byMonth: Record<number, number>) => (m: number) => byMonth[m] ?? 0;
const base = { month: 5, threshold: 30, maxEmptyMonths: 2 as number | null, poolFractions: true, jokerMonths: [] };

describe("emptyStreak", () => {
  it("counts back to the joining month and stops at the first month with birds", () => {
    expect(emptyStreak(birds({ 3: 4 }), 5, 1)).toBe(2);
    expect(emptyStreak(birds({}), 5, 4)).toBe(2);
    expect(emptyStreak(birds({ 5: 1 }), 5, 1)).toBe(0);
  });
});

describe("forecastStanding", () => {
  it("reports eliminated players as out", () => {
    const status = { isEliminated: true, eliminationMonth: 4, joinedMonth: 1 };
    expect(forecastStanding({ ...base, status, birdsInMonth: birds({}) })).toEqual({ kind: "out", eliminationMonth: 4 });
  });

  it("exempts a player's first month", () => {
    expect(forecastStanding({ ...base, status: null, birdsInMonth: birds({}) })).toEqual({ kind: "exempt" });
    expect(forecastStanding({ ...base, status: { ...joined, joinedMonth: 5 }, birdsInMonth: birds({}) })).toEqual({ kind: "exempt" });
  });

  it("is safe at the threshold, covered when jokers make up the gap", () => {
    expect(forecastStanding({ ...base, status: joined, birdsInMonth: birds({ 5: 30 }) })).toEqual({ kind: "safe" });
    expect(
      forecastStanding({ ...base, status: joined, birdsInMonth: birds({ 5: 27 }), jokerMonths: [{ year: 2027, month: 2, available: 3.5 }] })
    ).toEqual({ kind: "covered", shortfall: 3 });
  });

  it("says how many more birds make a player safe when jokers fall short", () => {
    expect(
      forecastStanding({ ...base, status: joined, birdsInMonth: birds({ 4: 30, 5: 20 }), jokerMonths: [{ year: 2027, month: 2, available: 4 }] })
    ).toEqual({ kind: "at-risk", shortfall: 10, reason: "not-enough-jokers", birdsToSafety: 6 });
  });

  it("one bird breaks an empty-month streak when jokers cover the rest", () => {
    const jokerMonths = [{ year: 2027, month: 1, available: 40 }];
    expect(forecastStanding({ ...base, status: joined, birdsInMonth: birds({ 3: 30 }), jokerMonths })).toEqual({
      kind: "at-risk",
      shortfall: 30,
      reason: "empty-months",
      birdsToSafety: 1,
    });
    // with the v1 rule (no limit) the same player is simply covered
    expect(forecastStanding({ ...base, maxEmptyMonths: null, status: joined, birdsInMonth: birds({ 3: 30 }), jokerMonths })).toEqual({
      kind: "covered",
      shortfall: 30,
    });
  });
});
