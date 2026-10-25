"use client";

import { useActionState } from "react";
import { saveSettings } from "./actions";

export interface SettingsValues {
  currentYear: number;
  maxBirdsPerPeriod: number;
  eliminationThreshold: number;
  graceHours: number;
  checkInDeadlineDay: number;
  poolFractionalJokers: boolean;
  maxEmptyMonths: number | null;
  rules: string | null;
}

const field = "block min-h-12 w-32 rounded-xl border border-rule bg-paper-raised px-4 tabular-nums";

function Num({ name, label, hint, value, min, max }: { name: string; label: string; hint?: string; value: number | ""; min: number; max: number }) {
  return (
    <label className="block space-y-1">
      <span className="block font-semibold">{label}</span>
      {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      <input type="number" name={name} defaultValue={value} min={min} max={max} className={field} />
    </label>
  );
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  return (
    <form action={action} className="space-y-8">
      <fieldset className="grid gap-6 sm:grid-cols-2">
        <legend className="mb-4 text-xl font-semibold">Season</legend>
        <Num name="currentYear" label="Season year" value={values.currentYear} min={2026} max={2100} />
        <Num name="maxBirdsPerPeriod" label="Birds per month" hint="Monthly overrides on the Months page." value={values.maxBirdsPerPeriod} min={1} max={31} />
        <Num name="eliminationThreshold" label="Birds needed to stay in" value={values.eliminationThreshold} min={0} max={31} />
      </fieldset>

      <fieldset className="grid gap-6 sm:grid-cols-2">
        <legend className="mb-4 text-xl font-semibold">Deadlines</legend>
        <Num name="graceHours" label="Grace after month-end (hours)" hint="Players can still fix last month's list. 0 = none." value={values.graceHours} min={0} max={168} />
        <Num name="checkInDeadlineDay" label="Check-in closes on day" hint="Of the following month." value={values.checkInDeadlineDay} min={1} max={28} />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mb-4 text-xl font-semibold">Joker rules</legend>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="poolFractionalJokers" value="yes" defaultChecked={values.poolFractionalJokers} className="mt-1 size-5" />
          <span>
            <span className="block font-semibold">Half jokers from different months can be combined</span>
            <span className="block text-sm text-ink-soft">Off = v1 rule: only a month holding a whole joker can pay.</span>
          </span>
        </label>
        <Num
          name="maxEmptyMonths"
          label="Empty months in a row before elimination"
          hint="Even with jokers left. Leave blank for the v1 rule (jokers can cover empty months forever)."
          value={values.maxEmptyMonths ?? ""}
          min={1}
          max={12}
        />
      </fieldset>

      <label className="block space-y-1">
        <span className="block text-xl font-semibold">Rules shown to players</span>
        <textarea name="rules" defaultValue={values.rules ?? ""} rows={8} maxLength={5000} className="block w-full rounded-xl border border-rule bg-paper-raised p-4" />
      </label>

      {state && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-roller-wash p-4" : "rounded-xl border border-alarm/40 p-4 text-alarm"}>
          {state.ok ? state.message : state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink disabled:opacity-60">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
