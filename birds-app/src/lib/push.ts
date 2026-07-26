/**
 * Web Push sender. Requires VAPID env vars:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 * (generate once with: npx web-push generate-vapid-keys)
 * Silently no-ops when keys are missing so the app works without push.
 */
import webpush from "web-push";
import prisma from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

function configured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:admin@bird-submissions.vercel.app", pub, priv);
  return true;
}

async function send(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
): Promise<number> {
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired/unsubscribed — prune it
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("Push send failed:", error);
        }
      }
    })
  );
  return sent;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configured()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  return send(subs, payload);
}

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  if (!configured()) return 0;
  const subs = await prisma.pushSubscription.findMany();
  return send(subs, payload);
}
