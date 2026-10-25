import { describe, expect, it } from "vitest";
import { planMerge, type MergeSubmission } from "./merge-plan";

const sub = (id: string, speciesId: string | null, month: number, customName: string | null = null): MergeSubmission => ({
  id,
  speciesId,
  customName,
  year: 2026,
  month,
  label: id,
});

describe("planMerge", () => {
  it("moves birds the target doesn't have and drops repeats — the Colin case", () => {
    const plan = planMerge({
      source: { submissions: [sub("s1", "gull", 8), sub("s2", "teal", 8)], checkIns: [] },
      target: { submissions: [sub("t1", "gull", 1)], checkIns: [] },
    });
    expect(plan.moveSubmissionIds).toEqual(["s2"]);
    expect(plan.dropSubmissions.map((s) => s.id)).toEqual(["s1"]);
    expect(plan.affectedMonths).toEqual([{ year: 2026, month: 8 }]);
  });

  it("treats custom birds by name, case-insensitively", () => {
    const plan = planMerge({
      source: { submissions: [sub("s1", null, 3, "Mystery Lark")], checkIns: [] },
      target: { submissions: [sub("t1", null, 2, "mystery lark")], checkIns: [] },
    });
    expect(plan.dropSubmissions).toHaveLength(1);
  });

  it("keeps the target's check-in when both filed one", () => {
    const plan = planMerge({
      source: { submissions: [], checkIns: [{ year: 2026, month: 5 }, { year: 2026, month: 6 }] },
      target: { submissions: [], checkIns: [{ year: 2026, month: 5 }] },
    });
    expect(plan.moveCheckInMonths).toEqual([{ year: 2026, month: 6 }]);
    expect(plan.dropCheckInMonths).toEqual([{ year: 2026, month: 5 }]);
  });

  it("drops a repeat within the source's own rows too", () => {
    const plan = planMerge({
      source: { submissions: [sub("s1", "owl", 2), sub("s2", "owl", 4)], checkIns: [] },
      target: { submissions: [], checkIns: [] },
    });
    expect(plan.moveSubmissionIds).toEqual(["s1"]);
  });
});
