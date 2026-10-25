"use client";

import { useActionState, useState } from "react";
import { calculateMonthBonus } from "@/lib/rules/check-in-bonus";
import { saveCheckIn } from "./actions";

export interface CheckInDefaults {
  within15km: boolean | null;
  beyond750km: boolean | null;
  nonMotorisedCount: number;
  liferCount: number;
  primaryLocation: string;
}

interface Props {
  year: number;
  monthLabel: string;
  birdCount: number;
  defaults: CheckInDefaults;
  counted: { lifers: number; goldenWithPhoto: number; goldenSet: number };
  isEdit: boolean;
}

function YesNo({ name, legend, value, onChange }: { name: string; legend: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((v) => (
          <label
            key={String(v)}
            className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border font-semibold has-focus-visible:outline-3 ${
              value === v ? "border-roller bg-roller-wash" : "border-rule bg-paper-raised"
            }`}
          >
            <input type="radio" name={name} value={v ? "yes" : "no"} required checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {v ? "Yes" : "No"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Count({ name, label, hint, value, max, onChange }: { name: string; label: string; hint?: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="block font-semibold">{label}</span>
      {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      <input
        type="number"
        name={name}
        inputMode="numeric"
        min={0}
        max={max}
        required
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="block min-h-12 w-28 rounded-xl border border-rule bg-paper-raised px-4 text-lg tabular-nums"
      />
    </label>
  );
}

export function CheckInForm({ year, monthLabel, birdCount, defaults, counted, isEdit }: Props) {
  const [state, action, pending] = useActionState(saveCheckIn, null);
  const [a, setA] = useState(defaults);
  const set = <K extends keyof CheckInDefaults>(k: K) => (v: CheckInDefaults[K]) => setA((s) => ({ ...s, [k]: v }));

  const preview = calculateMonthBonus({
    year,
    checkIn: {
      within15km: a.within15km === true,
      beyond750km: a.beyond750km === true,
      nonMotorisedCount: a.nonMotorisedCount,
      liferCount: a.liferCount,
    },
    goldenWithPhoto: counted.goldenWithPhoto,
  });

  return (
    <form action={action} className="space-y-8">
      <YesNo name="within15km" legend={`Were all your ${monthLabel} birds seen within 15 km of home?`} value={a.within15km} onChange={set("within15km")} />
      <YesNo name="beyond750km" legend="Did you twitch any bird more than 750 km from home?" value={a.beyond750km} onChange={set("beyond750km")} />
      <Count
        name="nonMotorisedCount"
        label="How many birds did you see without a motorised vehicle?"
        hint="On foot, by bike, by boat you paddled. 1 joker for every 10."
        value={a.nonMotorisedCount}
        max={birdCount}
        onChange={set("nonMotorisedCount")}
      />
      <Count name="liferCount" label="How many lifers?" hint={`You ticked ${counted.lifers} as lifers on your list.`} value={a.liferCount} max={99} onChange={set("liferCount")} />
      <div className="space-y-1">
        <p className="font-semibold">Golden birds</p>
        <p className="text-ink-soft">
          {counted.goldenSet === 0
            ? "No golden birds were set this month."
            : `${counted.goldenWithPhoto} of ${counted.goldenSet} golden birds proven with a photo. Counted automatically: add photos from your list on Twitch.`}
        </p>
      </div>
      <label className="block space-y-1">
        <span className="block font-semibold">Where did you mostly bird? (optional)</span>
        <input
          name="primaryLocation"
          maxLength={120}
          value={a.primaryLocation}
          onChange={(e) => set("primaryLocation")(e.target.value)}
          className="block min-h-12 w-full rounded-xl border border-rule bg-paper-raised px-4"
        />
      </label>

      <section aria-live="polite" className="rounded-2xl bg-lilac-wash p-5">
        <h2 className="text-xl font-semibold">
          Bonus: <span className="text-lilac">{preview.total}</span> joker{Math.abs(preview.total) === 1 ? "" : "s"}
        </h2>
        {preview.breakdown.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-ink-soft">
            {preview.breakdown.map((l) => (
              <li key={l.rule}>
                {l.rule}: {l.value > 0 ? "+" : ""}
                {l.value}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-ink-soft">Usable from next month.</p>
      </section>

      {state && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-roller-wash p-4" : "rounded-xl border border-alarm/40 p-4 text-alarm"}>
          {state.ok ? state.message : state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-14 w-full rounded-full bg-roller px-6 text-lg font-semibold text-roller-ink disabled:opacity-60">
        {pending ? "Saving…" : isEdit ? "Update my check-in" : "Send my check-in"}
      </button>
    </form>
  );
}
