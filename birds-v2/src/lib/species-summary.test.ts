import { describe, expect, it } from "vitest";
import { filterSpecies, sortSpecies, summariseSpecies, type SightingInput } from "./species-summary";

let tick = 0;
const s = (over: Partial<SightingInput>): SightingInput => ({
  userId: "u1",
  playerName: "Dale",
  speciesId: "sp1",
  name: "Malachite Kingfisher",
  scientificName: "Corythornis cristatus",
  family: "Kingfishers",
  month: 11,
  isLifer: false,
  at: new Date(Date.UTC(2026, 10, 1, 0, tick++)).toISOString(),
  ...over,
});

describe("summariseSpecies", () => {
  it("groups by species across regional names and counts distinct players", () => {
    const { rows, sightings, players } = summariseSpecies([
      s({ userId: "u1", playerName: "Dale", speciesId: "fiscal", name: "Southern Fiscal", family: "Shrikes" }),
      s({ userId: "u2", playerName: "Colin", speciesId: "fiscal", name: "Common Fiscal", family: "Shrikes" }),
      s({ userId: "u3", playerName: "Luke", speciesId: "fiscal", name: "Southern Fiscal", family: "Shrikes", isLifer: true }),
      s({ userId: "u1", playerName: "Dale", speciesId: "sp1" }),
    ]);
    expect(sightings).toBe(4);
    expect(players).toBe(3);
    expect(rows.map((r) => r.name)).toEqual(["Southern Fiscal", "Malachite Kingfisher"]);
    expect(rows[0].observers).toEqual(["Dale", "Colin", "Luke"]);
    expect(rows[0].lifers).toBe(1);
    expect(rows[0].first.playerName).toBe("Dale");
  });

  it("merges unlisted birds by name, ignoring case", () => {
    const { rows } = summariseSpecies([
      s({ userId: "u1", speciesId: null, name: "Feral Peacock", scientificName: null, family: null }),
      s({ userId: "u2", playerName: "Colin", speciesId: null, name: "feral peacock", scientificName: null, family: null }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].observers).toHaveLength(2);
    expect(rows[0].familyJokerHolders).toBe(0);
  });

  it("counts family joker holders per month, not across months", () => {
    const kingfishers = (userId: string, month: number, n: number) =>
      Array.from({ length: n }, (_, i) => s({ userId, playerName: userId, speciesId: `k${i}`, name: `Kingfisher ${i}`, month }));
    const { rows } = summariseSpecies([
      ...kingfishers("dale", 11, 3), // joker
      ...kingfishers("colin", 11, 2), // one short
      s({ userId: "luke", playerName: "luke", speciesId: "k0", name: "Kingfisher 0", month: 10 }),
      s({ userId: "luke", playerName: "luke", speciesId: "k1", name: "Kingfisher 1", month: 10 }),
      s({ userId: "luke", playerName: "luke", speciesId: "k2", name: "Kingfisher 2", month: 11 }), // 2 + 1 across months: no joker
    ]);
    expect(rows.every((r) => r.familyJokerHolders === 1)).toBe(true);
  });
});

describe("sortSpecies / filterSpecies", () => {
  const { rows } = summariseSpecies([
    s({ userId: "u1", speciesId: "a", name: "Hamerkop", scientificName: "Scopus umbretta", family: "Hamerkop" }),
    s({ userId: "u2", playerName: "Colin", speciesId: "a", name: "Hamerkop", scientificName: "Scopus umbretta", family: "Hamerkop" }),
    s({ userId: "u1", speciesId: "b", name: "African Paradise-Flycatcher", scientificName: "Terpsiphone viridis", family: "Flycatchers" }),
  ]);

  it("sorts rarest first, alphabetically, or by family", () => {
    expect(sortSpecies(rows, "rare")[0].name).toBe("African Paradise-Flycatcher");
    expect(sortSpecies(rows, "az")[0].name).toBe("African Paradise-Flycatcher");
    expect(sortSpecies(rows, "family")[0].family).toBe("Flycatchers");
    expect(sortSpecies(rows, "common")[0].name).toBe("Hamerkop");
  });

  it("finds by common name, scientific name, family or observer", () => {
    expect(filterSpecies(rows, "paradise flycatcher")).toHaveLength(1);
    expect(filterSpecies(rows, "scopus")).toHaveLength(1);
    expect(filterSpecies(rows, "flycatchers")).toHaveLength(1);
    expect(filterSpecies(rows, "colin")).toHaveLength(1);
    expect(filterSpecies(rows, "  ")).toHaveLength(2);
    expect(filterSpecies(rows, "penguin")).toHaveLength(0);
  });
});
