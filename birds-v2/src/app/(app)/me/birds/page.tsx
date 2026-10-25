import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth, openMonths } from "@/lib/challenge-time";
import { getPlayerSeason } from "@/lib/checklist";
import { getSettings } from "@/lib/settings";
import { SeasonList } from "./season-list";

export const metadata = { title: "My birds" };

export default function MyBirdsPage({ searchParams }: PageProps<"/me/birds">) {
  return (
    <div className="space-y-6">
      <Link href="/me" className="font-semibold text-roller underline underline-offset-4">
        Back to Me
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Season searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Season({ searchParams }: Pick<PageProps<"/me/birds">, "searchParams">) {
  await connection();
  const user = await requirePlayer();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const [{ birds }, { requested }] = await Promise.all([getPlayerSeason(user.id, current.year), searchParams]);
  const open = openMonths({ graceHours: settings.graceHours, timeZone: settings.timezone })
    .filter((m) => m.year === current.year)
    .map((m) => m.month);
  return (
    <SeasonList
      userId={user.id}
      year={current.year}
      current={current}
      birds={birds}
      openMonths={open}
      requested={requested === "1"}
    />
  );
}
