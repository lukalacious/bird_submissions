"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { SETTINGS_TAG } from "@/lib/settings";
import type { ActionResult } from "@/app/(app)/twitch/actions";

const SettingsInput = z.object({
  currentYear: z.coerce.number().int().min(2026).max(2100),
  maxBirdsPerPeriod: z.coerce.number().int().min(1).max(31),
  eliminationThreshold: z.coerce.number().int().min(0).max(31),
  graceHours: z.coerce.number().int().min(0).max(168),
  checkInDeadlineDay: z.coerce.number().int().min(1).max(28),
  // unchecked checkboxes are simply absent from the form data
  poolFractionalJokers: z.literal("yes").optional(),
  maxEmptyMonths: z.union([z.literal(""), z.coerce.number().int().min(1).max(12)]),
  rules: z.string().max(5000).optional(),
});

export async function saveSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = SettingsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted values: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const s = parsed.data;
  const data = {
    currentYear: s.currentYear,
    maxBirdsPerPeriod: s.maxBirdsPerPeriod,
    eliminationThreshold: s.eliminationThreshold,
    graceHours: s.graceHours,
    checkInDeadlineDay: s.checkInDeadlineDay,
    poolFractionalJokers: s.poolFractionalJokers === "yes",
    maxEmptyMonths: s.maxEmptyMonths === "" ? null : s.maxEmptyMonths,
    rules: s.rules || null,
  };
  await db.settings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  updateTag(SETTINGS_TAG);
  return { ok: true, message: "Settings saved." };
}
