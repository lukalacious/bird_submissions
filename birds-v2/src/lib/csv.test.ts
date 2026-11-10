import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("Albatross, Amsterdam")).toBe('"Albatross, Amsterdam"');
    expect(csvCell('the "big" one')).toBe('"the ""big"" one"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });

  it("stops a cell being run as a formula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5")).toBe("'-5");
  });
});
