"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { deleteSubmission } from "@/app/actions/submit-birds";
import { toast } from "sonner";

interface DeletableBirdPillProps {
  birdName: string;
  year: number;
  month: number;
  /** Only current-month, non-joker submissions are deletable */
  deletable: boolean;
}

/**
 * Bird pill with tap-twice-to-remove: first tap arms (pill turns red),
 * second tap within 3s deletes. Avoids accidental deletes on mobile
 * without a modal.
 */
export function DeletableBirdPill({ birdName, year, month, deletable }: DeletableBirdPillProps) {
  const [armed, setArmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!deletable) {
    return (
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
        {birdName}
      </span>
    );
  }

  const handleTap = () => {
    if (isPending) return;

    if (!armed) {
      setArmed(true);
      timerRef.current = setTimeout(() => setArmed(false), 3000);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    startTransition(async () => {
      const result = await deleteSubmission({ birdName, year, month });
      if (result.success) {
        toast.success(`Removed "${birdName}"`);
      } else {
        toast.error(result.error || "Failed to remove bird");
        setArmed(false);
      }
    });
  };

  return (
    <button
        type="button"
        onClick={handleTap}
        disabled={isPending}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
          armed
            ? "bg-red-100 text-red-700 border border-red-300"
            : "bg-secondary text-secondary-foreground hover:bg-red-50 hover:text-red-600"
        }`}
        aria-label={armed ? `Tap again to remove ${birdName}` : `Remove ${birdName}`}
      >
        {armed ? "Tap again to remove" : birdName}
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </button>
  );
}
