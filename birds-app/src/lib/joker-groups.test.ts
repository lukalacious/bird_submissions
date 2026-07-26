import { describe, it, expect } from "vitest";
import { calculateJokersFromGroup } from "./joker-groups";

describe("calculateJokersFromGroup", () => {
  it("gives no jokers below 3 birds", () => {
    expect(calculateJokersFromGroup(0)).toBe(0);
    expect(calculateJokersFromGroup(1)).toBe(0);
    expect(calculateJokersFromGroup(2)).toBe(0);
  });

  it("gives 1 joker at exactly 3 birds", () => {
    expect(calculateJokersFromGroup(3)).toBe(1);
  });

  it("adds 0.5 per bird beyond 3", () => {
    expect(calculateJokersFromGroup(4)).toBe(1.5);
    expect(calculateJokersFromGroup(5)).toBe(2);
    expect(calculateJokersFromGroup(6)).toBe(2.5);
  });

  it("matches known cases from the challenge", () => {
    // Shaun's May full house: 11 warblers = 1 + 8 * 0.5 = 5
    expect(calculateJokersFromGroup(11)).toBe(5);
  });
});
