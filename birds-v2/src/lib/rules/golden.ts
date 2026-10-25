import type { ChallengeMonth } from "@/lib/challenge-time";

/**
 * Photos are proof for golden birds only. A photo of a species counts for an
 * open month (current first, then last month in its grace window) whose
 * golden list contains that species. It can be attached to the player's
 * earlier sighting, since a species is only twitched once a season.
 * null = no photo allowed.
 */
export function goldenPhotoMonth(
  speciesId: string | null,
  open: ChallengeMonth[],
  goldenFor: (m: ChallengeMonth) => ReadonlySet<string>
): ChallengeMonth | null {
  if (!speciesId) return null;
  return open.find((m) => goldenFor(m).has(speciesId)) ?? null;
}
