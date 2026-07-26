"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  savePushSubscription,
  removePushSubscription,
} from "@/app/actions/push-actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Enables/disables push notifications (month-end reminders, golden bird
 * announcements). Hidden when the browser doesn't support push or VAPID
 * keys aren't configured. On iOS, requires the app to be installed to the
 * home screen first (iOS 16.4+).
 */
export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setSupported(true);
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [vapidKey]);

  if (!supported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await removePushSubscription(existing.endpoint);
        await existing.unsubscribe();
        setSubscribed(false);
        toast.success("Notifications off");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were blocked — enable them in browser settings");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!),
      });
      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      if (result.success) {
        setSubscribed(true);
        toast.success("You'll get month-end reminders and bonus bird announcements");
      } else {
        toast.error(result.error || "Failed to enable notifications");
      }
    } catch (error) {
      console.error("Push subscribe failed:", error);
      toast.error("Couldn't enable notifications on this device");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={busy}>
      {subscribed ? (
        <>
          <BellOff className="h-4 w-4 mr-2" />
          Disable notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-2" />
          Enable notifications
        </>
      )}
    </Button>
  );
}
