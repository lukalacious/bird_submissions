"use server";

import { updateTag } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { isOwnAvatarUrl } from "@/lib/photos";
import { feedTag, leaderboardTag } from "@/lib/tags";
import type { ActionResult } from "../twitch/actions";

const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;

/** Swap the player's picture; delete the old uploaded one (Google pictures aren't ours to delete). */
async function setImage(userId: string, image: string | null) {
  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { image: true } });
  await db.user.update({ where: { id: userId }, data: { image } });
  if (before.image && isOwnAvatarUrl(before.image, userId)) {
    await del(before.image, { token: blobToken() }).catch(() => {}); // best effort
  }
  // names and pictures appear in the cached feed and leaderboard
  updateTag(feedTag);
  updateTag(leaderboardTag(getChallengeMonth()));
}

export async function saveAvatar(input: { url: string }): Promise<ActionResult> {
  const user = await requirePlayer();
  const url = z.url().safeParse(input.url);
  if (!url.success || !isOwnAvatarUrl(url.data, user.id)) return { ok: false, error: "That picture couldn't be saved. Try again." };
  await setImage(user.id, url.data);
  return { ok: true, message: "Profile picture updated." };
}

export async function removeAvatar(): Promise<ActionResult> {
  const user = await requirePlayer();
  await setImage(user.id, null);
  return { ok: true, message: "Profile picture removed." };
}
