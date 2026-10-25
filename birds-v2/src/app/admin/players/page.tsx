import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Players" };

export default function PlayersPage({ searchParams }: PageProps<"/admin/players">) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Players</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Players searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Players({ searchParams }: Pick<PageProps<"/admin/players">, "searchParams">) {
  await requireAdmin();
  const { merged } = await searchParams;
  const { currentYear } = await getSettings();
  const players = await db.user.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      _count: { select: { submissions: { where: { year: currentYear } }, accounts: true } },
    },
  });
  const label = (p: (typeof players)[number]) => `${p.username ?? p.name ?? "Unnamed"} (${p.email})`;

  return (
    <>
      {typeof merged === "string" && (
        <p role="status" className="rounded-xl bg-roller-wash p-4">
          Merged. Everything now sits on {label(players.find((p) => p.id === merged) ?? players[0])}.
        </p>
      )}

      <section aria-labelledby="merge-heading" className="space-y-3 rounded-2xl border border-rule bg-paper-raised p-5">
        <h2 id="merge-heading" className="text-xl font-semibold">
          Merge two players
        </h2>
        <p className="max-w-prose text-ink-soft">
          For one person with two accounts. You&apos;ll see exactly what moves before anything changes.
        </p>
        <form action="/admin/players/merge" className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-1">
            <span className="font-semibold">Duplicate account (removed)</span>
            <select name="from" required className="min-h-12 rounded-lg border border-rule bg-paper px-3">
              <option value="">Choose…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-semibold">Real player (kept)</span>
            <select name="to" required className="min-h-12 rounded-lg border border-rule bg-paper px-3">
              <option value="">Choose…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-12 rounded-full bg-roller px-5 font-semibold text-roller-ink">
            Preview merge
          </button>
        </form>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">All players</caption>
          <thead className="border-b border-rule text-sm text-ink-soft">
            <tr>
              <th className="py-2 pr-4 font-semibold">Player</th>
              <th className="py-2 pr-4 font-semibold">Email</th>
              <th className="py-2 pr-4 text-right font-semibold">Birds {currentYear}</th>
              <th className="py-2 text-right font-semibold">Google accounts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {players.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-4">
                  {p.username ?? p.name}
                  {p.role === "ADMIN" && <span className="ml-2 text-sm text-lilac">admin</span>}
                </td>
                <td className="py-2 pr-4 text-ink-soft">{p.email}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{p._count.submissions}</td>
                <td className="py-2 text-right tabular-nums">{p._count.accounts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
