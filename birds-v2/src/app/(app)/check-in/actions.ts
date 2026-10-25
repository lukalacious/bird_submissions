"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { openCheckInMonth } from "@/lib/challenge-time";
import { recalculateBonusJokers } from "@/lib/bonus-db";
import { getSettings } from "@/lib/settings";
import type { ActionResult } from "../twitch/actions";

const count = z.coerce.number().int().min(0).max(99);
const CheckInInput = z.object({
  within15km: z.enum(["yes", "no"]),
  beyond750km: z.enum(["yes", "no"]),
  nonMotorisedCount: count,
  goldenCount: count,
  liferCount: count,
  photoCount: count,
  primaryLocation: z.string().trim().max(120).optional(),
});

/** Save (or update) this month's check-in. The month is decided here, not by the form. */
export async function saveCheckIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requirePlayer();
  const settings = await getSettings();
  const month = openCheckInMonth({ deadlineDay: settings.checkInDeadlineDay, timeZone: settings.timezone });
  if (!month) return { ok: false, error: "The check-in is closed right now. It opens again on the 20th." };

  const parsed = CheckInInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Answer every question with a number of 0 or more." };
  const a = parsed.data;

  const birdCount = await db.submission.count({ where: { userId: user.id, ...month } });
  if (a.nonMotorisedCount > birdCount) {
    return {
      ok: false,
      error: `You have ${birdCount} bird${birdCount === 1 ? "" : "s"} this month, so non-motorised can't be more than that.`,
    };
  }

  const answers = {
    within15km: a.within15km === "yes",
    beyond750km: a.beyond750km === "yes",
    nonMotorisedCount: a.nonMotorisedCount,
    goldenCount: a.goldenCount,
    liferCount: a.liferCount,
    photoCount: a.photoCount,
    primaryLocation: a.primaryLocation || null,
  };
  const bonus = await db.$transaction(async (tx) => {
    await tx.monthlyCheckIn.upsert({
      where: { userId_year_month: { userId: user.id, ...month } },
      create: { userId: user.id, ...month, ...answers },
      update: answers,
    });
    return recalculateBonusJokers(tx, user.id, month);
  });

  return { ok: true, message: `Saved. Your ${bonus >= 0 ? "bonus" : "adjustment"} for the month is ${bonus} joker${Math.abs(bonus) === 1 ? "" : "s"}.` };
}
