import { describe, expect, it } from "vitest";
import { calculateCheckInBonus, type CheckInAnswers } from "./check-in-bonus";

const none: CheckInAnswers = {
  within15km: false,
  beyond750km: false,
  nonMotorisedCount: 0,
  liferCount: 0,
  goldenCount: 0,
  photoCount: 0,
};

describe("calculateCheckInBonus", () => {
  it("is zero with an empty breakdown when nothing applies", () => {
    expect(calculateCheckInBonus(none)).toEqual({ total: 0, breakdown: [] });
  });

  it("caps every rule — maximum possible is 21", () => {
    const max = calculateCheckInBonus({
      within15km: true,
      beyond750km: false,
      nonMotorisedCount: 99,
      liferCount: 9,
      goldenCount: 9,
      photoCount: 9,
    });
    expect(max.total).toBe(21);
  });

  it("applies the 750km penalty and can go negative", () => {
    expect(calculateCheckInBonus({ ...none, beyond750km: true }).total).toBe(-3);
  });

  it("gives 1 per 10 non-motorised birds, rounding down", () => {
    expect(calculateCheckInBonus({ ...none, nonMotorisedCount: 19 }).total).toBe(1);
  });
});
