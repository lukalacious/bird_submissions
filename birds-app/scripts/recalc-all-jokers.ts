/**
 * C3 (July 2026): Recalculate group jokers for ALL users for every month of
 * the current year, after the region-scoping fix and group-name
 * normalization. Preserves bonusJokers (form-based) by design.
 *
 * Emits a before/after diff CSV (scripts/joker-recalc-diff.csv) so changes
 * can be reviewed/announced.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/recalc-all-jokers.ts          # dry run (diff only)
 *   DATABASE_URL="..." npx tsx scripts/recalc-all-jokers.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { computeGroupJokers, recalculateGroupJokers } from "../src/lib/joker-groups";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const YEAR = 2026;
const MONTHS = [1, 2, 3, 4, 5, 6, 7];

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");

  // Every user/month that has submissions this year
  const userMonths = await prisma.submission.groupBy({
    by: ["userId", "month"],
    where: { year: YEAR, month: { in: MONTHS } },
    _count: true,
  });
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u]));

  console.log(`User-months with submissions: ${userMonths.length}`);

  const rows: string[] = ["email,name,month,old_group_jokers,new_group_jokers,delta,bonus_jokers"];
  let changed = 0;

  for (const um of userMonths.sort((a, b) => a.userId.localeCompare(b.userId) || a.month - b.month)) {
    const existing = await prisma.userJoker.findUnique({
      where: { userId_year_month: { userId: um.userId, year: YEAR, month: um.month } },
    });
    const oldGroup = existing?.jokers ?? 0;
    const bonus = existing?.bonusJokers ?? 0;

    const { groupJokers: newGroup } = await computeGroupJokers(prisma, um.userId, YEAR, um.month);
    const delta = newGroup - oldGroup;
    const u = userById.get(um.userId);

    if (delta !== 0) changed++;
    rows.push(
      `${u?.email ?? um.userId},"${u?.name ?? ""}",${um.month},${oldGroup},${newGroup},${delta},${bonus}`
    );

    if (APPLY) {
      await recalculateGroupJokers(prisma, um.userId, YEAR, um.month);
    }
  }

  const outPath = path.join(__dirname, "joker-recalc-diff.csv");
  fs.writeFileSync(outPath, rows.join("\n"));
  console.log(`User-months with changed group jokers: ${changed}`);
  console.log(`Diff written to ${outPath}`);
  if (!APPLY) console.log("Dry run: no database changes made.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
