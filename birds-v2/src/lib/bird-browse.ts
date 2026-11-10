/**
 * The regional list as a field-guide index: by family, or A to Z by the
 * "Kingfisher, Malachite" form of the name. Search finds a bird you can
 * name; browsing is for the one you can only place in a family.
 */

export type BrowseMode = "family" | "az";

export interface BrowsableBird {
  displayName: string;
  alphabeticalName: string;
  group: string | null;
}

export interface BirdSection<T> {
  key: string;
  label: string;
  birds: T[];
}

export const NO_FAMILY = "No family listed";

const letterOf = (name: string) => {
  const first = name.normalize("NFD").replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase();
  return first || "#";
};

export function groupBirds<T extends BrowsableBird>(birds: T[], mode: BrowseMode): BirdSection<T>[] {
  const sections = new Map<string, T[]>();
  for (const b of birds) {
    const key = mode === "family" ? (b.group ?? NO_FAMILY) : letterOf(b.alphabeticalName);
    sections.set(key, [...(sections.get(key) ?? []), b]);
  }
  const nameOf = (b: T) => (mode === "family" ? b.displayName : b.alphabeticalName);
  return [...sections.entries()]
    .map(([key, list]) => ({ key, label: key, birds: list.sort((a, b) => nameOf(a).localeCompare(nameOf(b))) }))
    .sort((a, b) => Number(a.key === NO_FAMILY || a.key === "#") - Number(b.key === NO_FAMILY || b.key === "#") || a.key.localeCompare(b.key));
}
