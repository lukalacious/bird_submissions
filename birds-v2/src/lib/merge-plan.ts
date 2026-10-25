/**
 * Pure planning for merging one player into another (replaces v1's one-off
 * fix-*-accounts scripts). The admin sees this plan as a dry-run preview
 * before anything moves. lib/merge-users.ts executes it.
 */

export interface MergeSubmission {
  id: string;
  speciesId: string | null;
  customName: string | null;
  year: number;
  month: number;
  label: string;
}

export interface MergeMonthRow {
  year: number;
  month: number;
}

export interface MergePlan {
  moveSubmissionIds: string[];
  /** source rows dropped because the target already has that bird this season */
  dropSubmissions: MergeSubmission[];
  /** user-months touched — their group jokers are recalculated afterwards */
  affectedMonths: MergeMonthRow[];
  /** source check-ins kept (target has none that month) / dropped */
  moveCheckInMonths: MergeMonthRow[];
  dropCheckInMonths: MergeMonthRow[];
}

const seasonKey = (s: Pick<MergeSubmission, "speciesId" | "customName" | "year">) =>
  s.speciesId ? `sp:${s.year}:${s.speciesId}` : `cu:${s.year}:${(s.customName ?? "").toLowerCase()}`;
const monthKey = (m: MergeMonthRow) => `${m.year}-${m.month}`;

export function planMerge(input: {
  source: { submissions: MergeSubmission[]; checkIns: MergeMonthRow[] };
  target: { submissions: MergeSubmission[]; checkIns: MergeMonthRow[] };
}): MergePlan {
  const targetHas = new Set(input.target.submissions.map(seasonKey));
  const moveSubmissionIds: string[] = [];
  const dropSubmissions: MergeSubmission[] = [];
  const affected = new Map<string, MergeMonthRow>();

  for (const s of input.source.submissions) {
    const key = seasonKey(s);
    if (targetHas.has(key)) {
      dropSubmissions.push(s);
    } else {
      targetHas.add(key);
      moveSubmissionIds.push(s.id);
      affected.set(monthKey(s), { year: s.year, month: s.month });
    }
  }

  const targetCheckIns = new Set(input.target.checkIns.map(monthKey));
  const moveCheckInMonths = input.source.checkIns.filter((c) => !targetCheckIns.has(monthKey(c)));
  const dropCheckInMonths = input.source.checkIns.filter((c) => targetCheckIns.has(monthKey(c)));

  return {
    moveSubmissionIds,
    dropSubmissions,
    affectedMonths: [...affected.values()].sort((a, b) => a.year - b.year || a.month - b.month),
    moveCheckInMonths,
    dropCheckInMonths,
  };
}
