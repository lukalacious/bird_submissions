import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { SETTINGS_TAG } from "@/lib/settings";

/** Bird lists change only when an admin imports — cache for days. */
export const REFERENCE_TAG = "reference";

export interface ChecklistBird {
  id: string;
  speciesId: string;
  displayName: string;
  alphabeticalName: string;
  scientificName: string;
  group: string | null;
}

export async function getRegions() {
  "use cache";
  cacheTag(REFERENCE_TAG);
  cacheLife("days");
  return db.region.findMany({ select: { id: true, name: true, label: true }, orderBy: { label: "asc" } });
}

export async function getRegionBirds(regionId: string): Promise<ChecklistBird[]> {
  "use cache";
  cacheTag(REFERENCE_TAG);
  cacheLife("days");
  const birds = await db.bird.findMany({
    where: { regionId },
    orderBy: { alphabeticalName: "asc" },
    select: {
      id: true,
      speciesId: true,
      displayName: true,
      alphabeticalName: true,
      species: { select: { scientificName: true, group: { select: { name: true } } } },
    },
  });
  return birds.map((b) => ({
    id: b.id,
    speciesId: b.speciesId,
    displayName: b.displayName,
    alphabeticalName: b.alphabeticalName,
    scientificName: b.species.scientificName,
    group: b.species.group?.name ?? null,
  }));
}

/** This month's golden and photo birds, as species ids (any region). */
export async function getSpecialSpecies({ year, month }: ChallengeMonth) {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("days");
  const rows = await db.specialBird.findMany({ where: { year, month }, select: { kind: true, speciesId: true } });
  return {
    golden: rows.filter((r) => r.kind === "GOLDEN").map((r) => r.speciesId),
    photo: rows.filter((r) => r.kind === "PHOTO").map((r) => r.speciesId),
  };
}

export interface SeasonBird {
  id: string;
  speciesId: string | null;
  label: string;
  group: string | null;
  year: number;
  month: number;
  isLifer: boolean;
  photoUrl: string | null;
}

/**
 * Everything the checklist needs about one player's season in two queries.
 * Never cached across requests — it changes with every submission.
 */
export async function getPlayerSeason(userId: string, year: number) {
  const [subs, status] = await Promise.all([
    db.submission.findMany({
      where: { userId, year },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        speciesId: true,
        customName: true,
        year: true,
        month: true,
        isLifer: true,
        photo: { select: { url: true } },
        bird: { select: { displayName: true, species: { select: { group: { select: { name: true } } } } } },
      },
    }),
    db.userChallengeStatus.findUnique({ where: { userId_year: { userId, year } }, select: { isEliminated: true } }),
  ]);

  const birds: SeasonBird[] = subs.map((s) => ({
    id: s.id,
    speciesId: s.speciesId,
    label: s.bird?.displayName ?? s.customName ?? "Unknown bird",
    group: s.bird?.species.group?.name ?? null,
    year: s.year,
    month: s.month,
    isLifer: s.isLifer,
    photoUrl: s.photo?.url ?? null,
  }));
  return { birds, isEliminated: status?.isEliminated ?? false };
}

/** Every species once, named by its first regional name — for admin pickers. */
export async function getAllSpecies() {
  "use cache";
  cacheTag(REFERENCE_TAG);
  cacheLife("days");
  const species = await db.species.findMany({
    select: { id: true, scientificName: true, birds: { select: { displayName: true, alphabeticalName: true }, take: 1, orderBy: { displayName: "asc" } } },
  });
  return species
    .filter((s) => s.birds.length > 0)
    .map((s) => ({ id: s.id, scientificName: s.scientificName, displayName: s.birds[0].displayName, alphabeticalName: s.birds[0].alphabeticalName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
