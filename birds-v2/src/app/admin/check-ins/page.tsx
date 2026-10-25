import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getChallengeMonth, previousMonth } from "@/lib/challenge-time";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Check-ins" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });

export default function CheckInsPage({ searchParams }: PageProps<"/admin/check-ins">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Check-ins</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Overview({ searchParams }: Pick<PageProps<"/admin/check-ins">, "searchParams">) {
  await connection();
  await requireAdmin();
  const settings = await getSettings();
  const { m } = await searchParams;
  const match = typeof m === "string" ? m.match(/^(\d{4})-(\d{2})$/) : null;
  const target = match ? { year: Number(match[1]), month: Number(match[2]) } : getChallengeMonth(new Date(), settings.timezone);
  const prev = previousMonth(target);

  const [players, checkIns, jokers] = await Promise.all([
    db.user.findMany({
      where: { submissions: { some: { year: target.year } }, NOT: { challengeStatus: { some: { year: target.year, isEliminated: true } } } },
      select: { id: true, name: true, username: true },
      orderBy: { name: "asc" },
    }),
    db.monthlyCheckIn.findMany({ where: target, select: { userId: true, submittedAt: true, updatedAt: true } }),
    db.userJoker.findMany({ where: target, select: { userId: true, bonusJokers: true } }),
  ]);
  const filed = new Map(checkIns.map((c) => [c.userId, c]));
  const bonus = new Map(jokers.map((j) => [j.userId, j.bonusJokers]));
  const missing = players.filter((p) => !filed.has(p.id));

  return (
    <>
      <p className="flex flex-wrap items-center gap-4">
        <strong className="text-xl">{MONTH.format(new Date(Date.UTC(target.year, target.month - 1, 15)))}</strong>
        <span>{filed.size} filed, {missing.length} still to file</span>
        <Link href={`/admin/check-ins?m=${prev.year}-${String(prev.month).padStart(2, "0")}`} className="font-semibold text-roller">
          ‹ Previous month
        </Link>
      </p>
      {missing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Still to file</h2>
          <p className="text-ink-soft">{missing.map((p) => p.username ?? p.name).join(", ")}</p>
        </section>
      )}
      <table className="w-full text-left">
        <caption className="sr-only">Check-ins filed</caption>
        <thead className="text-sm text-ink-soft">
          <tr><th scope="col" className="py-2">Player</th><th scope="col" className="py-2 text-right">Bonus jokers</th></tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {players.filter((p) => filed.has(p.id)).map((p) => (
            <tr key={p.id}>
              <td className="py-2">{p.username ?? p.name}</td>
              <td className="py-2 text-right tabular-nums">{bonus.get(p.id) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
