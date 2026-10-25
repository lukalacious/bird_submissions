/**
 * Checklist search. Birders type fragments ("fisc", "cape tea", "lanius"), so
 * we match every typed word against common, alphabetical and scientific
 * names, ignoring case, hyphens and accents, then rank:
 *   whole name starts with query  >  every word starts a word  >  contains.
 */

export interface SearchableBird {
  displayName: string;
  alphabeticalName: string;
  scientificName: string;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Precompute once per bird list — search runs on every keystroke. */
export function indexBirds<T extends SearchableBird>(birds: T[]) {
  return birds.map((bird) => {
    const names = [bird.displayName, bird.alphabeticalName, bird.scientificName].map(fold);
    return { bird, names, words: names.flatMap((n) => n.split(" ")) };
  });
}

export function searchBirds<T extends SearchableBird>(
  index: ReturnType<typeof indexBirds<T>>,
  query: string,
  limit = 40
): T[] {
  const q = fold(query);
  if (!q) return [];
  const terms = q.split(" ");

  const scored: { bird: T; score: number }[] = [];
  for (const entry of index) {
    let score: number;
    if (entry.names.some((n) => n.startsWith(q))) score = 0;
    else if (terms.every((t) => entry.words.some((w) => w.startsWith(t)))) score = 1;
    else if (terms.every((t) => entry.names.some((n) => n.includes(t)))) score = 2;
    else continue;
    scored.push({ bird: entry.bird, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.bird.displayName.localeCompare(b.bird.displayName))
    .slice(0, limit)
    .map((s) => s.bird);
}
