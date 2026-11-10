import { describe, expect, it } from "vitest";
import { groupOutings, previewNames, type OutingSighting } from "./outings";

let n = 0;
/** a sighting added `minute` minutes into 1 Nov 2026 */
const s = (minute: number, over: Partial<OutingSighting> = {}): OutingSighting => ({
  id: `s${n++}`,
  userId: "dale",
  playerName: "Dale",
  playerImage: null,
  bird: `Bird ${n}`,
  region: "South Africa",
  year: 2026,
  month: 11,
  isLifer: false,
  photoUrl: null,
  at: new Date(Date.UTC(2026, 10, 1, 6, minute)).toISOString(),
  ...over,
});

describe("groupOutings", () => {
  it("folds one submit into one entry, birds A to Z, lifers counted", () => {
    const [outing, ...rest] = groupOutings([
      s(0, { bird: "Hamerkop" }),
      s(0, { bird: "Cape Teal", isLifer: true }),
      s(0, { bird: "African Jacana" }),
    ]);
    expect(rest).toEqual([]);
    expect(outing.birds.map((b) => b.name)).toEqual(["African Jacana", "Cape Teal", "Hamerkop"]);
    expect(outing.lifers).toBe(1);
  });

  it("chains birds added a few minutes apart, and splits after a longer pause", () => {
    // 0, 8, 16 are each within 10 minutes of the next; 40 is a new sitting
    const outings = groupOutings([s(0), s(8), s(16), s(40)]);
    expect(outings.map((o) => o.birds.length)).toEqual([1, 3]);
    expect(outings[0].at > outings[1].at).toBe(true);
  });

  it("keeps players apart even when they add at the same moment", () => {
    const outings = groupOutings([
      s(0, { userId: "dale" }),
      s(0, { userId: "colin", playerName: "Colin" }),
      s(1, { userId: "dale" }),
      s(1, { userId: "colin", playerName: "Colin" }),
    ]);
    expect(outings.map((o) => [o.playerName, o.birds.length]).sort()).toEqual([["Colin", 2], ["Dale", 2]]);
  });

  it("keeps regions and months apart: catching up on last month is its own entry", () => {
    const outings = groupOutings([s(0), s(1, { month: 10 }), s(2, { region: "The Netherlands" })]);
    expect(outings).toHaveLength(3);
  });

  it("dates the entry by its newest bird and keeps that bird's id", () => {
    const newest = s(9);
    const [outing] = groupOutings([s(0), newest, s(5)]);
    expect(outing.id).toBe(newest.id);
    expect(outing.at).toBe(newest.at);
  });
});

describe("previewNames", () => {
  it("lists short outings in full and counts the rest of long ones", () => {
    expect(previewNames(["A", "B", "C"])).toBe("A, B, C");
    expect(previewNames(["A", "B", "C", "D", "E"])).toBe("A, B, C and 2 more");
  });
});
