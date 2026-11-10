"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { sendPush } from "@/lib/push";
import { goldenAnnouncement } from "@/lib/rules/reminders";
import { SETTINGS_TAG, getSettings } from "@/lib/settings";
import type { ActionResult } from "@/app/(app)/twitch/actions";

const optionalCount = z.union([z.literal(""), z.coerce.number().int().min(0).max(31)]);
const MonthInput = z.object({
  year: z.coerce.number().int().min(2026).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  maxBirds: optionalCount,
  threshold: optionalCount,
  golden: z.array(z.string().min(1)).max(10),
});

export async function saveMonth(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = MonthInput.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    maxBirds: formData.get("maxBirds"),
    threshold: formData.get("threshold"),
    golden: formData.getAll("golden"),
  });
  if (!parsed.success) return { ok: false, error: "Some values weren't valid. Numbers must be 0–31." };
  const { year, month, maxBirds, threshold, golden } = parsed.data;

  const before = await db.specialBird.findMany({ where: { year, month, kind: "GOLDEN" }, select: { speciesId: true } });

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
      // photos are proof for golden birds only (no separate photo-bird list)
      data: golden.map((speciesId) => ({ year, month, kind: "GOLDEN" as const, speciesId })),
      skipDuplicates: true,
    });
  });
  updateTag(SETTINGS_TAG);

  // Tell players when this month's golden birds are set or changed (v1 did; never for other months)
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const added = golden.filter((id) => !before.some((b) => b.speciesId === id));
  let told = 0;
  if (current.year === year && current.month === month && added.length > 0) {
    const [species, players] = await Promise.all([
      db.species.findMany({ where: { id: { in: golden } }, select: { birds: { select: { displayName: true }, orderBy: { displayName: "asc" }, take: 1 } } }),
      db.user.findMany({
        where: { pushSubscriptions: { some: {} }, NOT: { challengeStatus: { some: { year, isEliminated: true } } } },
        select: { id: true },
      }),
    ]);
    const names = species.map((sp) => sp.birds[0]?.displayName).filter((n): n is string => Boolean(n)).sort();
    told = await sendPush(players.map((p) => p.id), goldenAnnouncement(month, names, before.length > 0));
  }
  return {
    ok: true,
    message: told > 0 ? `Month saved. ${told} ${told === 1 ? "phone was" : "phones were"} told about the golden birds.` : "Month saved. Players see the changes straight away.",
  };
}
