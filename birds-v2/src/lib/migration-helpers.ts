/** Pure helpers for scripts/migrate-v1-to-v2.ts — kept here so they're unit-tested. */

export function looseName(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** "Common (Dark-capped) bulbul" → itself, "Common bulbul", "Dark-capped bulbul" */
export function nameVariants(typed: string): string[] {
  const m = typed.match(/^(.*?)\s*\(([^)]+)\)\s*(.*)$/);
  if (!m) return [typed];
  const [, before, inside, after] = m;
  const beforeWords = before.trim().split(/\s+/);
  return [
    typed,
    `${before} ${after}`.trim(),
    // the alias replaces the word right before it
    [...beforeWords.slice(0, -1), inside, after].join(" ").trim(),
    `${inside} ${after}`.trim(),
  ];
}

/** v1 bonusBreakdown → the check-in answers that would have produced it. */
export function checkInFromBreakdown(breakdown: unknown) {
  if (!Array.isArray(breakdown)) return null;
  const answers = { within15km: false, beyond750km: false, nonMotorisedCount: 0, liferCount: 0, goldenCount: 0, photoCount: 0 };
  let found = false;
  for (const entry of breakdown) {
    const rule = (entry as { rule?: string })?.rule ?? "";
    const num = Number(rule.match(/\((\d+)/)?.[1] ?? 0);
    if (rule === "All within 15km") answers.within15km = found = true;
    else if (rule === "Beyond 750km penalty") answers.beyond750km = found = true;
    else if (rule.startsWith("Non-motorised")) [answers.nonMotorisedCount, found] = [num, true];
    else if (rule.startsWith("Golden birds")) [answers.goldenCount, found] = [num, true];
    else if (rule.startsWith("Lifers")) [answers.liferCount, found] = [num, true];
    else if (rule.startsWith("Photos (")) [answers.photoCount, found] = [num, true];
  }
  return found ? answers : null;
}
