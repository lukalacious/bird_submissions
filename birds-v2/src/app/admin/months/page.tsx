import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getChallengeMonth, nextMonth, previousMonth } from "@/lib/challenge-time";
import { getAllSpecies } from "@/lib/checklist";
import { getSettings } from "@/lib/settings";
import { MonthForm } from "./month-form";

export const metadata = { title: "Months" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
const label = (m: { year: number; month: number }) => MONTH.format(new Date(Date.UTC(m.year, m.month - 1, 15)));
const param = (m: { year: number; month: number }) => `${m.year}-${String(m.month).padStart(2, "0")}`;

export default function MonthsPage({ searchParams }: PageProps<"/admin/months">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Months</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Month searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Month({ searchParams }: Pick<PageProps<"/admin/months">, "searchParams">) {
  await connection();
  await requireAdmin();
  const settings = await getSettings();
  const { m } = await searchParams;
  const match = typeof m === "string" ? m.match(/^(\d{4})-(\d{2})$/) : null;
  const target = match ? { year: Number(match[1]), month: Number(match[2]) } : getChallengeMonth(new Date(), settings.timezone);

  const [overrides, special, species] = await Promise.all([
    db.monthlySettings.findUnique({ where: { year_month: target } }),
    db.specialBird.findMany({ where: target, select: { kind: true, speciesId: true } }),
    getAllSpecies(),
  ]);

  return (
    <>
      <nav aria-label="Choose month" className="flex items-center justify-between gap-4">
        <Link href={`/admin/months?m=${param(previousMonth(target))}`} className="min-h-11 content-center font-semibold text-roller">
          ‹ {label(previousMonth(target))}
        </Link>
        <h2 className="text-xl font-semibold">{label(target)}</h2>
        <Link href={`/admin/months?m=${param(nextMonth(target))}`} className="min-h-11 content-center font-semibold text-roller">
          {label(nextMonth(target))} ›
        </Link>
      </nav>
      <MonthForm
        year={target.year}
        month={target.month}
        monthLabel={label(target)}
        defaults={{ maxBirds: settings.maxBirdsPerPeriod, threshold: settings.eliminationThreshold }}
        overrides={{ maxBirds: overrides?.maxBirdsPerPeriod ?? null, threshold: overrides?.eliminationThreshold ?? null }}
        golden={special.filter((s) => s.kind === "GOLDEN").map((s) => s.speciesId)}
        species={species}
      />
    </>
  );
}
