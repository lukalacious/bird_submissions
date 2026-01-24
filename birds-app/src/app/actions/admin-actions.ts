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
}) {
  try {
    await requireAdmin();

    await prisma.settings.upsert({
      where: { id: "default" },
      update: {
        maxBirdsPerPeriod: input.maxBirdsPerPeriod,
        resetPeriod: input.resetPeriod,
        currentYear: input.currentYear,
      },
      create: {
        id: "default",
        maxBirdsPerPeriod: input.maxBirdsPerPeriod,
        resetPeriod: input.resetPeriod,
        currentYear: input.currentYear,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/region");
    revalidatePath("/submit");
    return { success: true };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
