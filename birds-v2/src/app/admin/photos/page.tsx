import Image from "next/image";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { reviewPhoto } from "./actions";

export const metadata = { title: "Photos" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric", timeZone: "UTC" });

export default function PhotosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Golden bird photos</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  await requireAdmin();
  const [pending, special] = await Promise.all([
    db.photo.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true, url: true, year: true, month: true, takenAt: true,
        user: { select: { name: true, username: true } },
        submission: { select: { speciesId: true, customName: true, bird: { select: { displayName: true } } } },
      },
    }),
    db.specialBird.findMany({ where: { kind: "GOLDEN" }, select: { year: true, month: true, speciesId: true } }),
  ]);
  const isGolden = new Set(special.map((s) => `${s.year}-${s.month}:${s.speciesId}`));

  if (pending.length === 0) return <p className="text-ink-soft">No photos waiting for review.</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {pending.map((p) => {
        const bird = p.submission.bird?.displayName ?? p.submission.customName ?? "Unknown bird";
        const golden = p.submission.speciesId && isGolden.has(`${p.year}-${p.month}:${p.submission.speciesId}`);
        return (
          <li key={p.id} className="overflow-hidden rounded-2xl border border-rule bg-paper-raised">
            <Image src={p.url} alt={`${bird} by ${p.user.username ?? p.user.name}`} width={600} height={450} className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-3 p-4">
              <p>
                <strong>{bird}</strong> by {p.user.username ?? p.user.name}, filed {MONTH.format(new Date(Date.UTC(p.year, p.month - 1, 15)))}
                {golden ? <span className="ml-2 rounded-full bg-weaver px-2 text-sm font-semibold text-weaver-ink">golden bird proof</span> : null}
              </p>
              {p.takenAt && <p className="text-sm text-ink-soft">Camera date: {p.takenAt.toISOString().slice(0, 10)}</p>}
              <form action={reviewPhoto} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="photoId" value={p.id} />
                <button name="decision" value="approve" className="min-h-11 rounded-full bg-roller px-5 font-semibold text-roller-ink">Looks right</button>
                <button name="decision" value="reject" className="min-h-11 rounded-full border border-rule px-5 font-semibold">Reject (removes the golden joker)</button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
