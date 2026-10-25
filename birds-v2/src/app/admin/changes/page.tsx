import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { approveChange, rejectChange } from "./actions";

export const metadata = { title: "Change requests" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const TYPE = { SWAP: "Swap", DELETE: "Remove", OTHER: "Other" } as const;

export default function ChangesPage({ searchParams }: PageProps<"/admin/changes">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Change requests</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Queue({ searchParams }: Pick<PageProps<"/admin/changes">, "searchParams">) {
  await requireAdmin();
  const { error } = await searchParams;
  const requests = await db.changeRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, username: true } } } });
  const [subs, birds] = await Promise.all([
    db.submission.findMany({ where: { id: { in: requests.map((r) => r.submissionId!).filter(Boolean) } }, select: { id: true, customName: true, bird: { select: { displayName: true } } } }),
    db.bird.findMany({ where: { id: { in: requests.map((r) => r.replacementBirdId!).filter(Boolean) } }, select: { id: true, displayName: true } }),
  ]);
  const subLabel = new Map(subs.map((s) => [s.id, s.bird?.displayName ?? s.customName ?? "?"]));
  const birdLabel = new Map(birds.map((b) => [b.id, b.displayName]));

  return (
    <>
      {typeof error === "string" && <p role="alert" className="rounded-xl border border-alarm/40 p-4 text-alarm">Not applied: {error}</p>}
      {requests.length === 0 ? (
        <p className="text-ink-soft">No requests waiting.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="space-y-3 rounded-2xl border border-rule bg-paper-raised p-4">
              <p>
                <strong>{r.user.username ?? r.user.name}</strong>, {MONTH.format(new Date(Date.UTC(r.year, r.month - 1, 15)))}:{" "}
                {TYPE[r.type]} <strong>{r.submissionId ? subLabel.get(r.submissionId) : "?"}</strong>
                {r.type === "SWAP" && r.replacementBirdId && <> → <strong>{birdLabel.get(r.replacementBirdId)}</strong></>}
              </p>
              {r.note && <p className="text-ink-soft">“{r.note}”</p>}
              <div className="flex flex-wrap items-end gap-3">
                <form action={approveChange}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="min-h-11 rounded-full bg-roller px-5 font-semibold text-roller-ink">{r.type === "OTHER" ? "Mark done" : "Approve and apply"}</button>
                </form>
                <form action={rejectChange} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="grid gap-1 text-sm">
                    Reason (optional)
                    <input name="adminNote" maxLength={500} className="min-h-11 rounded-lg border border-rule bg-paper px-3" />
                  </label>
                  <button className="min-h-11 rounded-full border border-rule px-5 font-semibold">Decline</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
