"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useJokerForImmunity } from "@/app/actions/joker-actions";

interface UseJokerButtonProps {
  availableJokers: number;
  regionId: string;
  year: number;
  month: number;
}

export function UseJokerButton({ availableJokers, regionId, year, month }: UseJokerButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleUseJoker = () => {
    if (availableJokers < 1) {
      toast.error("No jokers available");
      return;
    }
    setShowConfirm(true);
  };

  const confirmUseJoker = () => {
    startTransition(async () => {
      const result = await useJokerForImmunity(regionId, year, month);

      if (result.success) {
        toast.success(`Joker used! You have immunity for this month. ${result.remaining} jokers remaining.`);
        router.push("/dashboard");
      } else {
        toast.error(result.error || "Failed to use joker");
      }
      setShowConfirm(false);
    });
  };

  if (showConfirm) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-1">Use Joker for Immunity?</h3>
            <p className="text-sm text-amber-700 mb-3">
              This will count as 1 bird submission towards your monthly goal and grant you immunity for not submitting this month.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={confirmUseJoker}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Use Joker
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleUseJoker}
      disabled={availableJokers < 1}
      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold shadow-md hover:shadow-lg transition-all w-full"
    >
      <Shield className="h-4 w-4 mr-2" />
      Use Joker ({availableJokers} available)
    </Button>
  );
}
