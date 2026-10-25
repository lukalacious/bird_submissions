import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { approveLinkRequest, rejectLinkRequest } from "./actions";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Overview</h1>
      <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <LinkRequests />
      </Suspense>
    </div>
  );
}

async function LinkRequests() {
  await requireAdmin();
  const requests = await db.linkRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      requester: { select: { email: true, name: true } },
      target: { select: { email: true, name: true, username: true } },
    },
  });

  return (
    <section aria-labelledby="claims-heading" className="space-y-3">
      <h2 id="claims-heading" className="text-xl font-semibold">
        Account claims
      </h2>
      {requests.length === 0 ? (
        <p className="text-ink-soft">No one is waiting. New sign-ins that look like an existing player appear here.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="space-y-3 rounded-2xl border border-rule bg-paper-raised p-4">
              <p>
                <strong>{r.requester.email}</strong> says they are{" "}
                <strong>{r.target.username ?? r.target.name}</strong> ({r.target.email}).
              </p>
              <p className="text-sm text-ink-soft">
                Approving moves this Google account onto the existing player. The new account has no birds of its
                own, so nothing else changes.
              </p>
              <div className="flex flex-wrap gap-3">
                <form action={approveLinkRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="min-h-12 rounded-full bg-roller px-5 font-semibold text-roller-ink">
                    Approve and link
                  </button>
                </form>
                <form action={rejectLinkRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="min-h-12 rounded-full border border-rule px-5 font-semibold">
                    Not the same person
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
