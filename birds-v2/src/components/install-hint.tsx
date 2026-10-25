"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useStoredState } from "@/lib/use-stored-state";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const noop = () => () => {};
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** "Put Twitch on your home screen": a real button on Android, instructions on iPhone. */
export function InstallHint() {
  const [dismissed, setDismissed] = useStoredState("install-hint-dismissed", false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);
  const ios = useSyncExternalStore(noop, isIos, () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || standalone || (!prompt && !ios)) return null;
  return (
    <aside className="flex items-start gap-3 rounded-2xl border border-rule bg-paper-raised p-4">
      <p className="flex-1">
        <span className="block font-semibold">Put Twitch on your home screen</span>
        <span className="block text-sm text-ink-soft">
          {prompt ? "It opens like an app and can remind you before month-end." : "In Safari, tap Share, then Add to Home Screen."}
        </span>
        {prompt && (
          <button type="button" onClick={() => prompt.prompt().then(() => setPrompt(null))} className="mt-2 min-h-11 rounded-full bg-roller px-5 font-semibold text-roller-ink">
            Install Twitch
          </button>
        )}
      </p>
      <button type="button" aria-label="Dismiss" onClick={() => setDismissed(true)} className="grid size-11 place-items-center rounded-full text-ink-soft">
        <X aria-hidden className="size-5" />
      </button>
    </aside>
  );
}
