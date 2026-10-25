"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { applyChangeRequest } from "@/lib/change-requests";
import { feedTag, leaderboardTag } from "@/lib/tags";

const Input = z.object({ id: z.string().min(1), adminNote: z.string().trim().max(500).optional() });

export async function approveChange(formData: FormData) {
  const admin = await requireAdmin();
  const { id } = Input.parse(Object.fromEntries(formData));
  const req = await db.changeRequest.findUniqueOrThrow({ where: { id } });
  const error = await applyChangeRequest(id, admin.id);
  if (error) redirect(`/admin/changes?error=${encodeURIComponent(error)}`);
  updateTag(leaderboardTag(req));
  updateTag(feedTag);
  revalidatePath("/admin/changes");
}

export async function rejectChange(formData: FormData) {
  const admin = await requireAdmin();
  const { id, adminNote } = Input.parse(Object.fromEntries(formData));
  await db.changeRequest.update({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", adminNote: adminNote || null, resolvedById: admin.id, resolvedAt: new Date() },
  });
  revalidatePath("/admin/changes");
}
