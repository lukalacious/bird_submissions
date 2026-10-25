import { describe, expect, it } from "vitest";
import { calculateMonthBonus, type CheckInAnswers } from "./check-in-bonus";

const none: CheckInAnswers = { within15km: false, beyond750km: false, nonMotorisedCount: 0, liferCount: 0 };

describe("calculateMonthBonus — 2027 rules (golden birds proven by photo)", () => {
  it("is zero with nothing to count", () => {
    expect(calculateMonthBonus({ year: 2027, checkIn: none, goldenWithPhoto: 0 })).toEqual({ total: 0, breakdown: [] });
  });

  it("counts golden birds from photos, max 5, even without a check-in", () => {
    expect(calculateMonthBonus({ year: 2027, checkIn: null, goldenWithPhoto: 7 })).toEqual({
      total: 5,
      breakdown: [{ rule: "Golden birds with photos (7)", value: 5 }],
    });
  });

  it("ignores typed golden/photo counts — only photos prove golden birds", () => {
    const typed = { ...none, goldenCount: 5, photoCount: 3 };
    expect(calculateMonthBonus({ year: 2027, checkIn: typed, goldenWithPhoto: 1 }).total).toBe(1);
  });

  it("caps everything: 5 + 3 + 5 + 5 = 18 maximum", () => {
    const max = { within15km: true, beyond750km: false, nonMotorisedCount: 99, liferCount: 9 };
    expect(calculateMonthBonus({ year: 2027, checkIn: max, goldenWithPhoto: 9 }).total).toBe(18);
  });

  it("applies the 750km penalty and can go negative", () => {
    expect(calculateMonthBonus({ year: 2027, checkIn: { ...none, beyond750km: true }, goldenWithPhoto: 0 }).total).toBe(-3);
  });

  it("gives 1 per 10 non-motorised birds, rounding down", () => {
    expect(calculateMonthBonus({ year: 2027, checkIn: { ...none, nonMotorisedCount: 19 }, goldenWithPhoto: 0 }).total).toBe(1);
  });
});

describe("calculateMonthBonus — 2026 keeps v1's rules", () => {
  it("uses the self-reported golden and photo counts, so history never changes", () => {
    const v1 = { ...none, goldenCount: 2, photoCount: 1 };
    expect(calculateMonthBonus({ year: 2026, checkIn: v1, goldenWithPhoto: 0 })).toEqual({
      total: 3,
      breakdown: [
        { rule: "Golden birds (2)", value: 2 },
        { rule: "Photos (1)", value: 1 },
      ],
    });
  });

  it("v1 maximum is still 21", () => {
    const max = { within15km: true, beyond750km: false, nonMotorisedCount: 99, liferCount: 9, goldenCount: 9, photoCount: 9 };
    expect(calculateMonthBonus({ year: 2026, checkIn: max, goldenWithPhoto: 0 }).total).toBe(21);
  });
});
