/**
 * Session-free bonus-joker processing from monthly Google Form responses.
 * Used by the admin server action (form-joker-actions.ts) AND the daily
 * cron (api/cron/process-form-jokers), so it must not import auth.
 *
 * Safe to re-run: bonusJokers are recomputed from the sheet (set, not
 * added), and totalJokers is rebuilt from existing group jokers + bonus.
 */
import prisma from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import { getFormResponses, type FormResponse } from "@/lib/google-sheets";

export interface BonusBreakdown {
  rule: string;
  value: number;
}

export interface FormJokerResult {
  email: string;
  matched: boolean;
  userId?: string;
  userName?: string;
  bonus: number;
  breakdown: BonusBreakdown[];
}

export function calculateFormBonus(response: FormResponse): {
  total: number;
  breakdown: BonusBreakdown[];
} {
  const breakdown: BonusBreakdown[] = [];

  // Rule 1: All birds within 15km → +5
  const r1 = response.within15km === true ? 5 : 0;
  if (r1 !== 0) breakdown.push({ rule: "All within 15km", value: r1 });

  // Rule 2: Any bird beyond 750km → -3
  const r2 = response.anyBeyond750km === true ? -3 : 0;
  if (r2 !== 0) breakdown.push({ rule: "Beyond 750km penalty", value: r2 });

  // Rule 3: Non-motorised birds → 1 joker per 10 birds, max 3
  const r3 = response.nonMotorisedCount != null
    ? Math.min(Math.floor(response.nonMotorisedCount / 10), 3)
    : 0;
  if (r3 !== 0) breakdown.push({ rule: `Non-motorised (${response.nonMotorisedCount} birds)`, value: r3 });

  // Rule 4: Golden birds → 1 joker each, max 5
  const r4 = response.goldenBirdsCount != null ? Math.min(response.goldenBirdsCount, 5) : 0;
  if (r4 !== 0) breakdown.push({ rule: `Golden birds (${response.goldenBirdsCount})`, value: r4 });

  // Rule 5: Lifers → 1 joker each, max 5
  const r5 = response.lifersCount != null ? Math.min(response.lifersCount, 5) : 0;
  if (r5 !== 0) breakdown.push({ rule: `Lifers (${response.lifersCount})`, value: r5 });

  // Rule 6: Photos → 1 joker each, max 3
  const r6 = response.photosCount != null ? Math.min(response.photosCount, 3) : 0;
  if (r6 !== 0) breakdown.push({ rule: `Photos (${response.photosCount})`, value: r6 });

  return { total: r1 + r2 + r3 + r4 + r5 + r6, breakdown };
}

// Wrong emails people keep entering on the Google Form -> their real account.
// Applied before dedupe/matching so bonus jokers land on the right user.
const EMAIL_ALIASES: Record<string, string> = {
  "davesgear48@gmail.com": "geardave0@gmail.com", // Dave Gear, July 2026
  "shaun.wytske@gmail.com": "chamberlainshaun1@gmail.com", // Shaun Chamberlain, May 2026
};

export function canonicalEmail(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  return EMAIL_ALIASES[normalized] ?? normalized;
}

export async function processFormJokersCore(
  year: number,
  month: number,
  processedBy: string
): Promise<{ success: boolean; results: FormJokerResult[]; error?: string }> {
  // 1. Read form responses
  const responses = await getFormResponses(year, month);

  if (responses.length === 0) {
    return { success: true, results: [], error: "No form responses found for this month" };
  }

  // 2. Deduplicate by (alias-resolved) email — first response per email wins
  const seenEmails = new Set<string>();
  const uniqueResponses: FormResponse[] = [];
  for (const r of responses) {
    const normalizedEmail = canonicalEmail(r.email);
    if (!seenEmails.has(normalizedEmail)) {
      seenEmails.add(normalizedEmail);
      uniqueResponses.push(r);
    }
  }

  // 3. Match emails to users (case-insensitive, alias-resolved)
  const allEmails = uniqueResponses.map((r) => canonicalEmail(r.email));
  const users = await prisma.user.findMany({
    where: {
      email: { in: allEmails, mode: "insensitive" },
    },
    select: { id: true, email: true, name: true, username: true },
  });
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  // 4. Calculate bonus for each response and upsert
  const results: FormJokerResult[] = [];

  for (const response of uniqueResponses) {
    const normalizedEmail = canonicalEmail(response.email);
    const user = userByEmail.get(normalizedEmail);
    const { total, breakdown } = calculateFormBonus(response);

    if (user) {
      // Read existing record to get current group jokers for totalJokers calculation
      const existing = await prisma.userJoker.findUnique({
        where: { userId_year_month: { userId: user.id, year, month } },
      });
      const existingGroupJokers = existing?.jokers || 0;

      // Merge in manual photo awards (stored on Submission rows) so the
      // recompute never wipes admin-granted photo jokers
      const photoAwards = await prisma.submission.findMany({
        where: {
          userId: user.id,
          year,
          month,
          photoAwardJokers: { gt: 0 },
        },
        select: { birdName: true, photoAwardJokers: true },
      });
      const photoTotal = photoAwards.reduce((sum, p) => sum + p.photoAwardJokers, 0);
      const fullBreakdown = [
        ...breakdown,
        ...photoAwards.map((p) => ({
          rule: `Photo award: ${p.birdName}`,
          value: p.photoAwardJokers,
        })),
      ];
      const bonusTotal = total + photoTotal;

      // Upsert UserJoker — write bonusJokers, bonusBreakdown, and totalJokers;
      // never touch jokers or usedJokers
      await prisma.userJoker.upsert({
        where: { userId_year_month: { userId: user.id, year, month } },
        create: {
          userId: user.id,
          year,
          month,
          jokers: 0,
          bonusJokers: bonusTotal,
          bonusBreakdown: fullBreakdown as unknown as Prisma.InputJsonValue,
          totalJokers: bonusTotal, // No group jokers yet on create
          usedJokers: 0,
        },
        update: {
          bonusJokers: bonusTotal,
          bonusBreakdown: fullBreakdown as unknown as Prisma.InputJsonValue,
          totalJokers: existingGroupJokers + bonusTotal,
        },
      });

      results.push({
        email: response.email,
        matched: true,
        userId: user.id,
        userName: user.username || user.name || undefined,
        bonus: total,
        breakdown,
      });
    } else {
      results.push({
        email: response.email,
        matched: false,
        bonus: total,
        breakdown,
      });
    }
  }

  // 5. Write processing log for audit trail
  const matchedCount = results.filter((r) => r.matched).length;
  const unmatchedCount = results.filter((r) => !r.matched).length;
  await prisma.processingLog.create({
    data: {
      type: "bonus_jokers",
      year,
      month,
      processedBy,
      matchedCount,
      unmatchedCount,
      results: results as unknown as Prisma.InputJsonValue,
    },
  });

  return { success: true, results };
}
