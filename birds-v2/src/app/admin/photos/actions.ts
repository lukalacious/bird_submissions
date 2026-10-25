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
  award: z.coerce.number().min(0).max(5).multipleOf(0.5).default(0),
});

/** Approve (with an optional joker award) or reject; the month's bonus is rebuilt. */
export async function reviewPhoto(formData: FormData) {
  const admin = await requireAdmin();
  const { photoId, decision, award } = ReviewInput.parse(Object.fromEntries(formData));
  await db.$transaction(async (tx) => {
    const photo = await tx.photo.update({
      where: { id: photoId },
      data: {
        status: decision === "approve" ? "APPROVED" : "REJECTED",
        jokerAward: decision === "approve" ? award : 0,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    await recalculateBonusJokers(tx, photo.userId, { year: photo.year, month: photo.month });
  });
  updateTag(feedTag);
  revalidatePath("/admin/photos");
}
