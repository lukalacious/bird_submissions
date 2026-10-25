/**
 * Photo upload rules. The browser uploads straight to Vercel Blob (Function
 * bodies cap at 4.5 MB); the server only hands out a token for a path inside
 * the player's own folder, then checks the returned URL before saving it.
 */
import { getChallengeMonth, type ChallengeMonth } from "@/lib/challenge-time";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** Every photo lives under photos/<userId>/<submissionId>… */
export function photoPath(userId: string, submissionId: string) {
  return `photos/${userId}/${submissionId}.jpg`;
}

/** Is this a Blob URL this player was allowed to upload for this bird? */
export function isOwnPhotoUrl(url: string, userId: string, submissionId: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname.endsWith(BLOB_HOST_SUFFIX) &&
    // addRandomSuffix turns <id>.jpg into <id>-<random>.jpg
    parsed.pathname.startsWith(`/photos/${userId}/${submissionId}`)
  );
}

/** Soft check: was the photo (by its EXIF date) taken in the month it's filed under? */
export function takenInMonth(takenAt: Date | null, month: ChallengeMonth, timeZone?: string): boolean | null {
  if (!takenAt || Number.isNaN(takenAt.getTime())) return null;
  const m = getChallengeMonth(takenAt, timeZone);
  return m.year === month.year && m.month === month.month;
}
