import { describe, expect, it } from "vitest";
import { checkInFromBreakdown, looseName, nameVariants } from "./migration-helpers";

describe("looseName", () => {
  it("ignores case, hyphens and spaces", () => {
    expect(looseName("Black-Collared Barbet")).toBe(looseName("Black-collared barbet"));
  });
});

describe("nameVariants", () => {
  it("tries the alias in place of the word before it", () => {
    expect(nameVariants("Common (Dark-capped) bulbul")).toContain("Dark-capped bulbul");
  });

  it("tries the name without the note", () => {
    expect(nameVariants("Chestnut-vented Tit-Babbler (Warbler)")).toContain("Chestnut-vented Tit-Babbler");
  });

  it("returns plain names unchanged", () => {
    expect(nameVariants("Cape Teal")).toEqual(["Cape Teal"]);
  });
});

describe("checkInFromBreakdown", () => {
  it("rebuilds answers from v1 bonus rules and skips photo awards", () => {
    expect(
      checkInFromBreakdown([
        { rule: "All within 15km", value: 5 },
        { rule: "Non-motorised (23 birds)", value: 2 },
        { rule: "Golden birds (2)", value: 2 },
        { rule: "Photo award: Cape Batis", value: 1 },
      ])
    ).toEqual({
      within15km: true,
      beyond750km: false,
      nonMotorisedCount: 23,
      liferCount: 0,
      goldenCount: 2,
      photoCount: 0,
    });
  });

  it("returns null when there was no form bonus", () => {
    expect(checkInFromBreakdown([{ rule: "Photo award: Cape Batis", value: 1 }])).toBeNull();
    expect(checkInFromBreakdown(null)).toBeNull();
  });
});
