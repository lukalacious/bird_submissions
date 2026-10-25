import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { getPlayerSeason } from "@/lib/checklist";
import { getSettings } from "@/lib/settings";
import { SeasonList } from "./season-list";

export const metadata = { title: "My birds" };

export default function MyBirdsPage() {
  return (
    <div className="space-y-6">
      <Link href="/me" className="font-semibold text-roller underline underline-offset-4">
        Back to Me
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Season />
      </Suspense>
    </div>
  );
}

async function Season() {
  await connection();
  const user = await requirePlayer();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const { birds } = await getPlayerSeason(user.id, current.year);
  return <SeasonList userId={user.id} year={current.year} current={current} birds={birds} />;
}
