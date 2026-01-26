"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { deleteSubmission } from "@/app/actions/submit-birds";
import { toast } from "sonner";

interface Bird {
  name: string;
  region: string;
}

interface OpenMonthBirdsProps {
  birds: Bird[];
  userId: string;
  year: number;
  month: number;
}

export function OpenMonthBirds({ birds, userId, year, month }: OpenMonthBirdsProps) {
  const [localBirds, setLocalBirds] = useState(birds);
  const [isPending, startTransition] = useTransition();
  const [deletingBird, setDeletingBird] = useState<string | null>(null);

  const handleDelete = (birdName: string) => {
    setDeletingBird(birdName);
    startTransition(async () => {
      const result = await deleteSubmission({
        userId,
        birdName,
        year,
        month,
      });

      if (result.success) {
        setLocalBirds((prev) => prev.filter((b) => b.name !== birdName));
        toast.success(`Removed "${birdName}" from your submissions`);
      } else {
        toast.error(result.error || "Failed to delete");
      }
      setDeletingBird(null);
    });
  };

  if (localBirds.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No birds submitted yet this month</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {localBirds.map((bird, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-purple-100 pl-2.5 pr-1 py-1 text-sm text-purple-800 group"
        >
          {bird.name}
          <span className="text-purple-500 text-xs">({bird.region})</span>
          <button
            onClick={() => handleDelete(bird.name)}
            disabled={isPending}
            className="ml-1 p-1 rounded-full hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center justify-center"
            title={`Remove ${bird.name}`}
          >
            {deletingBird === bird.name ? (
              <span className="inline-block w-4 h-4 animate-spin text-purple-600">⏳</span>
            ) : (
              <X className="w-4 h-4 text-purple-600 hover:text-purple-800" />
            )}
          </button>
        </span>
      ))}
    </div>
  );
}
