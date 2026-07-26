"use server";

import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireSession();
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId: user.id!,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      update: {
        userId: user.id!,
        p256dh: input.p256dh,
        auth: input.auth,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return { success: false, error: "Failed to enable notifications" };
  }
}

export async function removePushSubscription(
  endpoint: string
): Promise<{ success: boolean }> {
  try {
    const user = await requireSession();
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id! },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
