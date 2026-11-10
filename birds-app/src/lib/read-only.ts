/**
 * READ_ONLY=1 freezes v1 once the game has moved to v2 (cutover, 31 Dec 2026).
 *
 * Players can still sign in and browse the 2026 record. Every write is
 * refused with a clear message, the three crons skip their work, and a
 * banner points at the new app. Unset (the default) changes nothing, so this
 * is safe to merge and deploy long before cutover.
 *
 * To flip it: Vercel → bird-submissions → Settings → Environment Variables →
 * add READ_ONLY = 1 (Production) → redeploy. The runbook is in
 * birds-v2/MANUAL-TODO.md → F.
 */

export const READ_ONLY_MESSAGE =
  "Twitch has moved to the new app. This site is a read-only record of the 2026 season.";

/** Where the game lives now. Override with NEW_APP_URL if the domain changes. */
export const NEW_APP_URL = process.env.NEW_APP_URL || "https://bird-submissions.vercel.app";

export function isReadOnly(env: Record<string, string | undefined> = process.env): boolean {
  return env.READ_ONLY === "1";
}

/** The error object every server action returns when writes are off. */
export function readOnlyError() {
  return { success: false as const, error: READ_ONLY_MESSAGE };
}
