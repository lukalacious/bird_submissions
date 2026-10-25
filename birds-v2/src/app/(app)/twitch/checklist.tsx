"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Plus, Sparkles, X } from "lucide-react";
import { indexBirds, searchBirds } from "@/lib/bird-search";
import { calculateJokersFromGroup, jokerHint } from "@/lib/rules/jokers";
import type { ChecklistBird, SeasonBird } from "@/lib/checklist";
import { useStoredState } from "@/lib/use-stored-state";
import { PhotoButton } from "@/components/photo-button";
import { removeBird, submitBirds } from "./actions";

export interface OpenMonth {
  key: "current" | "previous";
  year: number;
  month: number;
  label: string;
  cap: number;
  closesLabel: string | null;
}

interface TrayItem {
  birdId: string;
  lifer: boolean;
}

interface Props {
  userId: string;
  regions: { id: string; name: string; label: string }[];
  regionId: string;
  birds: ChecklistBird[];
  special: { golden: string[]; photo: string[] };
  season: SeasonBird[];
  months: OpenMonth[];
  isEliminated: boolean;
}

const MONTH_SHORT = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const monthName = (m: number) => MONTH_SHORT.format(new Date(Date.UTC(2026, m - 1, 15)));

const EMPTY_TRAY: TrayItem[] = [];
const EMPTY_CUSTOMS: string[] = [];

export function Checklist({ userId, regions, regionId, birds, special, season, months, isEliminated }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<OpenMonth["key"]>("current");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // The tray survives reloads and dropped signal in the field
  const [tray, setTray] = useStoredState(`twitch-tray:${regionId}`, EMPTY_TRAY);
  const [customs, setCustoms] = useStoredState(`twitch-customs:${regionId}`, EMPTY_CUSTOMS);

  const month = months.find((m) => m.key === target) ?? months[0];
  const index = useMemo(() => indexBirds(birds), [birds]);
  const results = useMemo(() => searchBirds(index, query), [index, query]);
  const birdById = useMemo(() => new Map(birds.map((b) => [b.id, b])), [birds]);
  const golden = useMemo(() => new Set(special.golden), [special.golden]);
  const photo = useMemo(() => new Set(special.photo), [special.photo]);

  const seasonForMonth = season.filter((s) => s.year === month.year);
  const twitchedMonth = new Map(
    seasonForMonth.filter((s) => s.speciesId).map((s) => [s.speciesId!, s.month] as const)
  );
  const thisMonth = season.filter((s) => s.year === month.year && s.month === month.month);
  const inTray = new Set(tray.map((t) => t.birdId));
  const trayCount = tray.length + customs.length;
  const remaining = Math.max(0, month.cap - thisMonth.length - trayCount);

  // Live group-joker preview for the groups the tray touches
  const jokerLines = useMemo(() => {
    const before = new Map<string, number>();
    for (const s of thisMonth) if (s.group) before.set(s.group, (before.get(s.group) ?? 0) + 1);
    const added = new Map<string, number>();
    for (const t of tray) {
      const g = birdById.get(t.birdId)?.group;
      if (g) added.set(g, (added.get(g) ?? 0) + 1);
    }
    return [...added.entries()].map(([group, n]) => {
      const was = before.get(group) ?? 0;
      const gain = calculateJokersFromGroup(was + n) - calculateJokersFromGroup(was);
      const hint = jokerHint(was + n);
      return gain > 0
        ? { group, text: `+${gain} joker${gain === 1 ? "" : "s"} from ${group} (${was + n} birds)`, gain }
        : { group, text: `${group}: ${hint.birdsNeeded} more for +${hint.reward} joker`, gain: 0 };
    });
  }, [thisMonth, tray, birdById]);

  function toggle(bird: ChecklistBird) {
    setNotice(null);
    setTray((t) => (t.some((x) => x.birdId === bird.id) ? t.filter((x) => x.birdId !== bird.id) : [...t, { birdId: bird.id, lifer: false }]));
  }

  function submit() {
    setNotice(null);
    startTransition(async () => {
      const result = await submitBirds({
        regionId,
        target,
        birdIds: tray.map((t) => t.birdId),
        liferBirdIds: tray.filter((t) => t.lifer).map((t) => t.birdId),
        customNames: customs,
      });
      if (result.ok) {
        setTray([]);
        setCustoms([]);
        setQuery("");
        setReviewOpen(false);
        setNotice({ kind: "ok", text: result.message });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: result.error });
      }
    });
  }

  function remove(submissionId: string) {
    startTransition(async () => {
      const result = await removeBird({ submissionId });
      setNotice(result.ok ? { kind: "ok", text: result.message } : { kind: "error", text: result.error });
      if (result.ok) router.refresh();
    });
  }

  if (isEliminated) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">Twitch</h1>
        <p className="max-w-prose text-ink-soft">
          You&apos;re out of this season&apos;s challenge, so the checklist is closed. You can still follow everyone in
          Flock.
        </p>
      </div>
    );
  }

  const canAddCustom = query.trim().length >= 3 && !customs.some((c) => c.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="space-y-6 pb-40">
      <header className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold">Twitch</h1>
          <p className="text-ink-soft">
            <span className="font-semibold text-ink">{thisMonth.length}</span> of {month.cap} in {month.label}
          </p>
        </div>

        {months.length > 1 && (
          <div role="radiogroup" aria-label="Which month are you adding to?" className="grid grid-cols-2 gap-2">
            {months.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={target === m.key}
                onClick={() => setTarget(m.key)}
                className={`min-h-14 rounded-xl border px-3 text-left ${
                  target === m.key ? "border-roller bg-roller-wash" : "border-rule"
                }`}
              >
                <span className="block font-semibold">{m.label}</span>
                <span className="block text-sm text-ink-soft">
                  {m.closesLabel ? `Still open until ${m.closesLabel}` : "This month"}
                </span>
              </button>
            ))}
          </div>
        )}

        {regions.length > 1 && (
          <label className="flex items-center gap-3">
            <span className="text-ink-soft">Region</span>
            <select
              value={regionId}
              onChange={(e) => {
                const r = regions.find((x) => x.id === e.target.value);
                if (r) router.push(`/twitch?region=${r.name}`);
              }}
              className="min-h-11 rounded-lg border border-rule bg-paper-raised px-3"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`rounded-xl p-4 ${notice.kind === "error" ? "border border-alarm/40 text-alarm" : "bg-roller-wash"}`}
        >
          {notice.text}
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="bird-search" className="font-semibold">
          Find a bird
        </label>
        <input
          id="bird-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Type a few letters, e.g. fiscal"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block min-h-14 w-full rounded-xl border border-rule bg-paper-raised px-4 text-lg placeholder:text-ink-soft/70"
        />
      </div>

      {query.trim() ? (
        <section aria-label="Search results" className="space-y-2">
          {results.length === 0 && <p className="text-ink-soft">No bird in this region matches “{query.trim()}”.</p>}
          <ul className="space-y-2">
            {results.map((b) => {
              const seenIn = twitchedMonth.get(b.speciesId);
              const selected = inTray.has(b.id);
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    disabled={seenIn !== undefined}
                    aria-pressed={selected}
                    onClick={() => toggle(b)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left disabled:opacity-60 ${
                      selected ? "border-roller bg-roller-wash" : "border-rule bg-paper-raised"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{b.displayName}</span>
                      <span className="block truncate text-sm text-ink-soft italic">{b.scientificName}</span>
                    </span>
                    {golden.has(b.speciesId) && (
                      <span className="rounded-full bg-weaver px-2 py-0.5 text-sm font-semibold text-weaver-ink">Golden</span>
                    )}
                    {photo.has(b.speciesId) && <Camera aria-label="Photo bird" className="size-5 text-ink-soft" />}
                    {seenIn !== undefined ? (
                      <span className="text-sm text-ink-soft">Twitched in {monthName(seenIn)}</span>
                    ) : selected ? (
                      <Check aria-hidden className="size-6 text-roller" />
                    ) : (
                      <Plus aria-hidden className="size-6 text-ink-soft" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length === 40 && <p className="text-sm text-ink-soft">Keep typing to narrow it down.</p>}
          {canAddCustom && (
            <button
              type="button"
              onClick={() => {
                setCustoms((c) => [...c, query.trim()]);
                setQuery("");
              }}
              className="min-h-12 w-full rounded-xl border border-dashed border-rule px-4 text-left text-ink-soft"
            >
              Not listed? Add “{query.trim()}” as an unlisted bird
            </button>
          )}
        </section>
      ) : (
        <section aria-labelledby="month-heading" className="space-y-2">
          <h2 id="month-heading" className="text-xl font-semibold">
            Your {month.label}
          </h2>
          {thisMonth.length === 0 ? (
            <p className="text-ink-soft">Nothing yet. Search above to add the birds you&apos;ve seen.</p>
          ) : (
            <ul className="divide-y divide-rule rounded-xl border border-rule bg-paper-raised">
              {thisMonth.map((s) => (
                <li key={s.id} className="flex min-h-14 items-center gap-3 px-4">
                  <span className="flex-1">
                    {s.label}
                    {s.isLifer && <span className="ml-2 text-sm text-lilac">lifer</span>}
                  </span>
                  <PhotoButton
                    userId={userId}
                    submissionId={s.id}
                    birdName={s.label}
                    photoUrl={s.photoUrl}
                    month={months[0]}
                    onNotice={setNotice}
                  />
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    aria-label={`Remove ${s.label}`}
                    className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-paper-sunk"
                  >
                    <X aria-hidden className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {trayCount > 0 && (
        <aside
          aria-label="Birds ready to add"
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-rule bg-paper-raised shadow-[0_-8px_24px_-12px_oklch(0.26_0.035_155/0.25)] md:bottom-0 md:left-60"
        >
          <div className="mx-auto max-w-2xl space-y-3 px-4 py-3 md:px-8">
            {reviewOpen && (
              <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
                {tray.map((t) => {
                  const b = birdById.get(t.birdId);
                  if (!b) return null;
                  return (
                    <li key={t.birdId} className="flex min-h-12 items-center gap-2">
                      <span className="flex-1">{b.displayName}</span>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={t.lifer}
                          onChange={(e) =>
                            setTray((all) => all.map((x) => (x.birdId === t.birdId ? { ...x, lifer: e.target.checked } : x)))
                          }
                          className="size-5 accent-[var(--lilac)]"
                        />
                        Lifer
                      </label>
                      <button
                        type="button"
                        onClick={() => toggle(b)}
                        aria-label={`Take ${b.displayName} out`}
                        className="grid size-11 place-items-center rounded-full text-ink-soft"
                      >
                        <X aria-hidden className="size-5" />
                      </button>
                    </li>
                  );
                })}
                {customs.map((c) => (
                  <li key={c} className="flex min-h-12 items-center gap-2">
                    <span className="flex-1">
                      {c} <span className="text-sm text-ink-soft">unlisted</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustoms((all) => all.filter((x) => x !== c))}
                      aria-label={`Take ${c} out`}
                      className="grid size-11 place-items-center rounded-full text-ink-soft"
                    >
                      <X aria-hidden className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {jokerLines.length > 0 && (
              <ul className="space-y-0.5 text-sm">
                {jokerLines.slice(0, 3).map((l) => (
                  <li key={l.group} className={l.gain > 0 ? "font-semibold text-lilac" : "text-ink-soft"}>
                    {l.gain > 0 && <Sparkles aria-hidden className="mr-1 inline size-4" />}
                    {l.text}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReviewOpen((o) => !o)}
                aria-expanded={reviewOpen}
                className="min-h-12 flex-1 text-left"
              >
                <span className="block font-semibold">
                  {trayCount} bird{trayCount === 1 ? "" : "s"} ready
                </span>
                <span className="block text-sm text-ink-soft">
                  {reviewOpen ? "Hide list" : "Review"} · {remaining} left this month
                </span>
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || thisMonth.length + trayCount > month.cap}
                className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink disabled:opacity-60"
              >
                {pending ? "Adding…" : `Add to ${month.label}`}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
