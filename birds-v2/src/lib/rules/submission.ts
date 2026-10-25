/**
 * Submission rules (ported from v1 lib/submission-validators.ts). Pure — no
 * DB; callers fetch, these decide. The same functions run in the tray for
 * live warnings and in the Server Action as the real check.
 */

export interface CapCheck {
  ok: boolean;
  remaining: number;
}

/** Monthly cap is shared across ALL regions. */
export function checkCap(currentCount: number, incomingCount: number, maxBirdsPerPeriod: number): CapCheck {
  const remaining = Math.max(0, maxBirdsPerPeriod - currentCount);
  return { ok: currentCount + incomingCount <= maxBirdsPerPeriod, remaining };
}

export interface IncomingBird {
  birdId: string;
  speciesId: string;
  displayName: string;
}

/**
 * A species counts once per season, in any region. v1 matched by name and
 * then by scientificName; v2 matches by speciesId, so "Southern Fiscal" (SA)
 * and "Common Fiscal" (EA) are the same bird by construction.
 * Also catches the same species twice within one submission.
 */
export function findSpeciesConflicts(
  incoming: IncomingBird[],
  twitchedSpeciesIds: ReadonlySet<string>
): string[] {
  const seen = new Set(twitchedSpeciesIds);
  const conflicts: string[] = [];
  for (const bird of incoming) {
    if (seen.has(bird.speciesId)) conflicts.push(bird.displayName);
    seen.add(bird.speciesId);
  }
  return conflicts;
}
