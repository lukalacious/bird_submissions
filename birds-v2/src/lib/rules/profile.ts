/**
 * Profile fields a player can edit (v1's rules). Blank clears the field:
 * a blank display name falls back to the player's real name.
 */
export type ProfileInput = { name: string; username: string };
export type ProfileResult =
  | { ok: true; name: string | null; username: string | null }
  | { ok: false; field: "name" | "username"; error: string };

export function validateProfile(input: ProfileInput): ProfileResult {
  const name = input.name.trim().replace(/\s+/g, " ");
  const username = input.username.trim();
  if (name && (name.length < 2 || name.length > 50)) return { ok: false, field: "name", error: "Your name needs 2 to 50 characters." };
  if (username) {
    if (username.length < 3 || username.length > 30) return { ok: false, field: "username", error: "A display name needs 3 to 30 characters." };
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { ok: false, field: "username", error: "A display name can use letters, numbers, hyphens and underscores, with no spaces." };
    }
  }
  return { ok: true, name: name || null, username: username || null };
}
