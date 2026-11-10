import { describe, expect, it } from "vitest";
import { validateProfile } from "./profile";

describe("validateProfile", () => {
  it("trims, collapses spaces and treats blank as cleared", () => {
    expect(validateProfile({ name: "  Dale   Roberts ", username: "" })).toEqual({ ok: true, name: "Dale Roberts", username: null });
    expect(validateProfile({ name: "", username: " fish_eagle-7 " })).toEqual({ ok: true, name: null, username: "fish_eagle-7" });
  });

  it("rejects names and display names that are too short, too long or oddly spelt", () => {
    expect(validateProfile({ name: "D", username: "" })).toMatchObject({ ok: false, field: "name" });
    expect(validateProfile({ name: "x".repeat(51), username: "" })).toMatchObject({ ok: false, field: "name" });
    expect(validateProfile({ name: "Dale", username: "ab" })).toMatchObject({ ok: false, field: "username" });
    expect(validateProfile({ name: "Dale", username: "x".repeat(31) })).toMatchObject({ ok: false, field: "username" });
    expect(validateProfile({ name: "Dale", username: "fish eagle" })).toMatchObject({ ok: false, field: "username" });
    expect(validateProfile({ name: "Dale", username: "<script>" })).toMatchObject({ ok: false, field: "username" });
  });
});
