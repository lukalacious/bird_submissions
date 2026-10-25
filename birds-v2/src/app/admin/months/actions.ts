"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { SETTINGS_TAG } from "@/lib/settings";
import type { ActionResult } from "@/app/(app)/twitch/actions";

const optionalCount = z.union([z.literal(""), z.coerce.number().int().min(0).max(31)]);
const MonthInput = z.object({
  year: z.coerce.number().int().min(2026).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  maxBirds: optionalCount,
  threshold: optionalCount,
  golden: z.array(z.string().min(1)).max(10),
  photo: z.array(z.string().min(1)).max(10),
});

export async function saveMonth(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = MonthInput.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    maxBirds: formData.get("maxBirds"),
    threshold: formData.get("threshold"),
    golden: formData.getAll("golden"),
    photo: formData.getAll("photo"),
  });
  if (!parsed.success) return { ok: false, error: "Some values weren't valid. Numbers must be 0–31." };
  const { year, month, maxBirds, threshold, golden, photo } = parsed.data;

  await db.$transaction(async (tx) => {
    if (maxBirds === "" && threshold === "") {
      await tx.monthlySettings.deleteMany({ where: { year, month } });
    } else {
      const settings = await tx.settings.findUnique({ where: { id: "default" } });
      const data = {
        maxBirdsPerPeriod: maxBirds === "" ? (settings?.maxBirdsPerPeriod ?? 31) : maxBirds,
        eliminationThreshold: threshold === "" ? null : threshold,
      };
      await tx.monthlySettings.upsert({ where: { year_month: { year, month } }, create: { year, month, ...data }, update: data });
    }
    await tx.specialBird.deleteMany({ where: { year, month } });
    await tx.specialBird.createMany({
      data: [
        ...golden.map((speciesId) => ({ year, month, kind: "GOLDEN" as const, speciesId })),
        ...photo.map((speciesId) => ({ year, month, kind: "PHOTO" as const, speciesId })),
      ],
      skipDuplicates: true,
    });
  });
  updateTag(SETTINGS_TAG);
  return { ok: true, message: "Month saved. Players see the changes straight away." };
}
