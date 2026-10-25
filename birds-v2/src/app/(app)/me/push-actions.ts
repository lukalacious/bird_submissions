"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";

const Subscription = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown) {
  const user = await requirePlayer();
  const { endpoint, keys } = Subscription.parse(input);
  // An endpoint is one browser; if someone else signs in on it, it moves to them
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
}

export async function removePushSubscription(endpoint: string) {
  const user = await requirePlayer();
  await db.pushSubscription.deleteMany({ where: { endpoint: z.url().parse(endpoint), userId: user.id } });
}
