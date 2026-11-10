"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { validateProfile } from "@/lib/rules/profile";
import { feedTag, leaderboardTag } from "@/lib/tags";

export type ProfileState = { ok: true; message: string } | { ok: false; field: "name" | "username" | "region"; error: string } | null;

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requirePlayer();
  const checked = validateProfile({ name: String(form.get("name") ?? ""), username: String(form.get("username") ?? "") });
  if (!checked.ok) return checked;

  const regionId = String(form.get("regionId") ?? "") || null;
  if (regionId && !(await db.region.findUnique({ where: { id: regionId }, select: { id: true } }))) {
    return { ok: false, field: "region", error: "Choose a region from the list." };
  }
  if (checked.username) {
    // "Fish_Eagle" and "fish_eagle" would be indistinguishable on the table
    const taken = await db.user.findFirst({
      where: { username: { equals: checked.username, mode: "insensitive" }, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) return { ok: false, field: "username", error: "Another player already uses that display name." };
  }

  try {
    await db.user.update({ where: { id: user.id }, data: { name: checked.name, username: checked.username, defaultRegionId: regionId } });
  } catch (e) {
    // unique index: two players saved the same name at the same moment
    if ((e as { code?: string }).code === "P2002") return { ok: false, field: "username", error: "Another player already uses that display name." };
    throw e;
  }
  // names appear in the cached feed, species list and table
  updateTag(feedTag);
  updateTag(leaderboardTag(getChallengeMonth()));
  return { ok: true, message: "Profile saved." };
}
