/**
 * One-off fix (October 2026): Colin Jackson entered July 2026 (31 birds) and
 * August 2026 (31 birds) under colin.jackson@arocha.org instead of his real
 * account chwjackson@gmail.com. The gmail account also has its own August
 * list (his deliberate re-entry), which is authoritative — the arocha August
 * is a duplicate apart from Black-and-white Mannikin, which Colin's re-entry
 * replaced with Red-backed Mannikin.
 *
 * This script:
 *  1. Moves July 2026 submissions from the arocha account to the gmail one
 *  2. Deletes the arocha account's duplicate August 2026 submissions
 *  3. Deletes the arocha User (UserJoker months 5-8, challenge status,
 *     OAuth account/session all cascade)
 *  4. Recalculates the gmail account's July group jokers
 *
 * July/May form bonus jokers are restored separately: EMAIL_ALIASES in
 * src/lib/form-jokers.ts + scripts/reprocess-form-jokers.ts.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/fix-colin-accounts.ts          # dry run
 *   DATABASE_URL="..." npx tsx scripts/fix-colin-accounts.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import { recalculateGroupJokers } from "../src/lib/joker-groups";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const WRONG_EMAIL = "colin.jackson@arocha.org";
const REAL_EMAIL = "chwjackson@gmail.com";
const YEAR = 2026;
// The one arocha August bird not on the gmail list — superseded by Colin's
// re-entry (Red-backed Mannikin), deleted along with the duplicates.
const KNOWN_SUPERSEDED_AUGUST = new Set(["Black-and-white Mannikin"]);

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");

  const wrong = await prisma.user.findUnique({ where: { email: WRONG_EMAIL } });
  const real = await prisma.user.findUnique({ where: { email: REAL_EMAIL } });
  if (!wrong || !real) {
    throw new Error(`User missing: wrong=${!!wrong} real=${!!real} (already fixed?)`);
  }
  console.log(`wrong account: ${wrong.id} (${WRONG_EMAIL})`);
  console.log(`real account:  ${real.id} (${REAL_EMAIL})`);

  // --- Preconditions ---
  const [wrongJuly, realJulyCount, wrongAug, realAug, realAllBirds] = await Promise.all([
    prisma.submission.findMany({ where: { userId: wrong.id, year: YEAR, month: 7 } }),
    prisma.submission.count({ where: { userId: real.id, year: YEAR, month: 7 } }),
    prisma.submission.findMany({ where: { userId: wrong.id, year: YEAR, month: 8 } }),
    prisma.submission.findMany({
      where: { userId: real.id, year: YEAR, month: 8 },
      select: { birdName: true },
    }),
    prisma.submission.findMany({
      where: { userId: real.id, year: YEAR },
      select: { birdName: true },
    }),
  ]);

  console.log(`wrong acct July submissions: ${wrongJuly.length} (expect 31)`);
  console.log(`real acct July submissions:  ${realJulyCount} (expect 0)`);
  console.log(`wrong acct Aug submissions:  ${wrongAug.length} (expect 31, duplicates)`);

  if (realJulyCount > 0) throw new Error("Real account already has July submissions — aborting");
  if (wrongJuly.length === 0) throw new Error("No July submissions on wrong account — aborting");

  // July birds must not collide with anything on the real account (one
  // species per year, plus the @@unique constraint on the move itself)
  const realBirdNames = new Set(realAllBirds.map((s) => s.birdName));
  const julyCollisions = wrongJuly.filter((s) => realBirdNames.has(s.birdName));
  if (julyCollisions.length > 0) {
    throw new Error(
      `July birds already exist on real account (won't move): ${julyCollisions
        .map((s) => s.birdName)
        .join(", ")}`
    );
  }
  console.log("July check: no collisions with real account ✓");

  // August: everything on the wrong account must be a duplicate of the real
  // account's August, except the known superseded bird
  const realAugNames = new Set(realAug.map((s) => s.birdName));
  const nonDuplicateAug = wrongAug.filter(
    (s) => !realAugNames.has(s.birdName) && !KNOWN_SUPERSEDED_AUGUST.has(s.birdName)
  );
  if (nonDuplicateAug.length > 0) {
    throw new Error(
      `Wrong account has unexpected August birds (won't delete): ${nonDuplicateAug
        .map((s) => s.birdName)
        .join(", ")}`
    );
  }
  console.log(
    `August check: all wrong-account birds are duplicates (plus superseded: ${[
      ...KNOWN_SUPERSEDED_AUGUST,
    ].join(", ")}) ✓`
  );

  // Log the arocha UserJoker rows that will cascade away with the user
  const wrongJokers = await prisma.userJoker.findMany({
    where: { userId: wrong.id, year: YEAR },
    orderBy: { month: "asc" },
  });
  for (const j of wrongJokers) {
    console.log(
      `wrong acct UserJoker m${j.month}: jokers=${j.jokers} bonus=${j.bonusJokers} total=${j.totalJokers} used=${j.usedJokers} (will cascade-delete)`
    );
  }

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to execute.");
    return;
  }

  // --- Execute ---
  await prisma.$transaction(async (tx) => {
    const moved = await tx.submission.updateMany({
      where: { userId: wrong.id, year: YEAR, month: 7 },
      data: { userId: real.id },
    });
    console.log(`Moved ${moved.count} July submissions -> ${REAL_EMAIL}`);

    const deletedAug = await tx.submission.deleteMany({
      where: { userId: wrong.id, year: YEAR, month: 8 },
    });
    console.log(`Deleted ${deletedAug.count} duplicate August submissions`);

    // Remaining arocha data (UserJoker m5-8, challenge status, account/session)
    // cascades with the user delete
    await tx.user.delete({ where: { id: wrong.id } });
    console.log(`Deleted user ${WRONG_EMAIL} (relations cascaded)`);
  });

  // Creates/updates the gmail July UserJoker row (bonusJokers restored
  // separately by reprocess-form-jokers.ts once EMAIL_ALIASES is live)
  const recalc = await recalculateGroupJokers(prisma, real.id, YEAR, 7);
  console.log(`Recalculated July jokers: group=${recalc.groupJokers} total=${recalc.totalJokers}`);

  // --- Verify ---
  const finalCounts = await prisma.submission.groupBy({
    by: ["month"],
    where: { userId: real.id, year: YEAR },
    _count: true,
    orderBy: { month: "asc" },
  });
  console.log("Final monthly counts for real account:", finalCounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
