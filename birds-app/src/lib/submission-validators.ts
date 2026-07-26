/**
 * Pure validation logic for bird submissions.
 * No DB access — callers fetch data, these functions decide. Unit-testable.
 */

export interface CapCheck {
  ok: boolean;
  remaining: number;
}

/** Monthly cap is shared across ALL regions. */
export function checkCap(
  currentCount: number,
  incomingCount: number,
  maxBirdsPerPeriod: number
): CapCheck {
  const remaining = Math.max(0, maxBirdsPerPeriod - currentCount);
  return { ok: currentCount + incomingCount <= maxBirdsPerPeriod, remaining };
}

/** Birds already submitted in this region/window. */
export function findDuplicates(
  existingBirdNames: string[],
  incomingBirdNames: string[]
): string[] {
  const existing = new Set(existingBirdNames);
  return incomingBirdNames.filter((name) => existing.has(name));
}

/** Incoming names that don't exist in the region's bird list. */
export function findInvalidBirds(
  validBirdNames: string[],
  incomingBirdNames: string[]
): string[] {
  const valid = new Set(validBirdNames);
  return incomingBirdNames.filter((name) => !valid.has(name));
}

/**
 * Same species already twitched in another region (matched by scientificName —
 * 277 species carry different common names across regions).
 * Returns the incoming birds' fullNames that conflict.
 */
export function findSpeciesConflicts(
  incomingBirds: Array<{ fullName: string; scientificName: string }>,
  alreadyTwitchedScientificNames: Set<string>
): string[] {
  return incomingBirds
    .filter((b) => alreadyTwitchedScientificNames.has(b.scientificName))
    .map((b) => b.fullName);
}
