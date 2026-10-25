"use client";

import { useState } from "react";
import { PhotoButton } from "@/components/photo-button";
import type { SeasonBird } from "@/lib/checklist";

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });

interface Props {
  userId: string;
  year: number;
  current: { year: number; month: number };
  birds: SeasonBird[];
}

/** The whole season by month. Photos can be added to any bird, any time. */
export function SeasonList({ userId, year, current, birds }: Props) {
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const byMonth = new Map<number, SeasonBird[]>();
  for (const b of birds) byMonth.set(b.month, [...(byMonth.get(b.month) ?? []), b]);
  const months = [...byMonth.keys()].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">My {year} birds</h1>
        <p className="text-ink-soft">
          {birds.length} birds, {birds.filter((b) => b.photoUrl).length} with photos.
        </p>
      </header>
      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={notice.kind === "error" ? "rounded-xl border border-alarm/40 p-4 text-alarm" : "rounded-xl bg-roller-wash p-4"}>
          {notice.text}
        </p>
      )}
      {months.length === 0 && <p className="text-ink-soft">No birds yet this season.</p>}
      {months.map((m) => (
        <details key={m} open={m === current.month} className="rounded-2xl border border-rule bg-paper-raised">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between px-4 font-semibold">
            {MONTH.format(new Date(Date.UTC(year, m - 1, 15)))}
            <span className="font-normal text-ink-soft">{byMonth.get(m)!.length} birds</span>
          </summary>
          <ul className="divide-y divide-rule border-t border-rule">
            {byMonth.get(m)!.map((b) => (
              <li key={b.id} className="flex min-h-14 items-center gap-3 px-4">
                <span className="flex-1">
                  {b.label}
                  {b.isLifer && <span className="ml-2 text-sm text-lilac">lifer</span>}
                </span>
                <PhotoButton userId={userId} submissionId={b.id} birdName={b.label} photoUrl={b.photoUrl} month={current} onNotice={setNotice} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
