import { describe, expect, it } from "vitest";
import { neighbours, parsePeriod, periodParam } from "./period";

const now = { year: 2027, month: 2 };

describe("parsePeriod", () => {
  it("defaults to the current month", () => {
    expect(parsePeriod(undefined, now)).toEqual({ kind: "month", year: 2027, month: 2 });
    expect(parsePeriod(["2026-11", "x"], now)).toEqual({ kind: "month", year: 2027, month: 2 });
    expect(parsePeriod("nonsense", now)).toEqual({ kind: "month", year: 2027, month: 2 });
  });

  it("reads a month or a season", () => {
    expect(parsePeriod("2026-11", now)).toEqual({ kind: "month", year: 2026, month: 11 });
    expect(parsePeriod("2026-3", now)).toEqual({ kind: "month", year: 2026, month: 3 });
    expect(parsePeriod("2026", now)).toEqual({ kind: "season", year: 2026 });
  });

  it("refuses the future, month 13 and seasons before the first", () => {
    for (const raw of ["2027-03", "2028", "2026-13", "2026-00", "2025-12", "2025"]) {
      expect(parsePeriod(raw, now)).toEqual({ kind: "month", year: 2027, month: 2 });
    }
  });
});

describe("periodParam / neighbours", () => {
  it("round-trips", () => {
    expect(periodParam({ kind: "month", year: 2026, month: 3 })).toBe("2026-03");
    expect(periodParam({ kind: "season", year: 2026 })).toBe("2026");
  });

  it("crosses the year and stops at the edges", () => {
    expect(neighbours({ kind: "month", year: 2027, month: 1 }, now)).toEqual({
      prev: { kind: "month", year: 2026, month: 12 },
      next: { kind: "month", year: 2027, month: 2 },
    });
    expect(neighbours({ kind: "month", year: 2027, month: 2 }, now).next).toBeNull();
    expect(neighbours({ kind: "month", year: 2026, month: 1 }, now).prev).toBeNull();
    expect(neighbours({ kind: "season", year: 2026 }, now)).toEqual({ prev: null, next: { kind: "season", year: 2027 } });
  });
});
