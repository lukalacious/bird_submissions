"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, MailQuestion, ArrowRight, Trash2, MessageCircle } from "lucide-react";
import {
  approveChangeRequest,
  rejectChangeRequest,
} from "@/app/actions/change-request-actions";

interface RequestUser {
  name: string | null;
  username: string | null;
  email: string;
}

export interface SerializedChangeRequest {
  id: string;
  type: "SWAP" | "DELETE" | "OTHER";
  year: number;
  month: number;
  birdName: string | null;
  replacementBird: string | null;
  note: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: RequestUser;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function TypeIcon({ type }: { type: SerializedChangeRequest["type"] }) {
  if (type === "SWAP") return <ArrowRight className="h-4 w-4 text-blue-600" />;
  if (type === "DELETE") return <Trash2 className="h-4 w-4 text-red-600" />;
  return <MessageCircle className="h-4 w-4 text-gray-500" />;
}

function RequestSummary({ request }: { request: SerializedChangeRequest }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-sm">
        {request.user.username || request.user.name || request.user.email}
        <span className="text-muted-foreground font-normal">
          {" "}· {MONTH_NAMES[request.month - 1]} {request.year}
        </span>
      </p>
      <p className="text-sm text-foreground mt-0.5">
        {request.type === "SWAP" && (
          <>
            Swap <span className="font-medium">{request.birdName}</span> →{" "}
            <span className="font-medium">{request.replacementBird}</span>
          </>
        )}
        {request.type === "DELETE" && (
          <>
            Remove <span className="font-medium">{request.birdName}</span>
          </>
        )}
        {request.type === "OTHER" && (request.note || "See note")}
      </p>
      {request.type !== "OTHER" && request.note && (
        <p className="text-xs text-muted-foreground mt-0.5 italic">“{request.note}”</p>
      )}
    </div>
  );
}

export function ChangeRequestPanel({
  pending,
  resolved,
}: {
  pending: SerializedChangeRequest[];
  resolved: SerializedChangeRequest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const resolve = (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    startTransition(async () => {
      const fn = action === "approve" ? approveChangeRequest : rejectChangeRequest;
      const result = await fn(id, notes[id]);
      if (result.success) {
        toast.success(action === "approve" ? "Applied and approved" : "Rejected");
        router.refresh();
      } else {
        toast.error(result.error || "Failed");
      }
      setBusyId(null);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MailQuestion className="h-6 w-6" />
          Change Requests
        </h1>
        <p className="text-muted-foreground text-sm">
          Player-filed edits for locked past months. Approving a swap/delete applies
          it immediately and recalculates jokers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending{" "}
            {pending.length > 0 && (
              <Badge className="ml-1 bg-red-100 text-red-700">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing pending 🎉</p>
          )}
          {pending.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  <TypeIcon type={request.type} />
                </div>
                <RequestSummary request={request} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Admin note (optional)"
                  value={notes[request.id] ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                  }
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => resolve(request.id, "approve")}
                    disabled={isPending && busyId === request.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {request.type === "OTHER" ? "Mark handled" : "Apply"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolve(request.id, "reject")}
                    disabled={isPending && busyId === request.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recently resolved</CardTitle>
          <CardDescription>Last {resolved.length} decisions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {resolved.length === 0 && (
            <p className="text-sm text-muted-foreground">No history yet</p>
          )}
          {resolved.map((request) => (
            <div key={request.id} className="flex items-start gap-2 rounded-lg border p-3 opacity-80">
              <div className="mt-0.5">
                <TypeIcon type={request.type} />
              </div>
              <div className="flex-1 min-w-0">
                <RequestSummary request={request} />
                {request.adminNote && (
                  <p className="text-xs text-muted-foreground mt-1">Admin: {request.adminNote}</p>
                )}
              </div>
              <Badge
                className={
                  request.status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {request.status.toLowerCase()}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
