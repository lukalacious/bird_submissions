"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import type { BonusBirdPhoto } from "@/app/actions/photo-actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Instagram-style grid of the year's bonus-bird photos.
 * Tap a tile for the full photo + who/what/when + award status.
 */
export function PhotoGallery({ photos }: { photos: BonusBirdPhoto[] }) {
  const [selected, setSelected] = useState<BonusBirdPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium">No bonus bird photos yet</p>
        <p className="text-xs mt-1">
          Photos of golden and photography birds appear here once twitched.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelected(photo)}
            className="relative aspect-square overflow-hidden bg-muted group"
            aria-label={`${photo.birdName} by ${photo.userName ?? "unknown"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photoUrl}
              alt={photo.birdName}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {photo.awardedJokers > 0 && (
              <span className="absolute top-1 right-1 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                +{photo.awardedJokers} 🃏
              </span>
            )}
            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left">
              <span className="block text-[10px] font-medium text-white truncate">
                {photo.birdName}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Modal open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.photoUrl}
              alt={selected.birdName}
              className="w-full max-h-[60vh] object-contain bg-black rounded-t-lg"
            />
            <div className="p-4 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selected.userImage || undefined} />
                <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                  {initials(selected.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selected.birdName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {selected.userName ?? "Anonymous"} · {MONTH_NAMES[selected.month - 1]}{" "}
                  {selected.year}
                </p>
              </div>
              {selected.awarded ? (
                selected.awardedJokers > 0 ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    +{selected.awardedJokers} joker{selected.awardedJokers !== 1 ? "s" : ""}
                  </Badge>
                ) : (
                  <Badge variant="stone">Reviewed</Badge>
                )
              ) : (
                <Badge variant="stone">Pending review</Badge>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
