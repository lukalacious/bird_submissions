import { describe, expect, it } from "vitest";
import { calculateJokersFromGroup, computeGroupJokers, jokerHint } from "./jokers";

describe("calculateJokersFromGroup", () => {
  it("gives no jokers below 3 birds", () => {
    expect(calculateJokersFromGroup(0)).toBe(0);
    expect(calculateJokersFromGroup(2)).toBe(0);
  });

  it("gives 1 joker at 3 birds, +0.5 per extra", () => {
    expect(calculateJokersFromGroup(3)).toBe(1);
    expect(calculateJokersFromGroup(4)).toBe(1.5);
    expect(calculateJokersFromGroup(6)).toBe(2.5);
  });

  it("matches known cases from the challenge", () => {
    // Shaun's May full house: 11 warblers = 1 + 8 * 0.5 = 5
    expect(calculateJokersFromGroup(11)).toBe(5);
  });
});

describe("computeGroupJokers", () => {
  it("counts per group and ignores ungrouped birds", () => {
    const result = computeGroupJokers([
      "Shrike", "Shrike", "Shrike", "Shrike",
      "Pigeon", "Pigeon",
      null, null, null,
    ]);
    expect(result.total).toBe(1.5);
    expect(result.breakdown).toEqual([{ groupName: "Shrike", birdCount: 4, jokersEarned: 1.5 }]);
  });

  it("sorts breakdown by jokers earned", () => {
    const groups = [...Array(3).fill("Owl"), ...Array(5).fill("Warbler")];
    expect(computeGroupJokers(groups).breakdown.map((b) => b.groupName)).toEqual(["Warbler", "Owl"]);
  });
});

describe("jokerHint", () => {
  it("counts birds needed to the first joker", () => {
    expect(jokerHint(1)).toEqual({ birdsNeeded: 2, reward: 1 });
  });

  it("each extra bird after 3 is worth half a joker", () => {
    expect(jokerHint(3)).toEqual({ birdsNeeded: 1, reward: 0.5 });
  });
});
