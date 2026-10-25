"use client";

/**
 * Phone photo → small JPEG → Vercel Blob, with no web worker or CDN script.
 * (v2 first used browser-image-compression; its worker loads code from a CDN
 * and, when that's blocked or the signal drops, never settles — players saw
 * "Preparing…" forever.) Every step is time-limited so it can't hang.
 */

const withTimeout = <T>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} took too long`)), ms))]);

export async function readTakenAt(file: File): Promise<Date | null> {
  try {
    const { parse } = await import("exifr");
    const exif = await withTimeout(parse(file, ["DateTimeOriginal"]), 5_000, "Reading the photo date");
    return exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal : null;
  } catch {
    return null; // screenshots, PNGs, stripped files
  }
}

/**
 * Scale to fit `maxSide` and re-encode as JPEG; `square` centre-crops first
 * (profile pictures). Falls back to the original if the browser can't decode it.
 */
export async function shrinkImage(
  file: File,
  maxSide: number,
  { quality = 0.82, square = false } = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    // honours EXIF rotation, so portrait phone photos stay upright
    const bitmap = await withTimeout(createImageBitmap(file, { imageOrientation: "from-image" }), 15_000, "Opening the photo");
    const side = Math.min(bitmap.width, bitmap.height);
    const [sx, sy, sw, sh] = square
      ? [(bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side]
      : [0, 0, bitmap.width, bitmap.height];
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const width = Math.round(sw * scale);
    const height = Math.round(sh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
    bitmap.close();
    const blob = await withTimeout(
      new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality)),
      15_000,
      "Shrinking the photo"
    );
    return { blob, width, height };
  } catch (e) {
    // e.g. HEIC on a browser that can't decode it: send the original if it's small enough
    if (file.size <= 5 * 1024 * 1024) return { blob: file, width: 0, height: 0 };
    throw new Error(`This photo couldn't be prepared (${(e as Error).message}). Try a JPEG under 5 MB.`);
  }
}

/** Direct-to-Blob upload with progress. The server checks ownership before issuing a token. */
export async function uploadToBlob(path: string, blob: Blob, payload: object, onProgress: (pct: number) => void) {
  const { upload } = await import("@vercel/blob/client");
  const result = await upload(path, blob, {
    access: "private",
    handleUploadUrl: "/api/upload",
    clientPayload: JSON.stringify(payload),
    multipart: blob.size > 1024 * 1024,
    contentType: blob.type || "image/jpeg",
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });
  return result.url;
}
