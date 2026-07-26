import { describe, it, expect } from "vitest";
import {
  checkCap,
  findDuplicates,
  findInvalidBirds,
  findSpeciesConflicts,
} from "./submission-validators";

describe("checkCap", () => {
  it("allows submissions up to the cap", () => {
    expect(checkCap(0, 31, 31).ok).toBe(true);
    expect(checkCap(28, 3, 31).ok).toBe(true);
  });

  it("rejects submissions over the cap and reports remaining", () => {
    const result = checkCap(30, 2, 31);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(1);
  });

  it("never reports negative remaining", () => {
    expect(checkCap(35, 1, 31).remaining).toBe(0);
  });

  it("cap is shared: counts from all regions matter", () => {
    // 20 birds in region A + 15 incoming in region B must fail a 31 cap
    expect(checkCap(20, 15, 31).ok).toBe(false);
  });
});

describe("findDuplicates", () => {
  it("returns only birds already submitted", () => {
    expect(findDuplicates(["Barn Owl", "Cape Teal"], ["Cape Teal", "Hamerkop"])).toEqual([
      "Cape Teal",
    ]);
  });

  it("returns empty when no overlap", () => {
    expect(findDuplicates(["Barn Owl"], ["Hamerkop"])).toEqual([]);
  });
});

describe("findInvalidBirds", () => {
  it("flags birds not in the region list", () => {
    expect(findInvalidBirds(["Barn Owl"], ["Barn Owl", "Emu"])).toEqual(["Emu"]);
  });
});

describe("findSpeciesConflicts", () => {
  it("blocks the same species under a different common name", () => {
    // Southern Fiscal (SA) vs Common Fiscal (EA) — same scientificName
    const incoming = [
      { fullName: "Common Fiscal", scientificName: "Lanius collaris" },
      { fullName: "Hamerkop", scientificName: "Scopus umbretta" },
    ];
    const alreadyTwitched = new Set(["Lanius collaris"]);
    expect(findSpeciesConflicts(incoming, alreadyTwitched)).toEqual(["Common Fiscal"]);
  });

  it("passes when no species overlap", () => {
    const incoming = [{ fullName: "Hamerkop", scientificName: "Scopus umbretta" }];
    expect(findSpeciesConflicts(incoming, new Set(["Lanius collaris"]))).toEqual([]);
  });
});
