"use server";

import prisma from "@/lib/prisma";
import { isAdminSession, requireAdmin } from "@/lib/auth-helpers";
import { type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { processFormJokersCore, type FormJokerResult } from "@/lib/form-jokers";

export type { FormJokerResult };

// Admin trigger — the daily cron (api/cron/process-form-jokers) runs the
// same core automatically; this stays for manual re-runs and past months.
export async function processFormJokers(
  year: number,
  month: number
): Promise<{ success: boolean; results: FormJokerResult[]; error?: string }> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { success: false, results: [], error: "Unauthorized" };
  }

  try {
    const result = await processFormJokersCore(year, month, admin.id!);

    revalidatePath("/dashboard");
    revalidatePath("/admin/form-jokers");

    return result;
  } catch (error) {
    console.error("Failed to process form jokers:", error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// --- Manual Assignment for Unmatched Emails ---

export async function assignBonusToUser(
  userId: string,
  bonus: number,
  breakdown: { rule: string; value: number }[],
  year: number,
  month: number
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existing = await prisma.userJoker.findUnique({
      where: { userId_year_month: { userId, year, month } },
    });
    const existingGroupJokers = existing?.jokers || 0;

    await prisma.userJoker.upsert({
      where: { userId_year_month: { userId, year, month } },
      create: {
        userId,
        year,
        month,
        jokers: 0,
        bonusJokers: bonus,
        bonusBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        totalJokers: bonus,
        usedJokers: 0,
      },
      update: {
        bonusJokers: bonus,
        bonusBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        totalJokers: existingGroupJokers + bonus,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/form-jokers");

    return { success: true };
  } catch (error) {
    console.error("Failed to assign bonus:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// --- Load Saved Processing Results ---

export async function getProcessingResults(
  year: number,
  month: number
): Promise<FormJokerResult[] | null> {
  if (!(await isAdminSession())) {
    return null;
  }

  const log = await prisma.processingLog.findFirst({
    where: { type: "bonus_jokers", year, month },
    orderBy: { processedAt: "desc" },
    select: { results: true },
  });

  if (!log?.results) return null;
  return log.results as unknown as FormJokerResult[];
}

// --- User List for Matching Dropdown ---

export async function getAllUsersForMatching(): Promise<
  { id: string; name: string; email: string }[]
> {
  if (!(await isAdminSession())) {
    return [];
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, email: true },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.username || u.name || u.email,
    email: u.email,
  }));
}
