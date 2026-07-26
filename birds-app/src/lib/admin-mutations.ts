/**
 * Session-free submission mutations used by admin actions (change-request
 * approvals) and one-off scripts. Pattern from scripts/fix-philip-june.ts.
 * Every mutation recalculates the affected month's group jokers
 * (bonusJokers are preserved by recalculateGroupJokers).
 */
import type { PrismaClient } from "@prisma/client";
import { recalculateGroupJokers } from "@/lib/joker-groups";

export interface MutationResult {
  success: boolean;
  error?: string;
}

/** Delete one bird from a user's month and recalc jokers. */
export async function deleteSubmissionForUser(
  db: PrismaClient,
  userId: string,
  birdName: string,
  year: number,
  month: number
): Promise<MutationResult> {
  const deleted = await db.submission.deleteMany({
    where: { userId, birdName, year, month, isJokerSubmission: false },
  });
  if (deleted.count === 0) {
    return { success: false, error: `Submission "${birdName}" not found for ${month}/${year}` };
  }
  await recalculateGroupJokers(db, userId, year, month);
  return { success: true };
}

/** Replace one bird with another in a user's month and recalc jokers. */
export async function swapSubmission(
  db: PrismaClient,
  userId: string,
  fromBird: string,
  toBird: string,
  year: number,
  month: number
): Promise<MutationResult> {
  const existing = await db.submission.findFirst({
    where: { userId, birdName: fromBird, year, month, isJokerSubmission: false },
  });
  if (!existing) {
    return { success: false, error: `Submission "${fromBird}" not found for ${month}/${year}` };
  }

  // Resolve the replacement in the same region (case-insensitive — names
  // come from user free text)
  const replacement = await db.bird.findFirst({
    where: {
      regionId: existing.regionId,
      fullName: { equals: toBird, mode: "insensitive" },
    },
  });
  if (!replacement) {
    return {
      success: false,
      error: `"${toBird}" not found in the submission's region — check spelling`,
    };
  }

  // Replacement species must not already be twitched this year (any region)
  const dupe = await db.submission.findFirst({
    where: { userId, year, birdName: replacement.fullName },
  });
  if (dupe) {
    return {
      success: false,
      error: `"${replacement.fullName}" already twitched in ${dupe.month}/${dupe.year}`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.submission.delete({ where: { id: existing.id } });
    await tx.submission.create({
      data: {
        userId,
        regionId: existing.regionId,
        birdName: replacement.fullName,
        year,
        month,
        isCustomBird: false,
      },
    });
  });

  await recalculateGroupJokers(db, userId, year, month);
  return { success: true };
}
