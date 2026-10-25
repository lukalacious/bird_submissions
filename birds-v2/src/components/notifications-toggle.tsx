"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/(app)/me/push-actions";

type State = "loading" | "unsupported" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function detect(publicKey: string | null): Promise<State> {
  if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

/** Month-end and check-in reminders on this phone. */
export function NotificationsToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    detect(publicKey).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function toggle() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await removePushSubscription(existing.endpoint);
        await existing.unsubscribe();
        setState("off");
      } else {
        if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
        await savePushSubscription(sub.toJSON());
        setState("on");
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  return (
    <section aria-labelledby="notify-heading" className="space-y-2">
      <h2 id="notify-heading" className="text-xl font-semibold">Reminders</h2>
      {state === "unsupported" && (
        <p className="text-ink-soft">This browser can&apos;t show reminders. On iPhone, add Twitch to your Home Screen first (Share, then Add to Home Screen).</p>
      )}
      {state === "blocked" && <p className="text-ink-soft">Notifications are blocked for Twitch. Turn them on in your phone&apos;s settings for this site.</p>}
      {(state === "on" || state === "off") && (
        <>
          <p className="text-ink-soft">A nudge 3 days before month-end, and before the check-in closes.</p>
          <button type="button" onClick={toggle} disabled={busy} aria-pressed={state === "on"} className="min-h-12 rounded-full border border-rule px-6 font-semibold disabled:opacity-60">
            {state === "on" ? "Turn reminders off" : "Turn reminders on"}
          </button>
        </>
      )}
    </section>
  );
}
