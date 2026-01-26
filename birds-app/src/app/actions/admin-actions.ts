"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role, ResetPeriod } from "@prisma/client";

// Helper to check if current user is admin
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Add a new user
export async function addUser(input: {
  email: string;
  name?: string;
  isAdmin: boolean;
}) {
  try {
    const admin = await requireAdmin();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      return { success: false, error: "User with this email already exists" };
    }

    await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.isAdmin ? Role.ADMIN : Role.USER,
        invitedById: admin.id,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to add user:", error);
    return { success: false, error: "Failed to add user" };
  }
}

// Toggle user role between ADMIN and USER
export async function toggleUserRole(userId: string) {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const newRole = user.role === Role.ADMIN ? Role.USER : Role.ADMIN;

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/admin/users");
    return { success: true, newRole };
  } catch (error) {
    console.error("Failed to toggle user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

// Delete a user
export async function deleteUser(userId: string) {
  try {
    const admin = await requireAdmin();

    // Prevent admin from deleting themselves
    if (admin.id === userId) {
      return { success: false, error: "You cannot remove yourself" };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to remove user" };
  }
}

// Get current settings
export async function getSettings() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: "default",
          maxBirdsPerPeriod: 31,
          resetPeriod: ResetPeriod.YEARLY,
          currentYear: new Date().getFullYear(),
        },
      });
    }

    return settings;
  } catch (error) {
    console.error("Failed to get settings:", error);
    return null;
  }
}

// Update settings
export async function updateSettings(input: {
  maxBirdsPerPeriod: number;
  resetPeriod: ResetPeriod;
  currentYear: number;
  monthlyFormEmbedUrl?: string | null;
  eliminationThreshold?: number;
}) {
  try {
    await requireAdmin();

    const monthlyFormUrl = (input.monthlyFormEmbedUrl?.trim() || null) ?? null;

    await prisma.settings.upsert({
      where: { id: "default" },
      update: {
        maxBirdsPerPeriod: input.maxBirdsPerPeriod,
        resetPeriod: input.resetPeriod,
        currentYear: input.currentYear,
        monthlyFormEmbedUrl: monthlyFormUrl,
        ...(input.eliminationThreshold !== undefined && {
          eliminationThreshold: input.eliminationThreshold,
        }),
      },
      create: {
        id: "default",
        maxBirdsPerPeriod: input.maxBirdsPerPeriod,
        resetPeriod: input.resetPeriod,
        currentYear: input.currentYear,
        monthlyFormEmbedUrl: monthlyFormUrl,
        eliminationThreshold: input.eliminationThreshold ?? 30,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/submit");
    revalidatePath("/monthly-form");
    revalidatePath("/admin/elimination");
    return { success: true };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

// Update monthly settings for a specific month
export async function updateMonthlySettings(input: {
  year: number;
  month: number;
  maxBirdsPerPeriod: number;
  eliminationThreshold?: number | null;
}) {
  try {
    await requireAdmin();

    // Validate month
    if (input.month < 1 || input.month > 12) {
      return { success: false, error: "Invalid month" };
    }

    // Validate maxBirdsPerPeriod
    if (input.maxBirdsPerPeriod < 1 || input.maxBirdsPerPeriod > 100) {
      return { success: false, error: "Max birds must be between 1 and 100" };
    }

    await prisma.monthlySettings.upsert({
      where: {
        year_month: { year: input.year, month: input.month },
      },
      update: {
        maxBirdsPerPeriod: input.maxBirdsPerPeriod,
        eliminationThreshold: input.eliminationThreshold,
      },
      create: {
        year: input.year,
        month: input.month,
        maxBirdsPerPeriod: input.maxBirdsPerPeriod,
        eliminationThreshold: input.eliminationThreshold,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/submit");
    return { success: true };
  } catch (error) {
    console.error("Failed to update monthly settings:", error);
    return { success: false, error: "Failed to update monthly settings" };
  }
}

// Reset monthly settings to use global defaults
export async function resetMonthlySettings(year: number, month: number) {
  try {
    await requireAdmin();

    await prisma.monthlySettings.deleteMany({
      where: { year, month },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/submit");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset monthly settings:", error);
    return { success: false, error: "Failed to reset monthly settings" };
  }
}

// Helper function to get days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Get all monthly settings for a given year (server action version for client components)
export async function getYearlyMonthlySettings(year: number) {
  try {
    const [monthlySettings, globalSettings] = await Promise.all([
      prisma.monthlySettings.findMany({
        where: { year },
        orderBy: { month: "asc" },
      }),
      prisma.settings.findUnique({
        where: { id: "default" },
      }),
    ]);

    const globalMax = globalSettings?.maxBirdsPerPeriod ?? 31;
    const globalThreshold = globalSettings?.eliminationThreshold ?? 30;

    // Create a map for quick lookup
    const settingsMap = new Map(
      monthlySettings.map((s) => [s.month, s])
    );

    // Build array for all 12 months
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const custom = settingsMap.get(month);
      const daysInMonth = getDaysInMonth(year, month);

      months.push({
        month,
        year,
        daysInMonth,
        maxBirdsPerPeriod: custom?.maxBirdsPerPeriod ?? globalMax,
        eliminationThreshold: custom?.eliminationThreshold ?? globalThreshold,
        isCustom: !!custom,
      });
    }

    return months;
  } catch (error) {
    console.error("Failed to get yearly monthly settings:", error);
    return [];
  }
}
