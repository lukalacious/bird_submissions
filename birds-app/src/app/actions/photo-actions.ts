"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { type Prisma } from "@prisma/client";

export interface BonusBirdPhoto {
  id: string;
  birdName: string;
  photoUrl: string;
  year: number;
  month: number;
  userName: string | null;
  userImage: string | null;
  awardedJokers: number;
  awarded: boolean;
}

// Public gallery data — every bonus-bird photo for the year (transparency,
// like the community joker view)
export async function getBonusBirdPhotos(year: number): Promise<BonusBirdPhoto[]> {
  const submissions = await prisma.submission.findMany({
    where: { year, photoUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, username: true, image: true } },
    },
  });

  return submissions.map((s) => ({
    id: s.id,
    birdName: s.birdName,
    photoUrl: s.photoUrl!,
    year: s.year,
    month: s.month,
    userName: s.user.username || s.user.name,
    userImage: s.user.image,
    awardedJokers: s.photoAwardJokers,
    awarded: s.photoAwardedAt !== null,
  }));
}

// --- Admin: manual photo rewards ---

export interface AdminPhotoEntry extends BonusBirdPhoto {
  userId: string;
  userEmail: string;
}

export async function getPhotosForReview(year: number): Promise<AdminPhotoEntry[]> {
  await requireAdmin();
  const submissions = await prisma.submission.findMany({
    where: { year, photoUrl: { not: null } },
    orderBy: [{ photoAwardedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, username: true, image: true, email: true } },
    },
  });

  return submissions.map((s) => ({
    id: s.id,
    birdName: s.birdName,
    photoUrl: s.photoUrl!,
    year: s.year,
    month: s.month,
    userName: s.user.username || s.user.name,
    userImage: s.user.image,
    userEmail: s.user.email,
    userId: s.userId,
    awardedJokers: s.photoAwardJokers,
    awarded: s.photoAwardedAt !== null,
  }));
}

/**
 * Award (or change) the joker value for a bonus-bird photo.
 * The award lives on the Submission row (survives the nightly form-joker
 * recompute, which merges photo awards into bonusJokers) and is applied
 * to the month's UserJoker immediately as a delta.
 */
export async function awardPhotoJokers(
  submissionId: string,
  jokers: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    if (jokers < 0 || jokers > 5) {
      return { success: false, error: "Award must be between 0 and 5 jokers" };
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission || !submission.photoUrl) {
      return { success: false, error: "Photo submission not found" };
    }

    const delta = jokers - submission.photoAwardJokers;

    await prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submissionId },
        data: { photoAwardJokers: jokers, photoAwardedAt: new Date() },
      });

      // Apply the delta to the month's joker record
      const existing = await tx.userJoker.findUnique({
        where: {
          userId_year_month: {
            userId: submission.userId,
            year: submission.year,
            month: submission.month,
          },
        },
      });

      const breakdown =
        (existing?.bonusBreakdown as { rule: string; value: number }[] | null) ?? [];
      const ruleName = `Photo award: ${submission.birdName}`;
      const newBreakdown = [
        ...breakdown.filter((b) => b.rule !== ruleName),
        ...(jokers !== 0 ? [{ rule: ruleName, value: jokers }] : []),
      ];

      await tx.userJoker.upsert({
        where: {
          userId_year_month: {
            userId: submission.userId,
            year: submission.year,
            month: submission.month,
          },
        },
        create: {
          userId: submission.userId,
          year: submission.year,
          month: submission.month,
          jokers: 0,
          bonusJokers: jokers,
          totalJokers: jokers,
          usedJokers: 0,
          bonusBreakdown: newBreakdown as unknown as Prisma.InputJsonValue,
        },
        update: {
          bonusJokers: { increment: delta },
          totalJokers: { increment: delta },
          bonusBreakdown: newBreakdown as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath("/admin/photo-awards");
    revalidatePath("/community");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to award photo jokers:", error);
    return { success: false, error: "Failed to award jokers" };
  }
}
