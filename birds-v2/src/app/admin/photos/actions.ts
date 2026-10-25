"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { recalculateBonusJokers } from "@/lib/bonus-db";
import { feedTag } from "@/lib/tags";

const ReviewInput = z.object({
  photoId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

/**
 * Golden proof photos count as soon as they're added; rejecting one (wrong
 * bird, not the player's photo) takes that golden bird out of the bonus.
 */
export async function reviewPhoto(formData: FormData) {
  const admin = await requireAdmin();
  const { photoId, decision } = ReviewInput.parse(Object.fromEntries(formData));
  await db.$transaction(async (tx) => {
    const photo = await tx.photo.update({
      where: { id: photoId },
      data: {
        status: decision === "approve" ? "APPROVED" : "REJECTED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    await recalculateBonusJokers(tx, photo.userId, { year: photo.year, month: photo.month });
  });
  updateTag(feedTag);
  revalidatePath("/admin/photos");
}
