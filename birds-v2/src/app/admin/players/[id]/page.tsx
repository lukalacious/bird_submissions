import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { getJokerLedger } from "@/lib/ledger";
import { getSettings } from "@/lib/settings";
import { getStandings } from "@/lib/standing";
import { describeStanding } from "../../standing/describe";
import { adjustJokers, changeRole, eliminate, reinstate, remove, undoAdjustment } from "../actions";

export const metadata = { title: "Player" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-ZA", { month: "short", timeZone: "UTC" });
const monthName = (m: number, f = MONTH) => f.format(new Date(Date.UTC(2026, m - 1, 15)));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const input = "min-h-12 rounded-xl border border-rule bg-paper-raised px-3";
const card = "space-y-3 rounded-2xl border border-rule bg-paper-raised p-5";

export default function PlayerPage(props: PageProps<"/admin/players/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/admin/players" className="inline-flex min-h-11 items-center font-semibold text-roller">
        ‹ All players
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Player {...props} />
      </Suspense>
    </div>
  );
}

async function Player({ params, searchParams }: PageProps<"/admin/players/[id]">) {
  await connection();
  const admin = await requireAdmin();
  const [{ id }, { done, error }, settings] = await Promise.all([params, searchParams, getSettings()]);
  const current = getChallengeMonth(new Date(), settings.timezone);
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, _count: { select: { submissions: true, photos: true, accounts: true } } },
  });
  if (!user) notFound();

  const [{ players, threshold }, { ledger, earned, used }, adjustments] = await Promise.all([
    getStandings(current, id),
    getJokerLedger(id, current.year),
    db.jokerAdjustment.findMany({ where: { userId: id, year: current.year }, orderBy: { createdAt: "desc" } }),
  ]);
  const me = players[0];
  const isSelf = admin.id === id;
  const out = me.standing.kind === "out";
  const name = user.username ?? user.name ?? user.email;

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">
          {name}
          {user.role === "ADMIN" && <span className="ml-3 align-middle text-base font-normal text-ink-soft">admin</span>}
        </h1>
        <p className="text-ink-soft">
          {user.username && user.name ? `${user.name} · ` : ""}
          {user.email} · {user._count.submissions} birds all time · {user._count.accounts} Google {user._count.accounts === 1 ? "account" : "accounts"}
        </p>
      </header>

      {typeof done === "string" && (
        <p role="status" className="rounded-xl bg-roller-wash p-4 font-semibold">
          {done}
        </p>
      )}
      {typeof error === "string" && (
        <p role="alert" className="rounded-xl border-2 border-alarm p-4 font-semibold">
          Not done: {error}
        </p>
      )}

      <section aria-labelledby="season-heading" className={card}>
        <h2 id="season-heading" className="text-xl font-semibold">
          {current.year} season
        </h2>
        <p>{describeStanding(me.standing, me.birdCount, threshold, monthName(current.month))}</p>
        <ol className="grid grid-cols-6 gap-1 text-center text-sm sm:grid-cols-12">
          {me.months.slice(0, current.month).map((n, i) => (
            <li key={i} className="rounded-lg bg-paper-sunk py-1">
              <span className="block text-ink-soft">{monthName(i + 1, SHORT)}</span>
              <span className="font-semibold tabular-nums">{n}</span>
            </li>
          ))}
        </ol>
        <p>
          Jokers: {fmt(earned)} earned, {fmt(used)} used, <strong>{fmt(earned - used)} left</strong>.
        </p>
        {ledger.length > 0 && (
          <ul className="space-y-1 text-sm">
            {ledger.map((m) => (
              <li key={m.month}>
                <span className="font-semibold">{monthName(m.month, SHORT)}</span> {fmt(m.groupJokers)} from families
                {m.bonusLines.map((l) => `, ${l.rule} ${l.value > 0 ? "+" : "−"}${fmt(Math.abs(l.value))}`).join("")}
                {m.used > 0 && `, ${fmt(m.used)} used`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="adjust-heading" className={card}>
        <h2 id="adjust-heading" className="text-xl font-semibold">
          Adjust jokers
        </h2>
        <p className="max-w-prose text-ink-soft">
          Adds to or takes from one month&apos;s bonus jokers. The player sees your reason on their joker list. Jokers
          are usable from the month after.
        </p>
        <form action={adjustJokers} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="userId" value={user.id} />
          <label className="grid gap-1">
            <span className="font-semibold">Month</span>
            <select name="month" defaultValue={current.month} className={input}>
              {Array.from({ length: current.month }, (_, i) => (
                <option key={i} value={i + 1}>
                  {monthName(i + 1)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-semibold">Jokers (+ or −)</span>
            <input name="amount" type="number" step="0.5" min={-20} max={20} required placeholder="e.g. 1 or -0.5" className={`${input} w-36`} />
          </label>
          <label className="grid min-w-0 flex-1 basis-56 gap-1">
            <span className="font-semibold">Reason</span>
            <input name="reason" required minLength={3} maxLength={120} placeholder="e.g. lifer missed on the check-in" className={input} />
          </label>
          <button className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink">Apply</button>
        </form>
        {adjustments.length > 0 && (
          <ul className="divide-y divide-rule border-t border-rule">
            {adjustments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <strong>
                    {a.amount > 0 ? "+" : "−"}
                    {fmt(Math.abs(a.amount))}
                  </strong>{" "}
                  in {monthName(a.month)}: {a.reason}
                </span>
                <form action={undoAdjustment}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="id" value={a.id} />
                  <button className="min-h-11 rounded-full border border-rule px-4 font-semibold">Undo</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="status-heading" className={card}>
        <h2 id="status-heading" className="text-xl font-semibold">
          In or out
        </h2>
        {out ? (
          <>
            <p className="max-w-prose text-ink-soft">
              Reinstating puts {name} back in the {current.year} challenge. Month-end judges them again from the next
              close, so they still need the birds or the jokers.
            </p>
            <form action={reinstate}>
              <input type="hidden" name="userId" value={user.id} />
              <button className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink">Reinstate {name}</button>
            </form>
          </>
        ) : (
          <details>
            <summary className="inline-flex min-h-12 cursor-pointer items-center rounded-full border border-rule px-6 font-semibold">
              Eliminate by hand…
            </summary>
            <div className="mt-3 space-y-3">
              <p className="max-w-prose">
                Month-end does this automatically. Use it only for a ruling. {name} will no longer be able to twitch
                this season. You can reinstate them here.
              </p>
              <form action={eliminate}>
                <input type="hidden" name="userId" value={user.id} />
                <button className="min-h-12 rounded-full border-2 border-alarm px-6 font-semibold">Yes, {name} is out</button>
              </form>
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="role-heading" className={card}>
        <h2 id="role-heading" className="text-xl font-semibold">
          Admin rights
        </h2>
        {isSelf ? (
          <p className="text-ink-soft">This is you. Another admin has to change your role.</p>
        ) : (
          <form action={changeRole} className="space-y-3">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="role" value={user.role === "ADMIN" ? "USER" : "ADMIN"} />
            <p className="max-w-prose text-ink-soft">Admins can change settings, months, players and other people&apos;s birds.</p>
            <button className="min-h-12 rounded-full border border-rule px-6 font-semibold">
              {user.role === "ADMIN" ? "Remove admin rights" : `Make ${name} an admin`}
            </button>
          </form>
        )}
      </section>

      {!isSelf && (
        <section aria-labelledby="remove-heading" className={card}>
          <h2 id="remove-heading" className="text-xl font-semibold">
            Remove player
          </h2>
          <details>
            <summary className="inline-flex min-h-12 cursor-pointer items-center rounded-full border border-rule px-6 font-semibold">
              Remove {name}…
            </summary>
            <form action={remove} className="mt-3 space-y-3">
              <input type="hidden" name="userId" value={user.id} />
              <p className="max-w-prose">
                This deletes {name} and everything they logged: {user._count.submissions} birds, {user._count.photos}{" "}
                photos, their jokers and check-ins. It can&apos;t be undone. For one person with two accounts, merge
                instead.
              </p>
              <label className="grid max-w-md gap-1">
                <span className="font-semibold">Type {user.email} to confirm</span>
                <input name="email" required autoComplete="off" autoCapitalize="none" spellCheck={false} className={input} />
              </label>
              <button className="min-h-12 rounded-full border-2 border-alarm px-6 font-semibold">Delete this player for good</button>
            </form>
          </details>
        </section>
      )}
    </>
  );
}
