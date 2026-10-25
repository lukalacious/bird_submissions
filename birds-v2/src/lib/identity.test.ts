import { describe, expect, it } from "vitest";
import { findLikelyDuplicates, normalizeEmail } from "./identity";

describe("normalizeEmail", () => {
  it("strips Gmail dots — the Steve Spark case", () => {
    expect(normalizeEmail("Steve.Spark60@gmail.com")).toBe("stevespark60@gmail.com");
  });

  it("strips +tags and folds googlemail", () => {
    expect(normalizeEmail("bob+birds@googlemail.com")).toBe("bob@gmail.com");
  });

  it("keeps dots for non-Gmail domains", () => {
    expect(normalizeEmail("colin.jackson@arocha.org")).toBe("colin.jackson@arocha.org");
  });
});

describe("findLikelyDuplicates", () => {
  const players = [
    { id: "colin", emailNormalized: "chwjackson@gmail.com", name: "Colin Jackson" },
    { id: "steve", emailNormalized: "stevespark60@gmail.com", name: "Steve Spark" },
    { id: "annette", emailNormalized: "annette@example.com", name: "Annette Smith" },
  ];

  it("flags the same mailbox as strong", () => {
    const m = findLikelyDuplicates({ emailNormalized: normalizeEmail("steve.spark60@gmail.com"), name: "S" }, players);
    expect(m).toEqual([{ id: "steve", strength: "strong", reason: "same email address" }]);
  });

  it("flags the same full name on a work account — the Colin case", () => {
    const m = findLikelyDuplicates(
      { emailNormalized: "colin.jackson@arocha.org", name: "Colin Jackson" },
      players
    );
    expect(m[0]).toMatchObject({ id: "colin", strength: "strong" });
  });

  it("catches a surname in the other account's email", () => {
    const m = findLikelyDuplicates({ emailNormalized: "cj@work.org", name: "C. Jackson" }, players);
    expect(m.map((x) => x.id)).toContain("colin");
  });

  it("does not match unrelated people", () => {
    expect(findLikelyDuplicates({ emailNormalized: "new@x.com", name: "Thandi Nkosi" }, players)).toEqual([]);
  });

  it("does not match on first name alone", () => {
    expect(findLikelyDuplicates({ emailNormalized: "s@x.com", name: "Steve Brown" }, players)).toEqual([]);
  });
});
