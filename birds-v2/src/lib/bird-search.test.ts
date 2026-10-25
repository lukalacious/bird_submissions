import { describe, expect, it } from "vitest";
import { indexBirds, searchBirds } from "./bird-search";

const birds = [
  { displayName: "Southern Fiscal", alphabeticalName: "Fiscal, Southern", scientificName: "Lanius collaris" },
  { displayName: "Cape Teal", alphabeticalName: "Teal, Cape", scientificName: "Anas capensis" },
  { displayName: "Cape Robin-chat", alphabeticalName: "Robin-chat, Cape", scientificName: "Dessonornis caffer" },
  { displayName: "Fiscal Flycatcher", alphabeticalName: "Flycatcher, Fiscal", scientificName: "Melaenornis silens" },
  { displayName: "Hamerkop", alphabeticalName: "Hamerkop", scientificName: "Scopus umbretta" },
];
const index = indexBirds(birds);
const names = (q: string) => searchBirds(index, q).map((b) => b.displayName);

describe("searchBirds", () => {
  it("ranks a name that starts with the query first", () => {
    expect(names("fisc")).toEqual(["Fiscal Flycatcher", "Southern Fiscal"]);
  });

  it("matches fragments of several words in any order", () => {
    expect(names("tea cap")).toEqual(["Cape Teal"]);
  });

  it("ignores hyphens", () => {
    expect(names("robin chat")).toEqual(["Cape Robin-chat"]);
  });

  it("finds birds by scientific name", () => {
    expect(names("lanius")).toEqual(["Southern Fiscal"]);
  });

  it("falls back to substring matches", () => {
    expect(names("kop")).toEqual(["Hamerkop"]);
  });

  it("returns nothing for an empty query", () => {
    expect(names("  ")).toEqual([]);
  });
});
