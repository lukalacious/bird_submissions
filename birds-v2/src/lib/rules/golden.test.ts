import { describe, expect, it } from "vitest";
import { goldenPhotoMonth } from "./golden";

const oct = { year: 2027, month: 10 };
const sep = { year: 2027, month: 9 };
const golden = new Map([
  ["2027-10", new Set(["teal", "barbet"])],
  ["2027-9", new Set(["owl"])],
]);
const goldenFor = (m: { year: number; month: number }) => golden.get(`${m.year}-${m.month}`) ?? new Set<string>();

describe("goldenPhotoMonth", () => {
  it("allows a photo of this month's golden bird", () => {
    expect(goldenPhotoMonth("teal", [oct], goldenFor)).toEqual(oct);
  });

  it("refuses any bird that isn't golden", () => {
    expect(goldenPhotoMonth("sparrow", [oct], goldenFor)).toBeNull();
  });

  it("refuses custom birds", () => {
    expect(goldenPhotoMonth(null, [oct], goldenFor)).toBeNull();
  });

  it("files a grace-window photo under last month when it was last month's golden bird", () => {
    expect(goldenPhotoMonth("owl", [oct, sep], goldenFor)).toEqual(sep);
  });

  it("no golden birds set = no photos", () => {
    expect(goldenPhotoMonth("teal", [{ year: 2027, month: 11 }], goldenFor)).toBeNull();
  });
});
