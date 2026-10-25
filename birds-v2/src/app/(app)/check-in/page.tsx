import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { checkInDeadline, openCheckInMonth } from "@/lib/challenge-time";
import { getGoldenSpecies } from "@/lib/checklist";
import { getSettings } from "@/lib/settings";
import { CheckInForm } from "./check-in-form";

export const metadata = { title: "Check-in" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const DEADLINE = new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });

export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
      <CheckIn />
    </Suspense>
  );
}

async function CheckIn() {
  await connection();
  const user = await requirePlayer();
  const settings = await getSettings();
  const month = openCheckInMonth({ deadlineDay: settings.checkInDeadlineDay, timeZone: settings.timezone });

  if (!month) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">Monthly check-in</h1>
        <p className="max-w-prose text-ink-soft">
          The check-in opens on the 20th of each month and stays open until the {settings.checkInDeadlineDay}th of the
          next.
        </p>
        <Link href="/" className="font-semibold text-roller underline underline-offset-4">Back to Today</Link>
      </div>
    );
  }

  const monthLabel = MONTH.format(new Date(Date.UTC(month.year, month.month - 1, 15)));
  const [golden, subs, existing, photos] = await Promise.all([
    getGoldenSpecies(month),
    db.submission.findMany({ where: { userId: user.id, ...month }, select: { isLifer: true } }),
    db.monthlyCheckIn.findUnique({ where: { userId_year_month: { userId: user.id, ...month } } }),
    db.photo.findMany({
      where: { userId: user.id, ...month, status: { not: "REJECTED" } },
      select: { submission: { select: { speciesId: true } } },
    }),
  ]);
  // same count recalculateBonusJokers uses
  const goldenSet = new Set(golden);
  const counted = {
    lifers: subs.filter((s) => s.isLifer).length,
    goldenWithPhoto: new Set(photos.map((p) => p.submission.speciesId).filter((s) => s && goldenSet.has(s))).size,
    goldenSet: goldenSet.size,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{monthLabel} check-in</h1>
        <p className="max-w-prose text-ink-soft">
          Four quick questions for your bonus jokers. You can change your answers until{" "}
          {DEADLINE.format(new Date(checkInDeadline(month, settings.checkInDeadlineDay, settings.timezone).getTime() - 1))}.
        </p>
      </header>
      <CheckInForm
        year={month.year}
        monthLabel={monthLabel}
        birdCount={subs.length}
        counted={counted}
        isEdit={Boolean(existing)}
        defaults={{
          within15km: existing?.within15km ?? null,
          beyond750km: existing?.beyond750km ?? null,
          nonMotorisedCount: existing?.nonMotorisedCount ?? 0,
          liferCount: existing?.liferCount ?? counted.lifers,
          primaryLocation: existing?.primaryLocation ?? "",
        }}
      />
    </div>
  );
}
