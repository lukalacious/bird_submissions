"use client";

import { useSyncExternalStore } from "react";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

// Re-render once a minute; the server renders a stable absolute date
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

/** "3 hours ago" in the browser. Cached server HTML never shows a stale relative time. */
export function TimeAgo({ iso }: { iso: string }) {
  const now = useSyncExternalStore(subscribe, minuteNow, () => null);
  const date = new Date(iso);
  let text = date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  if (now !== null) {
    const diff = date.getTime() - now * 60_000;
    const step = STEPS.find(([, ms]) => Math.abs(diff) >= ms);
    text = step ? rtf.format(Math.round(diff / step[1]), step[0]) : "just now";
  }
  return <time dateTime={iso}>{text}</time>;
}
