"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { isOwnPhotoUrl } from "@/lib/photos";
import { getSettings } from "@/lib/settings";
import { feedTag } from "@/lib/tags";
import type { ActionResult } from "./actions";

const AttachInput = z.object({
  submissionId: z.string().min(1),
  url: z.url(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  takenAt: z.iso.datetime().optional(),
});

/** Save an uploaded photo against one of the player's own birds (replaces any earlier one). */
export async function attachPhoto(input: z.input<typeof AttachInput>): Promise<ActionResult> {
  const user = await requirePlayer();
  const parsed = AttachInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That photo couldn't be saved. Try again." };
  const { submissionId, url, width, height, takenAt } = parsed.data;

  if (!isOwnPhotoUrl(url, user.id, submissionId)) return { ok: false, error: "That photo couldn't be saved. Try again." };
  const sub = await db.submission.findFirst({ where: { id: submissionId, userId: user.id }, select: { id: true } });
  if (!sub) return { ok: false, error: "That bird isn't on your list." };

  // A photo belongs to the month it was added, which can be after the twitch
  const settings = await getSettings();
  const month = getChallengeMonth(new Date(), settings.timezone);
  const data = { url, width, height, takenAt: takenAt ? new Date(takenAt) : null, ...month, status: "PENDING" as const };
  await db.photo.upsert({
    where: { submissionId },
    create: { submissionId, userId: user.id, ...data },
    update: { ...data, jokerAward: 0, reviewedAt: null, reviewedById: null },
  });
  updateTag(feedTag);
  return { ok: true, message: "Photo added." };
}

const RemoveInput = z.object({ submissionId: z.string().min(1) });

export async function removePhoto(input: z.input<typeof RemoveInput>): Promise<ActionResult> {
  const user = await requirePlayer();
  const { submissionId } = RemoveInput.parse(input);
  const photo = await db.photo.findFirst({ where: { submissionId, userId: user.id } });
  if (!photo) return { ok: false, error: "No photo to remove." };
  if (photo.jokerAward > 0) return { ok: false, error: "This photo has earned jokers, so ask an admin to remove it." };
  await db.photo.delete({ where: { id: photo.id } });
  updateTag(feedTag);
  return { ok: true, message: "Photo removed." };
}
