"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { executeMerge } from "@/lib/merge-users";

const Id = z.string().min(1);

/**
 * Approve "Yes, I'm X": fold the new sign-in into the existing player. The
 * requester is gated by requirePlayer(), so it has no game data of its own —
 * only its Google account moves.
 */
export async function approveLinkRequest(formData: FormData) {
  const admin = await requireAdmin();
  const id = Id.parse(formData.get("id"));
  const request = await db.linkRequest.findUniqueOrThrow({ where: { id } });
  if (request.status !== "PENDING") throw new Error("Already resolved");
  await executeMerge(request.requesterId, request.targetId, admin.id);
  revalidatePath("/admin");
}

/** Not the same person: they get the "Are you already playing?" choice again. */
export async function rejectLinkRequest(formData: FormData) {
  const admin = await requireAdmin();
  const id = Id.parse(formData.get("id"));
  await db.linkRequest.update({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", resolvedById: admin.id, resolvedAt: new Date() },
  });
  revalidatePath("/admin");
}

const MergeInput = z.object({ from: Id, to: Id }).refine((v) => v.from !== v.to, "Choose two different players");

export async function mergePlayers(formData: FormData) {
  const admin = await requireAdmin();
  const { from, to } = MergeInput.parse({ from: formData.get("from"), to: formData.get("to") });
  if (from === admin.id) throw new Error("You can't merge away your own account while signed in to it");
  await executeMerge(from, to, admin.id);
  redirect(`/admin/players?merged=${encodeURIComponent(to)}`);
}
