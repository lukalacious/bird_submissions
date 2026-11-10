import { describe, expect, it } from "vitest";
import { isReadOnly, readOnlyError, READ_ONLY_MESSAGE } from "./read-only";

describe("isReadOnly", () => {
  it("is off unless READ_ONLY is exactly '1'", () => {
    expect(isReadOnly({})).toBe(false);
    expect(isReadOnly({ READ_ONLY: "" })).toBe(false);
    expect(isReadOnly({ READ_ONLY: "true" })).toBe(false);
    expect(isReadOnly({ READ_ONLY: "0" })).toBe(false);
    expect(isReadOnly({ READ_ONLY: "1" })).toBe(true);
  });
});

describe("readOnlyError", () => {
  it("matches the shape server actions return", () => {
    expect(readOnlyError()).toEqual({ success: false, error: READ_ONLY_MESSAGE });
  });
});
