"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { openMonths } from "@/lib/challenge-time";
import { getSettings } from "@/lib/settings";
import type { ActionResult } from "../../twitch/actions";

const RequestInput = z.object({
  submissionId: z.string().min(1),
  type: z.enum(["SWAP", "DELETE", "OTHER"]),
  replacementBirdId: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

export async function createChangeRequest(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requirePlayer();
  const parsed = RequestInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Choose what you'd like changed." };
  const { submissionId, type, replacementBirdId, note } = parsed.data;

  const sub = await db.submission.findFirst({ where: { id: submissionId, userId: user.id } });
  if (!sub) return { ok: false, error: "That bird isn't on your list." };
  const settings = await getSettings();
  const open = openMonths({ graceHours: settings.graceHours, timeZone: settings.timezone });
  if (open.some((m) => m.year === sub.year && m.month === sub.month)) {
    return { ok: false, error: "That month is still open, so you can change it yourself on Twitch." };
  }
  if (type === "SWAP") {
    if (!replacementBirdId) return { ok: false, error: "Pick the bird it should be." };
    const bird = await db.bird.findFirst({ where: { id: replacementBirdId, regionId: sub.regionId } });
    if (!bird) return { ok: false, error: "Pick a bird from the same region." };
  }
  if (type === "OTHER" && !note) return { ok: false, error: "Tell the admin what needs changing." };

  const pending = await db.changeRequest.findFirst({ where: { submissionId, status: "PENDING" } });
  if (pending) return { ok: false, error: "There's already a request waiting for this bird." };

  await db.changeRequest.create({
    data: {
      userId: user.id, type, year: sub.year, month: sub.month, submissionId,
      replacementBirdId: type === "SWAP" ? replacementBirdId : null, note: note || null,
    },
  });
  redirect("/me/birds?requested=1");
}
