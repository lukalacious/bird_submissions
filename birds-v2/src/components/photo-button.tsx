"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { attachPhoto, removePhoto } from "@/app/(app)/twitch/photo-actions";
import { photoPath, takenInMonth } from "@/lib/photos";

interface Props {
  userId: string;
  submissionId: string;
  birdName: string;
  photoUrl: string | null;
  /** the month the photo will be filed under, for the EXIF date check */
  month: { year: number; month: number };
  onNotice: (n: { kind: "ok" | "error"; text: string }) => void;
}

async function readTakenAt(file: File): Promise<Date | null> {
  try {
    const { parse } = await import("exifr");
    const exif = await parse(file, ["DateTimeOriginal"]);
    return exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal : null;
  } catch {
    return null; // screenshots, PNGs, stripped files
  }
}

/** Add a photo to a bird: EXIF date → compress → upload to Blob → save. */
export function PhotoButton({ userId, submissionId, birdName, photoUrl, month, onNotice }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handle(file: File) {
    try {
      // Read EXIF before compressing — compression strips it
      setProgress("Preparing…");
      const takenAt = await readTakenAt(file);
      const { default: compress } = await import("browser-image-compression");
      const small = await compress(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 1,
        initialQuality: 0.8,
        fileType: "image/jpeg",
        useWebWorker: true,
      });
      const bitmap = await createImageBitmap(small);
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(photoPath(userId, submissionId), small, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ submissionId }),
        multipart: true,
        onUploadProgress: ({ percentage }) => setProgress(`Uploading ${Math.round(percentage)}%`),
      });

      const result = await attachPhoto({
        submissionId,
        url: blob.url,
        width: bitmap.width,
        height: bitmap.height,
        takenAt: takenAt?.toISOString(),
      });
      if (!result.ok) return onNotice({ kind: "error", text: result.error });

      const inMonth = takenInMonth(takenAt, month);
      onNotice({
        kind: "ok",
        text:
          inMonth === false
            ? `Photo added for ${birdName}. Its date says it was taken in a different month, which is fine for the gallery.`
            : `Photo added for ${birdName}.`,
      });
      router.refresh();
    } catch (e) {
      onNotice({ kind: "error", text: `The photo didn't upload: ${(e as Error).message}` });
    } finally {
      setProgress(null);
    }
  }

  if (photoUrl) {
    return (
      <span className="flex items-center gap-1">
        <Image src={photoUrl} alt={`Your photo of ${birdName}`} width={44} height={44} className="size-11 rounded-lg object-cover" />
        <button
          type="button"
          disabled={pending}
          aria-label={`Remove photo of ${birdName}`}
          onClick={() =>
            startTransition(async () => {
              const r = await removePhoto({ submissionId });
              onNotice(r.ok ? { kind: "ok", text: r.message } : { kind: "error", text: r.error });
              if (r.ok) router.refresh();
            })
          }
          className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-paper-sunk"
        >
          <X aria-hidden className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handle(file);
        }}
      />
      <button
        type="button"
        disabled={progress !== null}
        onClick={() => input.current?.click()}
        aria-label={progress ?? `Add a photo of ${birdName}`}
        className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-ink-soft hover:bg-paper-sunk disabled:opacity-70"
      >
        <Camera aria-hidden className="size-5" />
        {progress && <span aria-live="polite">{progress}</span>}
      </button>
    </>
  );
}
