"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Check } from "lucide-react";
import { awardPhotoJokers, type AdminPhotoEntry } from "@/app/actions/photo-actions";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function PhotoRow({ photo }: { photo: AdminPhotoEntry }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [award, setAward] = useState(photo.awarded ? photo.awardedJokers : 1);

  const save = () => {
    startTransition(async () => {
      const result = await awardPhotoJokers(photo.id, award);
      if (result.success) {
        toast.success(
          award > 0
            ? `Awarded ${award} joker${award !== 1 ? "s" : ""} to ${photo.userName}`
            : `Marked as reviewed (no award)`
        );
        router.refresh();
      } else {
        toast.error(result.error || "Failed");
      }
    });
  };

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <a href={photo.photoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.photoUrl}
          alt={photo.birdName}
          className="h-20 w-20 rounded-md object-cover"
        />
      </a>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{photo.birdName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {photo.userName ?? photo.userEmail} · {MONTH_NAMES[photo.month - 1]} {photo.year}
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border overflow-hidden">
            {[0, 1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAward(value)}
                className={`px-2.5 py-1 text-xs font-medium ${
                  award === value
                    ? "bg-amber-400 text-amber-950"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                {value === 0 ? "0" : `+${value}`}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={save} disabled={isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {photo.awarded ? "Update" : "Award"}
          </Button>
          {photo.awarded && (
            <Badge className="bg-green-100 text-green-700">
              awarded {photo.awardedJokers > 0 ? `+${photo.awardedJokers}` : "0"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function PhotoAwardPanel({ photos, year }: { photos: AdminPhotoEntry[]; year: number }) {
  const pending = photos.filter((p) => !p.awarded);
  const reviewed = photos.filter((p) => p.awarded);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Photo Awards
        </h1>
        <p className="text-muted-foreground text-sm">
          Bonus-bird photos submitted in {year}. Award jokers manually — awards are
          added to that month&apos;s bonus jokers and survive the nightly recompute.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Awaiting review{" "}
            {pending.length > 0 && (
              <Badge className="ml-1 bg-red-100 text-red-700">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">All caught up 🎉</p>
          )}
          {pending.map((photo) => (
            <PhotoRow key={photo.id} photo={photo} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviewed</CardTitle>
          <CardDescription>Change an award any time — deltas apply automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewed.length === 0 && <p className="text-sm text-muted-foreground">None yet</p>}
          {reviewed.map((photo) => (
            <PhotoRow key={photo.id} photo={photo} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
