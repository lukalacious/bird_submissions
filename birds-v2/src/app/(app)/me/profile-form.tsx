"use client";

import { useActionState } from "react";
import { saveProfile } from "./profile-actions";

const field = "block min-h-12 w-full rounded-xl border border-rule bg-paper-raised px-4";

export function ProfileForm({
  name,
  username,
  regionId,
  regions,
}: {
  name: string;
  username: string;
  regionId: string;
  regions: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveProfile, null);
  const errorFor = (f: string) => (state && !state.ok && state.field === f ? state.error : null);

  return (
    <form action={action} className="max-w-md space-y-5">
      <label className="block space-y-1">
        <span className="block font-semibold">Name</span>
        <input name="name" defaultValue={name} maxLength={50} autoComplete="name" aria-describedby="name-help" className={field} />
        <span id="name-help" className={`block text-sm ${errorFor("name") ? "font-semibold text-alarm" : "text-ink-soft"}`}>
          {errorFor("name") ?? "Your real name. Admins see it."}
        </span>
      </label>

      <label className="block space-y-1">
        <span className="block font-semibold">Display name (optional)</span>
        <input
          name="username"
          defaultValue={username}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="username-help"
          className={field}
        />
        <span id="username-help" className={`block text-sm ${errorFor("username") ? "font-semibold text-alarm" : "text-ink-soft"}`}>
          {errorFor("username") ?? "Shown in Sightings instead of your name. Letters, numbers, hyphens and underscores."}
        </span>
      </label>

      <label className="block space-y-1">
        <span className="block font-semibold">Home region</span>
        <select name="regionId" defaultValue={regionId} aria-describedby="region-help" className={field}>
          <option value="">No preference</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <span id="region-help" className={`block text-sm ${errorFor("region") ? "font-semibold text-alarm" : "text-ink-soft"}`}>
          {errorFor("region") ?? "The bird list Twitch opens with. You can switch region any time."}
        </span>
      </label>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink disabled:opacity-60">
          {pending ? "Saving…" : "Save profile"}
        </button>
        {state?.ok && (
          <p role="status" className="font-semibold">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
