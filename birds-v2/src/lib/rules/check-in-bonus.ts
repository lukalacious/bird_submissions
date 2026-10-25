/**
 * Monthly check-in bonus jokers (ported from v1 calculateFormBonus — same
 * rules, see birds-app/docs/JOKER-MATH-LOGIC.md). Input is the in-app
 * check-in instead of a Google Form row, so there's no email to match.
 */

export interface CheckInAnswers {
  within15km: boolean;
  beyond750km: boolean;
  nonMotorisedCount: number;
  liferCount: number;
  goldenCount: number;
  photoCount: number;
}

export interface BonusLine {
  rule: string;
  value: number;
}

export function calculateCheckInBonus(a: CheckInAnswers): { total: number; breakdown: BonusLine[] } {
  const lines: BonusLine[] = [
    // All birds within 15km of home → +5
    { rule: "All within 15km", value: a.within15km ? 5 : 0 },
    // Any bird beyond 750km → −3
    { rule: "Beyond 750km penalty", value: a.beyond750km ? -3 : 0 },
    // Non-motorised → 1 per 10 birds, max 3
    { rule: `Non-motorised (${a.nonMotorisedCount} birds)`, value: Math.min(Math.floor(a.nonMotorisedCount / 10), 3) },
    // Golden birds → 1 each, max 5
    { rule: `Golden birds (${a.goldenCount})`, value: Math.min(a.goldenCount, 5) },
    // Lifers → 1 each, max 5
    { rule: `Lifers (${a.liferCount})`, value: Math.min(a.liferCount, 5) },
    // Photos → 1 each, max 3
    { rule: `Photos (${a.photoCount})`, value: Math.min(a.photoCount, 3) },
  ];
  const breakdown = lines.filter((l) => l.value !== 0);
  return { total: breakdown.reduce((sum, l) => sum + l.value, 0), breakdown };
}
