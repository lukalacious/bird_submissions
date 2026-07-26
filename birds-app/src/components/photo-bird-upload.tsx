"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import imageCompression from "browser-image-compression";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoBirdUploadProps {
  birdName: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Proof-photo picker for a designated photo bird. Compresses client-side
 * (~1600px) then uploads directly to Vercel Blob via /api/upload.
 */
export function PhotoBirdUpload({ birdName, photoUrl, onChange }: PhotoBirdUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 1,
        useWebWorker: true,
      });
      const blob = await upload(
        `photo-birds/${birdName.replaceAll(" ", "-")}.jpg`,
        compressed,
        {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ birdName }),
        }
      );
      onChange(blob.url);
      toast.success(`Photo attached for ${birdName}`);
    } catch (error) {
      console.error("Photo upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {photoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={`Photo of ${birdName}`}
            className="h-8 w-8 rounded object-cover border border-sky-300"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-red-600"
            aria-label={`Remove photo for ${birdName}`}
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 text-xs hover:bg-sky-200 disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
          {isUploading ? "Uploading..." : "Add photo"}
        </button>
      )}
    </span>
  );
}
