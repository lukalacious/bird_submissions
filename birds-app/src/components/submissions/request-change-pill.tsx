"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createChangeRequest } from "@/app/actions/change-request-actions";

interface RequestChangePillProps {
  birdName: string;
  year: number;
  month: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Past-month bird pill: tapping opens a dialog to file a change request
 * (swap or delete) for admin approval. Past months are locked for direct
 * edits — whatever stood at month end is the submitted list.
 */
export function RequestChangePill({ birdName, year, month }: RequestChangePillProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"SWAP" | "DELETE">("SWAP");
  const [replacement, setReplacement] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createChangeRequest({
        type: mode,
        year,
        month,
        birdName,
        replacementBird: mode === "SWAP" ? replacement : undefined,
        note,
      });
      if (result.success) {
        toast.success("Change request sent — an admin will review it");
        setOpen(false);
        setReplacement("");
        setNote("");
      } else {
        toast.error(result.error || "Failed to send request");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:ring-1 hover:ring-primary/40"
        aria-label={`Request a change for ${birdName}`}
      >
        {birdName}
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Request a change</h2>
            <p className="text-sm text-muted-foreground">
              {birdName} — {MONTH_NAMES[month - 1]} {year}. Past months are locked,
              so an admin will review this request.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "SWAP" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("SWAP")}
            >
              Swap for another bird
            </Button>
            <Button
              type="button"
              variant={mode === "DELETE" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("DELETE")}
            >
              Remove it
            </Button>
          </div>

          {mode === "SWAP" && (
            <div>
              <Label htmlFor="replacement">Replace with</Label>
              <Input
                id="replacement"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="e.g. Red-billed Teal"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="request-note">Reason (optional)</Label>
            <Textarea
              id="request-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. ticked by accident during month-end panic"
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || (mode === "SWAP" && !replacement.trim())}
            >
              {isPending ? "Sending..." : "Send request"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
