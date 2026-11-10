import { describe, expect, it } from "vitest";
import { groupBirds, NO_FAMILY } from "./bird-browse";

const bird = (displayName: string, alphabeticalName: string, group: string | null) => ({ displayName, alphabeticalName, group });
const birds = [
  bird("Malachite Kingfisher", "Kingfisher, Malachite", "Kingfishers"),
  bird("Giant Kingfisher", "Kingfisher, Giant", "Kingfishers"),
  bird("Hamerkop", "Hamerkop", "Hamerkop"),
  bird("Élégant Mystery", "Élégant Mystery", null),
  bird("Karoo Korhaan", "Korhaan, Karoo", "Bustards"),
];

describe("groupBirds", () => {
  it("by family: families A to Z, birds by common name, unlisted families last", () => {
    const sections = groupBirds(birds, "family");
    expect(sections.map((s) => s.label)).toEqual(["Bustards", "Hamerkop", "Kingfishers", NO_FAMILY]);
    expect(sections[2].birds.map((b) => b.displayName)).toEqual(["Giant Kingfisher", "Malachite Kingfisher"]);
  });

  it("A to Z: files a bird under its index name, ignoring accents", () => {
    const sections = groupBirds(birds, "az");
    expect(sections.map((s) => s.label)).toEqual(["E", "H", "K"]);
    expect(sections[2].birds.map((b) => b.alphabeticalName)).toEqual(["Kingfisher, Giant", "Kingfisher, Malachite", "Korhaan, Karoo"]);
  });
});
