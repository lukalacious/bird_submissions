"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { openMonths } from "@/lib/challenge-time";
import { recalculateGroupJokers } from "@/lib/jokers-db";
import { checkCap, findSpeciesConflicts } from "@/lib/rules/submission";
import { getMonthRules, getSettings } from "@/lib/settings";
import { feedTag, leaderboardTag } from "@/lib/tags";
import { canTwitchWhileEliminated } from "@/lib/site";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Which open month a request targets. The client only says "current" or
 * "previous" — the actual year/month always comes from challenge-time.
 */
async function resolveMonth(target: "current" | "previous") {
  const settings = await getSettings();
  const open = openMonths({ graceHours: settings.graceHours, timeZone: settings.timezone });
  const month = target === "current" ? open[0] : open[1];
  return month ?? null;
}

const SubmitInput = z.object({
  regionId: z.string().min(1),
  target: z.enum(["current", "previous"]),
  birdIds: z.array(z.string().min(1)).max(31),
  liferBirdIds: z.array(z.string().min(1)).max(31),
  customNames: z.array(z.string().trim().min(2).max(80)).max(31),
});

export async function submitBirds(input: z.input<typeof SubmitInput>): Promise<ActionResult> {
  const user = await requirePlayer();
  const parsed = SubmitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something in that list wasn't valid. Refresh and try again." };
  const { regionId, target, birdIds, liferBirdIds, customNames } = parsed.data;
  if (birdIds.length + customNames.length === 0) return { ok: false, error: "Add at least one bird first." };

  const month = await resolveMonth(target);
  if (!month) return { ok: false, error: "That month has closed. Request a change from your list instead." };

  const [rules, birds] = await Promise.all([
    getMonthRules(month),
    db.bird.findMany({
      where: { id: { in: birdIds }, regionId },
      select: { id: true, speciesId: true, displayName: true },
    }),
  ]);
  if (birds.length !== birdIds.length) return { ok: false, error: "Some birds aren't in this region's list." };

  try {
    const result = await db.$transaction(async (tx) => {
      // One submit per player at a time — keeps the cap check honest
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${user.id}))`;

      const status = await tx.userChallengeStatus.findUnique({
        where: { userId_year: { userId: user.id, year: month.year } },
        select: { isEliminated: true },
      });
      if (status?.isEliminated && !canTwitchWhileEliminated(user.role)) {
        return { ok: false as const, error: "You're out of this season's challenge." };
      }

      const [count, twitched] = await Promise.all([
        tx.submission.count({ where: { userId: user.id, ...month } }),
        tx.submission.findMany({
          where: { userId: user.id, year: month.year },
          select: { speciesId: true, customName: true },
        }),
      ]);

      const cap = checkCap(count, birds.length + customNames.length, rules.maxBirds);
      if (!cap.ok) {
        return { ok: false as const, error: `You can add ${cap.remaining} more bird${cap.remaining === 1 ? "" : "s"} this month.` };
      }
      const conflicts = findSpeciesConflicts(
        birds.map((b) => ({ birdId: b.id, speciesId: b.speciesId, displayName: b.displayName })),
        new Set(twitched.map((t) => t.speciesId).filter((s): s is string => !!s))
      );
      if (conflicts.length) {
        return { ok: false as const, error: `Already twitched this season: ${conflicts.join(", ")}.` };
      }
      const customTaken = new Set(twitched.map((t) => t.customName?.toLowerCase()).filter(Boolean));
      const customRepeat = customNames.find((n) => customTaken.has(n.toLowerCase()));
      if (customRepeat) return { ok: false as const, error: `Already twitched this season: ${customRepeat}.` };

      const lifers = new Set(liferBirdIds);
      await tx.submission.createMany({
        data: [
          ...birds.map((b) => ({
            userId: user.id, regionId, birdId: b.id, speciesId: b.speciesId, ...month, isLifer: lifers.has(b.id),
          })),
          ...customNames.map((customName) => ({ userId: user.id, regionId, customName, ...month })),
        ],
      });

      const before = (await tx.userJoker.findUnique({
        where: { userId_year_month: { userId: user.id, ...month } },
        select: { jokers: true },
      }))?.jokers ?? 0;
      const after = await recalculateGroupJokers(tx, user.id, month);
      return { ok: true as const, added: birds.length + customNames.length, jokerGain: after - before };
    });

    if (!result.ok) return result;
    updateTag(leaderboardTag(month));
    updateTag(feedTag);
    const birdsText = `${result.added} bird${result.added === 1 ? "" : "s"} added`;
    return {
      ok: true,
      message: result.jokerGain > 0 ? `${birdsText}. +${result.jokerGain} joker${result.jokerGain === 1 ? "" : "s"} for next month.` : `${birdsText}.`,
    };
  } catch (e) {
    // Unique constraint = a double-submit raced past the checks
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "Some of those birds were already added." };
    throw e;
  }
}

const RemoveInput = z.object({ submissionId: z.string().min(1) });

/** Players fix their own list while the month (or its grace window) is open. */
export async function removeBird(input: z.input<typeof RemoveInput>): Promise<ActionResult> {
  const user = await requirePlayer();
  const { submissionId } = RemoveInput.parse(input);
  const settings = await getSettings();
  const open = openMonths({ graceHours: settings.graceHours, timeZone: settings.timezone });

  const sub = await db.submission.findFirst({ where: { id: submissionId, userId: user.id } });
  if (!sub) return { ok: false, error: "That bird isn't on your list." };
  const month = open.find((m) => m.year === sub.year && m.month === sub.month);
  if (!month) return { ok: false, error: "That month has closed. Request a change instead." };

  await db.$transaction(async (tx) => {
    await tx.submission.delete({ where: { id: sub.id } });
    await recalculateGroupJokers(tx, user.id, month);
  });
  updateTag(leaderboardTag(month));
  updateTag(feedTag);
  return { ok: true, message: "Removed." };
}
