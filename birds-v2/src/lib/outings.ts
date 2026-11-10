/**
 * The Latest feed, one entry per outing.
 *
 * A player back from a morning's birding adds 30 birds in one go, which used
 * to push everyone else off the feed. Birds one player adds to the same
 * month and region within a few minutes of each other are one outing.
 */

export interface OutingSighting {
  id: string;
  userId: string;
  playerName: string;
  playerImage: string | null;
  bird: string;
  region: string;
  year: number;
  month: number;
  isLifer: boolean;
  photoUrl: string | null;
  at: string;
}

export interface Outing {
  /** id of the newest bird in the outing, stable as older birds scroll off */
  id: string;
  userId: string;
  playerName: string;
  playerImage: string | null;
  region: string;
  year: number;
  month: number;
  /** when the newest bird was added */
  at: string;
  lifers: number;
  birds: { id: string; name: string; isLifer: boolean; photoUrl: string | null }[];
}

export const OUTING_GAP_MINUTES = 10;

/** Sightings in any order → outings, newest first, birds A to Z within each. */
export function groupOutings(sightings: OutingSighting[], gapMinutes = OUTING_GAP_MINUTES): Outing[] {
  const gap = gapMinutes * 60_000;
  const newestFirst = [...sightings].sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
  const outings: Outing[] = [];
  // the outing still being filled for each player/region/month, and its oldest bird so far
  const open = new Map<string, { outing: Outing; oldest: number }>();

  for (const s of newestFirst) {
    const key = `${s.userId}|${s.region}|${s.year}-${s.month}`;
    const time = Date.parse(s.at);
    const current = open.get(key);
    const bird = { id: s.id, name: s.bird, isLifer: s.isLifer, photoUrl: s.photoUrl };
    if (current && current.oldest - time <= gap) {
      current.outing.birds.push(bird);
      current.outing.lifers += Number(s.isLifer);
      current.oldest = time;
      continue;
    }
    const outing: Outing = {
      id: s.id,
      userId: s.userId,
      playerName: s.playerName,
      playerImage: s.playerImage,
      region: s.region,
      year: s.year,
      month: s.month,
      at: s.at,
      lifers: Number(s.isLifer),
      birds: [bird],
    };
    outings.push(outing);
    open.set(key, { outing, oldest: time });
  }
  for (const o of outings) o.birds.sort((a, b) => a.name.localeCompare(b.name));
  return outings;
}

/** "Cape Teal, Hamerkop, Malachite Kingfisher and 28 more" */
export function previewNames(names: string[], show = 3): string {
  if (names.length <= show) return names.join(", ");
  return `${names.slice(0, show).join(", ")} and ${names.length - show} more`;
}
