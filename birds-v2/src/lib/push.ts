import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Same env names as v1, so v1's keys (and phones' subscriptions) carry over. */
export function pushConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:admin@bird-submissions.vercel.app", pub, priv);
  return true;
}

/** Send to every device of these players; expired subscriptions are pruned. Returns devices reached. */
export async function sendPush(userIds: string[], payload: PushPayload): Promise<number> {
  if (!pushConfigured() || userIds.length === 0) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("Push failed", status);
      }
    })
  );
  return sent;
}
