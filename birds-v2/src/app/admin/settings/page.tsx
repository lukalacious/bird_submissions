import { Suspense } from "react";
import { requireAdmin } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { getChallengeMonth } from "@/lib/challenge-time";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Game settings</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <SettingsForm
      values={{
        currentYear: s.currentYear ?? getChallengeMonth().year,
        maxBirdsPerPeriod: s.maxBirdsPerPeriod,
        eliminationThreshold: s.eliminationThreshold,
        graceHours: s.graceHours,
        checkInDeadlineDay: s.checkInDeadlineDay,
        poolFractionalJokers: s.poolFractionalJokers,
        maxEmptyMonths: s.maxEmptyMonths,
        rules: s.rules ?? null,
      }}
    />
  );
}
