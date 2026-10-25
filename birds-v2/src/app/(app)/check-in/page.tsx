import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { checkInDeadline, openCheckInMonth } from "@/lib/challenge-time";
import { getSpecialSpecies } from "@/lib/checklist";
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
  const [special, subs, existing] = await Promise.all([
    getSpecialSpecies(month),
    db.submission.findMany({
      where: { userId: user.id, ...month },
      select: { speciesId: true, isLifer: true },
    }),
    db.monthlyCheckIn.findUnique({ where: { userId_year_month: { userId: user.id, ...month } } }),
  ]);
  const photoBirdPhotos = await db.photo.count({
    where: { userId: user.id, ...month, submission: { speciesId: { in: special.photo } } },
  });
  const golden = new Set(special.golden);
  const counted = {
    golden: subs.filter((s) => s.speciesId && golden.has(s.speciesId)).length,
    lifers: subs.filter((s) => s.isLifer).length,
    photos: photoBirdPhotos,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{monthLabel} check-in</h1>
        <p className="max-w-prose text-ink-soft">
          Six quick questions for your bonus jokers. You can change your answers until{" "}
          {DEADLINE.format(new Date(checkInDeadline(month, settings.checkInDeadlineDay, settings.timezone).getTime() - 1))}.
        </p>
      </header>
      <CheckInForm
        monthLabel={monthLabel}
        birdCount={subs.length}
        counted={counted}
        isEdit={Boolean(existing)}
        defaults={{
          within15km: existing?.within15km ?? null,
          beyond750km: existing?.beyond750km ?? null,
          nonMotorisedCount: existing?.nonMotorisedCount ?? 0,
          goldenCount: existing?.goldenCount ?? counted.golden,
          liferCount: existing?.liferCount ?? counted.lifers,
          photoCount: existing?.photoCount ?? Math.min(counted.photos, 3),
          primaryLocation: existing?.primaryLocation ?? "",
        }}
      />
    </div>
  );
}
