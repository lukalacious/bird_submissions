"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { removeAvatar, saveAvatar } from "@/app/(app)/me/avatar-actions";
import { avatarPath } from "@/lib/photos";
import { shrinkImage, uploadToBlob } from "@/lib/upload-image";

/** Profile picture: pick → square 512px JPEG → Blob → save. */
export function AvatarUpload({ userId, name, image }: { userId: string; name: string; image: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function handle(file: File) {
    setNotice(null);
    try {
      setProgress("Preparing…");
      const { blob } = await shrinkImage(file, 512, { square: true, quality: 0.85 });
      const url = await uploadToBlob(avatarPath(userId), blob, { kind: "avatar" }, (pct) => setProgress(`Uploading ${pct}%`));
      const result = await saveAvatar({ url });
      setNotice(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    } catch (e) {
      setNotice({ ok: false, text: `The picture didn't upload: ${(e as Error).message}` });
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={progress !== null}
        aria-label={image ? "Change profile picture" : "Add a profile picture"}
        className="relative size-20 shrink-0 overflow-hidden rounded-full bg-paper-sunk"
      >
        {image ? (
          <Image src={image} alt="" width={80} height={80} className="size-20 object-cover" />
        ) : (
          <span aria-hidden className="grid size-20 place-items-center font-display text-3xl font-semibold text-ink-soft">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span aria-hidden className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full bg-roller text-roller-ink">
          <Camera className="size-4" />
        </span>
      </button>
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
      <div className="min-w-0 space-y-1">
        <p className="font-display text-xl font-semibold">{name}</p>
        {progress ? (
          <p aria-live="polite" className="text-sm text-ink-soft">{progress}</p>
        ) : (
          <p className="flex gap-3 text-sm">
            <button type="button" onClick={() => input.current?.click()} className="font-semibold text-roller">
              {image ? "Change picture" : "Add a picture"}
            </button>
            {image && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await removeAvatar();
                    setNotice(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
                    if (r.ok) router.refresh();
                  })
                }
                className="text-ink-soft"
              >
                Remove
              </button>
            )}
          </p>
        )}
        {notice && (
          <p role={notice.ok ? "status" : "alert"} className={`text-sm ${notice.ok ? "text-ink-soft" : "text-alarm"}`}>
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
