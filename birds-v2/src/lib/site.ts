/**
 * STAGING_SITE=1 marks the test site (twitch-v2 until cutover). It shows a
 * banner and lets admins play even when eliminated, so they can test.
 * Must be removed from the project before it becomes the real app
 * (see MANUAL-TODO.md → cutover).
 */
export const isStagingSite = process.env.STAGING_SITE === "1";

/** Eliminated players can't twitch — except admins testing on the staging site. */
export function canTwitchWhileEliminated(role: string) {
  return isStagingSite && role === "ADMIN";
}
