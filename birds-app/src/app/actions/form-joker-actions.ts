"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getFormResponses, type FormResponse } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";

// --- Bonus Joker Calculation Rules ---

interface BonusBreakdown {
  rule: string;
  value: number;
}

interface BonusResult {
  total: number;
  breakdown: BonusBreakdown[];
}

function calculateFormBonus(response: FormResponse): BonusResult {
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
  const r4 = response.goldenBirdsCount != null
    ? Math.min(response.goldenBirdsCount, 5)
    : 0;
  if (r4 !== 0) breakdown.push({ rule: `Golden birds (${response.goldenBirdsCount})`, value: r4 });

  // Rule 5: Lifers → 1 joker each, max 5
  const r5 = response.lifersCount != null
    ? Math.min(response.lifersCount, 5)
    : 0;
  if (r5 !== 0) breakdown.push({ rule: `Lifers (${response.lifersCount})`, value: r5 });

  // Rule 6: Photos → 1 joker each, max 3
  const r6 = response.photosCount != null
    ? Math.min(response.photosCount, 3)
    : 0;
  if (r6 !== 0) breakdown.push({ rule: `Photos (${response.photosCount})`, value: r6 });

  return {
    total: r1 + r2 + r3 + r4 + r5 + r6,
    breakdown,
  };
}

// --- Admin Processing ---

export interface FormJokerResult {
  email: string;
  matched: boolean;
  userId?: string;
  userName?: string;
  bonus: number;
  breakdown: BonusBreakdown[];
}

export async function processFormJokers(
  year: number,
  month: number
): Promise<{ success: boolean; results: FormJokerResult[]; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, results: [], error: "Unauthorized" };
  }

  try {
    // 1. Read form responses
    const responses = await getFormResponses(year, month);

    if (responses.length === 0) {
      return { success: true, results: [], error: "No form responses found for this month" };
    }

    // 2. Deduplicate by email (first response per email wins)
    const seenEmails = new Set<string>();
    const uniqueResponses: FormResponse[] = [];
    for (const r of responses) {
      const normalizedEmail = r.email.toLowerCase().trim();
      if (!seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        uniqueResponses.push(r);
      }
    }

    // 3. Match emails to users (case-insensitive)
    const allEmails = uniqueResponses.map((r) => r.email.toLowerCase().trim());
    const users = await prisma.user.findMany({
      where: {
        email: { in: allEmails, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    const userByEmail = new Map(
      users.map((u) => [u.email.toLowerCase(), u])
    );

    // 4. Calculate bonus for each response and upsert
    const results: FormJokerResult[] = [];

    for (const response of uniqueResponses) {
      const normalizedEmail = response.email.toLowerCase().trim();
      const user = userByEmail.get(normalizedEmail);
      const { total, breakdown } = calculateFormBonus(response);

      if (user) {
        // Read existing record to get current group jokers for totalJokers calculation
        const existing = await prisma.userJoker.findUnique({
          where: { userId_year_month: { userId: user.id, year, month } },
        });
        const existingGroupJokers = existing?.jokers || 0;

        // Upsert UserJoker — write bonusJokers and totalJokers, never touch jokers or usedJokers
        await prisma.userJoker.upsert({
          where: {
            userId_year_month: { userId: user.id, year, month },
          },
          create: {
            userId: user.id,
            year,
            month,
            jokers: 0,
            bonusJokers: total,
            totalJokers: total, // No group jokers yet on create
            usedJokers: 0,
          },
          update: {
            bonusJokers: total,
            totalJokers: existingGroupJokers + total,
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

    revalidatePath("/dashboard");
    revalidatePath("/admin/form-jokers");

    return { success: true, results };
  } catch (error) {
    console.error("Failed to process form jokers:", error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
