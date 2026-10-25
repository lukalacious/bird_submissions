"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { findMatchesFor } from "@/lib/players";

const ClaimInput = z.object({ targetId: z.string().min(1) });

/** "Yes, that's me": ask an admin to join this sign-in to an existing player. */
export async function claimPlayer(formData: FormData) {
  const user = await requireUser();
  const { targetId } = ClaimInput.parse({ targetId: formData.get("targetId") });

  // Only players we actually offered — never an arbitrary id from the client
  const matches = await findMatchesFor(user.id);
  if (!matches.some((m) => m.id === targetId)) throw new Error("Not one of your suggested players");

  const pending = await db.linkRequest.findFirst({ where: { requesterId: user.id, status: "PENDING" } });
  if (!pending) {
    await db.linkRequest.create({ data: { requesterId: user.id, targetId } });
  }
  redirect("/welcome");
}

/** "No, I'm new": clear the check and start playing. */
export async function confirmNewPlayer() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { identityCheckedAt: new Date() } });
  redirect("/");
}

/** Withdraw a pending claim and choose again. */
export async function cancelClaim() {
  const user = await requireUser();
  await db.linkRequest.deleteMany({ where: { requesterId: user.id, status: "PENDING" } });
  redirect("/welcome");
}
