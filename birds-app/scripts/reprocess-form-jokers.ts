/**
 * Re-run form bonus-joker processing for specific past months. Needed after
 * fixing email attribution (EMAIL_ALIASES / sheet edits) so bonusJokers land
 * on the right account. processFormJokersCore is idempotent: bonusJokers are
 * SET from the sheet, and totalJokers rebuilt from group jokers + bonus.
 *
 * Usage (needs DATABASE_URL + GOOGLE_* env vars):
 *   npx tsx scripts/reprocess-form-jokers.ts --year=2026 --months=5,7          # dry: just lists
 *   npx tsx scripts/reprocess-form-jokers.ts --year=2026 --months=5,7 --apply  # execute
 */
import { processFormJokersCore } from "../src/lib/form-jokers";
import prisma from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const year = parseInt(
  process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "",
  10
);
const months = (process.argv.find((a) => a.startsWith("--months="))?.split("=")[1] ?? "")
  .split(",")
  .map((m) => parseInt(m, 10))
  .filter((m) => m >= 1 && m <= 12);

async function main() {
  if (!year || months.length === 0) {
    console.error("Usage: --year=2026 --months=5,7 [--apply]");
    process.exit(1);
  }
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");
  console.log(`Reprocessing form jokers for ${year}, months: ${months.join(", ")}`);

  if (!APPLY) {
    console.log("Dry run: no processing executed (core function writes immediately).");
    return;
  }

  for (const month of months) {
    console.log(`\n--- ${year}-${String(month).padStart(2, "0")} ---`);
    const result = await processFormJokersCore(year, month, "script:reprocess-form-jokers");
    if (!result.success) {
      console.error(`Failed: ${result.error}`);
      continue;
    }
    for (const r of result.results) {
      console.log(
        `  ${r.matched ? "✓" : "✗ UNMATCHED"} ${r.email} -> bonus ${r.bonus}` +
          (r.breakdown.length > 0
            ? ` (${r.breakdown.map((b) => `${b.rule}: ${b.value}`).join(", ")})`
            : "")
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
