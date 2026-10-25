import { describe, expect, it } from "vitest";
import { rankLeaderboard } from "./leaderboard-rank";

describe("rankLeaderboard", () => {
  it("sorts by birds desc, then jokers desc, then userId", () => {
    const ranked = rankLeaderboard(
      [
        { userId: "c", birds: 10 },
        { userId: "a", birds: 10 },
        { userId: "b", birds: 10 },
        { userId: "d", birds: 25 },
      ],
      [
        { userId: "a", jokers: 2 },
        { userId: "b", jokers: 2 },
        { userId: "c", jokers: 5 },
      ]
    );

    expect(ranked.map((r) => r.userId)).toEqual(["d", "c", "a", "b"]);
  });

  it("includes users who have birds but no joker rows", () => {
    const ranked = rankLeaderboard([{ userId: "birdsOnly", birds: 3 }], []);
    expect(ranked).toEqual([{ userId: "birdsOnly", birds: 3, jokers: 0 }]);
  });

  it("includes users who have jokers but no submissions, with 0 birds", () => {
    const ranked = rankLeaderboard(
      [{ userId: "x", birds: 1 }],
      [{ userId: "jokersOnly", jokers: 4 }]
    );
    expect(ranked.map((r) => r.userId)).toEqual(["x", "jokersOnly"]);
    expect(ranked[1]).toEqual({ userId: "jokersOnly", birds: 0, jokers: 4 });
  });

  it("does not let jokers outrank birds", () => {
    const ranked = rankLeaderboard(
      [
        { userId: "fewBirdsManyJokers", birds: 2 },
        { userId: "manyBirdsNoJokers", birds: 9 },
      ],
      [{ userId: "fewBirdsManyJokers", jokers: 50 }]
    );
    expect(ranked[0].userId).toBe("manyBirdsNoJokers");
  });
});
