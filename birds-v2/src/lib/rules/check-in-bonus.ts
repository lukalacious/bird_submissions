/**
 * Monthly bonus jokers (see birds-app/docs/JOKER-MATH-LOGIC.md).
 *
 * From the 2027 season golden birds need a photo as proof, and the golden
 * bonus is counted from those photos, not typed in. The separate "photo
 * birds" rule is gone. 2026 and earlier keep v1's self-reported counts,
 * so recalculating an old month never changes history.
 */

export const PHOTO_PROOF_FROM_SEASON = 2027;

export interface CheckInAnswers {
  within15km: boolean;
  beyond750km: boolean;
  nonMotorisedCount: number;
  liferCount: number;
  /** v1-era only (self-reported) */
  goldenCount?: number;
  photoCount?: number;
}

export interface BonusLine {
  rule: string;
  value: number;
}

export function calculateMonthBonus(input: {
  year: number;
  checkIn: CheckInAnswers | null;
  /** golden birds of the month with a (non-rejected) photo filed that month */
  goldenWithPhoto: number;
}): { total: number; breakdown: BonusLine[] } {
  const { year, checkIn: a, goldenWithPhoto } = input;
  const legacy = year < PHOTO_PROOF_FROM_SEASON;
  const lines: BonusLine[] = [];

  if (a) {
    // All birds within 15km of home → +5
    lines.push({ rule: "All within 15km", value: a.within15km ? 5 : 0 });
    // Any bird beyond 750km → −3
    lines.push({ rule: "Beyond 750km penalty", value: a.beyond750km ? -3 : 0 });
    // Non-motorised → 1 per 10 birds, max 3
    lines.push({ rule: `Non-motorised (${a.nonMotorisedCount} birds)`, value: Math.min(Math.floor(a.nonMotorisedCount / 10), 3) });
    // Lifers → 1 each, max 5
    lines.push({ rule: `Lifers (${a.liferCount})`, value: Math.min(a.liferCount, 5) });
    if (legacy) {
      lines.push({ rule: `Golden birds (${a.goldenCount ?? 0})`, value: Math.min(a.goldenCount ?? 0, 5) });
      lines.push({ rule: `Photos (${a.photoCount ?? 0})`, value: Math.min(a.photoCount ?? 0, 3) });
    }
  }
  // Golden birds → 1 each, max 5, proven by a photo; doesn't need the check-in
  if (!legacy) lines.push({ rule: `Golden birds with photos (${goldenWithPhoto})`, value: Math.min(goldenWithPhoto, 5) });

  const breakdown = lines.filter((l) => l.value !== 0);
  return { total: breakdown.reduce((sum, l) => sum + l.value, 0), breakdown };
}
