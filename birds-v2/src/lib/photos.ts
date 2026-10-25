/**
 * Photo upload rules. The browser uploads straight to Vercel Blob (Function
 * bodies cap at 4.5 MB); the server only hands out a token for a path inside
 * the player's own folder, then checks the returned URL before saving it.
 */
import { getChallengeMonth, type ChallengeMonth } from "@/lib/challenge-time";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
// public stores are <id>.public.blob…, private ones <id>.private.blob…
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
const MEDIA_FOLDERS = ["photos/", "avatars/"];

/** Every photo lives under photos/<userId>/<submissionId>… */
export function photoPath(userId: string, submissionId: string) {
  return `photos/${userId}/${submissionId}.jpg`;
}

/** Profile pictures live at avatars/<userId>… */
export function avatarPath(userId: string) {
  return `avatars/${userId}.jpg`;
}

/** Is this a Blob URL holding this player's profile picture? */
export function isOwnAvatarUrl(url: string, userId: string): boolean {
  // addRandomSuffix makes avatars/<id>-<random>.jpg; the dash stops u1 matching u10
  return isBlobUrlUnder(url, `/avatars/${userId}-`);
}

function isBlobUrlUnder(url: string, prefix: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && parsed.hostname.endsWith(BLOB_HOST_SUFFIX) && parsed.pathname.startsWith(prefix);
}

/** Is this a Blob URL this player was allowed to upload for this bird? */
export function isOwnPhotoUrl(url: string, userId: string, submissionId: string): boolean {
  // addRandomSuffix turns <id>.jpg into <id>-<random>.jpg
  return isBlobUrlUnder(url, `/photos/${userId}/${submissionId}-`);
}

/**
 * The stores are private: images are served to signed-in players through
 * /media/<pathname> (app/media/[...path]/route.ts). Other URLs (Google
 * profile pictures) pass through unchanged.
 */
export function mediaUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return url;
  return `/media${parsed.pathname}`;
}

/** Only our own folders can be read through /media. */
export function isMediaPath(pathname: string): boolean {
  return MEDIA_FOLDERS.some((f) => pathname.startsWith(f)) && !pathname.includes("..");
}

/** Soft check: was the photo (by its EXIF date) taken in the month it's filed under? */
export function takenInMonth(takenAt: Date | null, month: ChallengeMonth, timeZone?: string): boolean | null {
  if (!takenAt || Number.isNaN(takenAt.getTime())) return null;
  const m = getChallengeMonth(takenAt, timeZone);
  return m.year === month.year && m.month === month.month;
}
