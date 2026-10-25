import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/dal";
import { previewMerge } from "@/lib/merge-users";
import { mergePlayers } from "../../actions";

export const metadata = { title: "Merge players" };

export default function MergePage({ searchParams }: PageProps<"/admin/players/merge">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Check the merge</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Preview searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Preview({ searchParams }: Pick<PageProps<"/admin/players/merge">, "searchParams">) {
  await requireAdmin();
  const { from, to } = await searchParams;
  if (typeof from !== "string" || typeof to !== "string" || from === to) {
    return (
      <p>
        Choose two different players.{" "}
        <Link href="/admin/players" className="font-semibold text-roller underline">
          Back to players
        </Link>
      </p>
    );
  }

  const { source, target, plan } = await previewMerge(from, to);
  const name = (u: typeof source) => u.username ?? u.name ?? u.email;

  return (
    <div className="space-y-6">
      <p className="text-lg">
        Move everything from <strong>{name(source)}</strong> ({source.email}) onto <strong>{name(target)}</strong> (
        {target.email}), then remove {source.email}. Both Google accounts will open {name(target)}&apos;s birds.
      </p>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-paper-raised p-4">
          <dt className="text-ink-soft">Birds moving</dt>
          <dd className="font-display text-2xl font-semibold">{plan.moveSubmissionIds.length}</dd>
        </div>
        <div className="rounded-2xl bg-paper-raised p-4">
          <dt className="text-ink-soft">Repeats dropped</dt>
          <dd className="font-display text-2xl font-semibold">{plan.dropSubmissions.length}</dd>
        </div>
        <div className="rounded-2xl bg-paper-raised p-4">
          <dt className="text-ink-soft">Months recalculated</dt>
          <dd className="font-display text-2xl font-semibold">{plan.affectedMonths.length}</dd>
        </div>
      </dl>

      {plan.dropSubmissions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Dropped because {name(target)} already has them this season</h2>
          <ul className="list-disc pl-6">
            {plan.dropSubmissions.map((s) => (
              <li key={s.id}>
                {s.label} ({s.year}-{String(s.month).padStart(2, "0")})
              </li>
            ))}
          </ul>
        </section>
      )}
      {plan.dropCheckInMonths.length > 0 && (
        <p className="text-ink-soft">
          Both filed a check-in for {plan.dropCheckInMonths.map((m) => `${m.year}-${m.month}`).join(", ")}.{" "}
          {name(target)}&apos;s answers are kept.
        </p>
      )}
      <p className="text-ink-soft">
        Where both have jokers in the same month, the larger form bonus is kept and jokers spent are added together.
      </p>

      <form action={mergePlayers} className="flex flex-wrap gap-3">
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="to" value={to} />
        <button type="submit" className="min-h-12 rounded-full bg-alarm px-6 font-semibold text-paper">
          Merge and remove {source.email}
        </button>
        <Link href="/admin/players" className="inline-flex min-h-12 items-center px-4 font-semibold">
          Cancel
        </Link>
      </form>
    </div>
  );
}
