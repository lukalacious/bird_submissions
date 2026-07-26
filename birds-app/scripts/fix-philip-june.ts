/**
 * One-off fix (July 2026): Philip Yiannakou requested three June 2026 swaps
 * via the Twitch request form (submitted 4 July, before July golden birds
 * were announced):
 *   Egyptian Goose   -> Red-billed Teal
 *   Hamerkop         -> Blue-billed Teal
 *   Southern Fiscal  -> Cape Teal      (form said "common fiscal")
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/fix-philip-june.ts          # dry run
 *   DATABASE_URL="..." npx tsx scripts/fix-philip-june.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import { recalculateGroupJokers } from "../src/lib/joker-groups";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const EMAIL = "philipyiannakou@gmail.com";
const YEAR = 2026;
const MONTH = 6;
const SWAPS: Array<{ from: string; to: string }> = [
  { from: "Egyptian Goose", to: "Red-billed Teal" },
  { from: "Hamerkop", to: "Blue-billed Teal" },
  { from: "Southern Fiscal", to: "Cape Teal" },
];

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`User not found: ${EMAIL}`);
  console.log(`user: ${user.id} (${EMAIL})`);

  const before = await prisma.userJoker.findUnique({
    where: { userId_year_month: { userId: user.id, year: YEAR, month: MONTH } },
  });
  console.log(
    `June UserJoker before: jokers=${before?.jokers} bonus=${before?.bonusJokers} total=${before?.totalJokers}`
  );

  // Validate every swap before touching anything
  const validated: Array<{ from: string; toFullName: string; regionId: string }> = [];
  for (const swap of SWAPS) {
    const existing = await prisma.submission.findFirst({
      where: { userId: user.id, year: YEAR, month: MONTH, birdName: swap.from },
    });
    if (!existing) throw new Error(`June submission not found for "${swap.from}" (already fixed?)`);

    // Resolve the replacement bird's exact fullName in the same region
    const replacement = await prisma.bird.findFirst({
      where: {
        regionId: existing.regionId,
        fullName: { equals: swap.to, mode: "insensitive" },
      },
    });
    if (!replacement) {
      // Help debugging: list near matches
      const candidates = await prisma.bird.findMany({
        where: { regionId: existing.regionId, fullName: { contains: swap.to.split(" ").pop()!, mode: "insensitive" } },
        select: { fullName: true },
      });
      throw new Error(
        `"${swap.to}" not found in region ${existing.regionId}. Candidates: ${candidates
          .map((c) => c.fullName)
          .join(", ")}`
      );
    }

    // Ensure replacement species isn't already twitched this year (any region)
    const dupe = await prisma.submission.findFirst({
      where: { userId: user.id, year: YEAR, birdName: replacement.fullName },
    });
    if (dupe) throw new Error(`"${replacement.fullName}" already twitched in ${YEAR}-${dupe.month}`);

    console.log(`OK: "${swap.from}" -> "${replacement.fullName}" (region ${existing.regionId})`);
    validated.push({ from: swap.from, toFullName: replacement.fullName, regionId: existing.regionId });
  }

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to execute.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const v of validated) {
      await tx.submission.deleteMany({
        where: { userId: user.id, year: YEAR, month: MONTH, birdName: v.from },
      });
      await tx.submission.create({
        data: {
          userId: user.id,
          regionId: v.regionId,
          birdName: v.toFullName,
          year: YEAR,
          month: MONTH,
          isCustomBird: false,
        },
      });
      console.log(`Swapped "${v.from}" -> "${v.toFullName}"`);
    }
  });

  const recalc = await recalculateGroupJokers(prisma, user.id, YEAR, MONTH);
  console.log(`Recalculated June jokers: group=${recalc.groupJokers} total=${recalc.totalJokers}`);

  const count = await prisma.submission.count({
    where: { userId: user.id, year: YEAR, month: MONTH },
  });
  console.log(`Final June submission count: ${count} (expect 30)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
