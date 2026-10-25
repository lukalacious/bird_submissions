import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { maskEmail } = await import("./players");

describe("maskEmail", () => {
  it("keeps first and last character of the mailbox", () => {
    expect(maskEmail("colin.jackson@arocha.org")).toBe("c•••n@arocha.org");
  });

  it("handles very short mailboxes", () => {
    expect(maskEmail("jo@x.com")).toBe("j•••@x.com");
  });
});
