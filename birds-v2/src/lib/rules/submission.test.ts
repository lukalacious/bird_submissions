import { describe, expect, it } from "vitest";
import { checkCap, findSpeciesConflicts } from "./submission";

describe("checkCap", () => {
  it("allows submissions up to the cap", () => {
    expect(checkCap(0, 31, 31).ok).toBe(true);
    expect(checkCap(28, 3, 31).ok).toBe(true);
  });

  it("rejects over the cap and reports remaining", () => {
    expect(checkCap(30, 2, 31)).toEqual({ ok: false, remaining: 1 });
  });

  it("never reports negative remaining", () => {
    expect(checkCap(35, 1, 31).remaining).toBe(0);
  });
});

describe("findSpeciesConflicts", () => {
  const fiscalEA = { birdId: "b1", speciesId: "lanius-collaris", displayName: "Common Fiscal" };
  const hamerkop = { birdId: "b2", speciesId: "scopus-umbretta", displayName: "Hamerkop" };

  it("blocks the same species under a different regional name", () => {
    expect(findSpeciesConflicts([fiscalEA, hamerkop], new Set(["lanius-collaris"]))).toEqual([
      "Common Fiscal",
    ]);
  });

  it("blocks the same species twice in one submission", () => {
    const fiscalSA = { birdId: "b3", speciesId: "lanius-collaris", displayName: "Southern Fiscal" };
    expect(findSpeciesConflicts([fiscalEA, fiscalSA], new Set())).toEqual(["Southern Fiscal"]);
  });

  it("passes when nothing overlaps", () => {
    expect(findSpeciesConflicts([hamerkop], new Set(["lanius-collaris"]))).toEqual([]);
  });
});
