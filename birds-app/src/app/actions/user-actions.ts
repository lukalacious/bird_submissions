"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUsername(username: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate username
  const trimmed = username.trim();
  if (!trimmed) {
    return { success: false, error: "Username cannot be empty" };
  }
  if (trimmed.length < 3) {
    return { success: false, error: "Username must be at least 3 characters" };
  }
  if (trimmed.length > 30) {
    return { success: false, error: "Username must be 30 characters or less" };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { success: false, error: "Username can only contain letters, numbers, underscores, and hyphens" };
  }

  // Check if username is taken (case-insensitive)
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: trimmed, mode: "insensitive" },
      NOT: { id: session.user.id },
    },
  });

  if (existing) {
    return { success: false, error: "Username is already taken" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { username: trimmed },
    });

    revalidatePath("/profile");
    revalidatePath("/activity");
    revalidatePath("/community");

    return { success: true };
  } catch (error) {
    console.error("Failed to update username:", error);
    return { success: false, error: "Failed to update username" };
  }
}

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      defaultRegionId: true,
      createdAt: true,
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  return user;
}

export async function getDisplayName(user: { name?: string | null; username?: string | null }) {
  return user.username || user.name || "Anonymous";
}

export async function updateUserProfile(data: { name?: string; username?: string; defaultRegionId?: string | null }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const updates: { name?: string | null; username?: string | null; defaultRegionId?: string | null } = {};

  // Validate name if provided
  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (trimmedName.length > 0 && trimmedName.length < 2) {
      return { success: false, error: "Name must be at least 2 characters" };
    }
    if (trimmedName.length > 50) {
      return { success: false, error: "Name must be 50 characters or less" };
    }
    updates.name = trimmedName || null;
  }

  // Validate username if provided
  if (data.username !== undefined) {
    const trimmedUsername = data.username.trim();
    if (trimmedUsername) {
      if (trimmedUsername.length < 3) {
        return { success: false, error: "Username must be at least 3 characters" };
      }
      if (trimmedUsername.length > 30) {
        return { success: false, error: "Username must be 30 characters or less" };
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return { success: false, error: "Username can only contain letters, numbers, underscores, and hyphens" };
      }

      // Check if username is taken (case-insensitive)
      const existing = await prisma.user.findFirst({
        where: {
          username: { equals: trimmedUsername, mode: "insensitive" },
          NOT: { id: session.user.id },
        },
      });

      if (existing) {
        return { success: false, error: "Username is already taken" };
      }
      updates.username = trimmedUsername;
    } else {
      updates.username = null;
    }
  }

  // Validate defaultRegionId if provided
  if (data.defaultRegionId !== undefined) {
    if (data.defaultRegionId) {
      // Verify region exists
      const region = await prisma.region.findUnique({
        where: { id: data.defaultRegionId },
      });
      if (!region) {
        return { success: false, error: "Invalid region selected" };
      }
      updates.defaultRegionId = data.defaultRegionId;
    } else {
      updates.defaultRegionId = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
    });

    revalidatePath("/profile");
    revalidatePath("/activity");
    revalidatePath("/community");
    revalidatePath("/dashboard");
    revalidatePath("/twitch");

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}
