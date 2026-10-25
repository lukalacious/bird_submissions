"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { recalculateBonusJokers } from "@/lib/bonus-db";
import { goldenPhotoMonthFor } from "@/lib/checklist";
import { isOwnPhotoUrl } from "@/lib/photos";
import { feedTag } from "@/lib/tags";
import type { ActionResult } from "./actions";

const AttachInput = z.object({
  submissionId: z.string().min(1),
  url: z.url(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  takenAt: z.iso.datetime().optional(),
});

/**
 * Save a golden-bird proof photo (replaces any earlier one). Counts toward
 * the golden bonus of the month whose golden list has this species.
 */
export async function attachPhoto(input: z.input<typeof AttachInput>): Promise<ActionResult> {
  const user = await requirePlayer();
  const parsed = AttachInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That photo couldn't be saved. Try again." };
  const { submissionId, url, width, height, takenAt } = parsed.data;

  if (!isOwnPhotoUrl(url, user.id, submissionId)) return { ok: false, error: "That photo couldn't be saved. Try again." };
  const sub = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id },
    select: { id: true, speciesId: true, photo: { select: { year: true, month: true } } },
  });
  if (!sub) return { ok: false, error: "That bird isn't on your list." };
  const month = await goldenPhotoMonthFor(sub.speciesId);
  if (!month) return { ok: false, error: "Photos are for this month's golden birds only." };

  const data = { url, width, height, takenAt: takenAt ? new Date(takenAt) : null, ...month, status: "PENDING" as const, reviewedAt: null, reviewedById: null };
  const bonus = await db.$transaction(async (tx) => {
    await tx.photo.upsert({ where: { submissionId }, create: { submissionId, userId: user.id, ...data }, update: data });
    if (sub.photo && (sub.photo.year !== month.year || sub.photo.month !== month.month)) {
      await recalculateBonusJokers(tx, user.id, sub.photo);
    }
    return recalculateBonusJokers(tx, user.id, month);
  });
  updateTag(feedTag);
  return { ok: true, message: `Golden bird proven. Your bonus this month is ${bonus} joker${bonus === 1 ? "" : "s"}.` };
}

const RemoveInput = z.object({ submissionId: z.string().min(1) });

export async function removePhoto(input: z.input<typeof RemoveInput>): Promise<ActionResult> {
  const user = await requirePlayer();
  const { submissionId } = RemoveInput.parse(input);
  const photo = await db.photo.findFirst({ where: { submissionId, userId: user.id } });
  if (!photo) return { ok: false, error: "No photo to remove." };
  await db.$transaction(async (tx) => {
    await tx.photo.delete({ where: { id: photo.id } });
    await recalculateBonusJokers(tx, user.id, photo);
  });
  updateTag(feedTag);
  return { ok: true, message: "Photo removed. That golden bird no longer counts for your bonus." };
}
