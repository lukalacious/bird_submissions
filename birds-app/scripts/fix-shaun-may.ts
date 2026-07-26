/**
 * One-off fix (July 2026): Shaun Chamberlain submitted May 2026 under
 * shaun.wytske@gmail.com instead of chamberlainshaun1@gmail.com, then
 * duplicated his June list on the wrong account too.
 *
 * This script:
 *  1. Moves May 2026 submissions + UserJoker from the wytske account to the real one
 *  2. Deletes the wytske account's duplicate June 2026 submissions + UserJoker
 *  3. Deletes the wytske User (all relations cascade)
 *  4. Recalculates the real account's May group jokers
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/fix-shaun-may.ts          # dry run
 *   DATABASE_URL="..." npx tsx scripts/fix-shaun-may.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import { recalculateGroupJokers } from "../src/lib/joker-groups";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const WRONG_EMAIL = "shaun.wytske@gmail.com";
const REAL_EMAIL = "chamberlainshaun1@gmail.com";
const YEAR = 2026;

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
  const [wrongMay, realMay, wrongJune, realJune] = await Promise.all([
    prisma.submission.findMany({ where: { userId: wrong.id, year: YEAR, month: 5 } }),
    prisma.submission.count({ where: { userId: real.id, year: YEAR, month: 5 } }),
    prisma.submission.findMany({ where: { userId: wrong.id, year: YEAR, month: 6 } }),
    prisma.submission.findMany({
      where: { userId: real.id, year: YEAR, month: 6 },
      select: { birdName: true },
    }),
  ]);

  console.log(`wrong acct May submissions: ${wrongMay.length} (expect 31)`);
  console.log(`real acct May submissions:  ${realMay} (expect 0)`);
  console.log(`wrong acct June submissions: ${wrongJune.length} (expect 30, duplicates)`);

  if (realMay > 0) throw new Error("Real account already has May submissions — aborting");
  if (wrongMay.length === 0) throw new Error("No May submissions on wrong account — aborting");

  const realJuneNames = new Set(realJune.map((s) => s.birdName));
  const nonDuplicateJune = wrongJune.filter((s) => !realJuneNames.has(s.birdName));
  if (nonDuplicateJune.length > 0) {
    throw new Error(
      `Wrong account has June birds NOT in real account (won't delete): ${nonDuplicateJune
        .map((s) => s.birdName)
        .join(", ")}`
    );
  }
  console.log("June check: all wrong-account June birds are duplicates of real account ✓");

  const wrongMayJoker = await prisma.userJoker.findUnique({
    where: { userId_year_month: { userId: wrong.id, year: YEAR, month: 5 } },
  });
  console.log(
    `wrong acct May UserJoker: jokers=${wrongMayJoker?.jokers} bonus=${wrongMayJoker?.bonusJokers} total=${wrongMayJoker?.totalJokers}`
  );

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to execute.");
    return;
  }

  // --- Execute ---
  await prisma.$transaction(async (tx) => {
    const moved = await tx.submission.updateMany({
      where: { userId: wrong.id, year: YEAR, month: 5 },
      data: { userId: real.id },
    });
    console.log(`Moved ${moved.count} May submissions -> ${REAL_EMAIL}`);

    if (wrongMayJoker) {
      await tx.userJoker.update({
        where: { id: wrongMayJoker.id },
        data: { userId: real.id },
      });
      console.log("Moved May UserJoker row");
    }

    const deletedJune = await tx.submission.deleteMany({
      where: { userId: wrong.id, year: YEAR, month: 6 },
    });
    console.log(`Deleted ${deletedJune.count} duplicate June submissions`);

    // Remaining wytske data (June UserJoker, challenge status, account/session)
    // cascades with the user delete
    await tx.user.delete({ where: { id: wrong.id } });
    console.log(`Deleted user ${WRONG_EMAIL} (relations cascaded)`);
  });

  // Recalculate May group jokers on the real account (preserves bonusJokers)
  const recalc = await recalculateGroupJokers(prisma, real.id, YEAR, 5);
  console.log(`Recalculated May jokers: group=${recalc.groupJokers} total=${recalc.totalJokers}`);

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
