"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { MediaImage } from "@/components/media-image";
import type { GalleryPhoto } from "@/lib/sightings";

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });

/** The club's golden-bird photos. Tap one to see it full size with who, what and when. */
export function PhotoWall({ photos }: { photos: GalleryPhoto[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  function show(p: GalleryPhoto) {
    setOpen(p);
    dialog.current?.showModal();
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => show(p)} className="block w-full overflow-hidden rounded-2xl bg-paper-raised text-left">
              <MediaImage
                src={p.url}
                alt={`${p.bird}, photographed by ${p.playerName}`}
                width={p.width ?? 600}
                height={p.height ?? 600}
                sizes="(min-width: 640px) 33vw, 50vw"
                className="aspect-square w-full object-cover"
              />
              <span className="block px-3 py-2 text-sm">
                <span className="block font-semibold">{p.bird}</span>
                <span className="block text-ink-soft">{p.playerName}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* native <dialog>: focus trap, Escape and the backdrop come for free */}
      <dialog
        ref={dialog}
        aria-labelledby="photo-title"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(100vw-1.5rem,44rem)] rounded-2xl bg-paper-raised p-0 text-ink backdrop:bg-black/70"
      >
        {open && (
          <div>
            <MediaImage
              src={open.url}
              alt={`${open.bird}, photographed by ${open.playerName}`}
              width={open.width ?? 1200}
              height={open.height ?? 1200}
              sizes="100vw"
              className="max-h-[70dvh] w-full bg-paper-sunk object-contain"
            />
            <div className="flex items-start justify-between gap-4 p-4">
              <p>
                <span id="photo-title" className="block text-lg font-semibold">
                  {open.bird}
                </span>
                {open.scientificName && <i className="block text-ink-soft">{open.scientificName}</i>}
                <span className="block text-sm text-ink-soft">
                  {open.playerName} · golden bird for {MONTH.format(new Date(Date.UTC(open.year, open.month - 1, 15)))} ·{" "}
                  {open.reviewed ? "checked by an admin" : "waiting for an admin to check"}
                </span>
              </p>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Close photo"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rule"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
