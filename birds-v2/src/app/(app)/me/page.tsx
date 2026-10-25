import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { getJokerLedger } from "@/lib/ledger";
import { getSettings } from "@/lib/settings";
import { NotificationsToggle } from "@/components/notifications-toggle";

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const monthName = (year: number, m: number) => MONTH.format(new Date(Date.UTC(year, m - 1, 15)));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const metadata = { title: "Me" };

export default function MePage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Me</h1>
      <Suspense fallback={<div className="h-20 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const user = await requirePlayer();
  const accounts = await db.account.findMany({
    where: { userId: user.id },
    select: { id: true, email: true, provider: true },
  });

  return (
    <>
      <section className="flex items-center gap-4">
        {user.image && <Image src={user.image} alt="" width={64} height={64} className="size-16 rounded-full" />}
        <div>
          <p className="font-display text-xl font-semibold">{user.username ?? user.name}</p>
          <p className="text-ink-soft">{user.email}</p>
        </div>
      </section>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Ledger userId={user.id} />
      </Suspense>

      <Link
        href="/me/birds"
        className="flex min-h-14 items-center justify-between rounded-2xl border border-rule bg-paper-raised px-5 font-semibold"
      >
        My birds this season, and photos
        <span aria-hidden>›</span>
      </Link>

      <section aria-labelledby="accounts-heading" className="space-y-3">
        <h2 id="accounts-heading" className="text-xl font-semibold">
          Google accounts
        </h2>
        <p className="max-w-prose text-ink-soft">
          Signing in with any of these opens your birds. Add your other Google accounts so you never end up with two
          players by mistake.
        </p>
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
          {accounts.map((a) => (
            <li key={a.id} className="px-4 py-3">
              {a.email ?? "Google account"}
            </li>
          ))}
        </ul>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/me" }, { prompt: "select_account" });
          }}
        >
          <button
            type="submit"
            className="min-h-12 rounded-full border border-rule px-6 font-semibold hover:bg-paper-sunk"
          >
            Link another Google account
          </button>
        </form>
      </section>

      <NotificationsToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />

      {user.role === "ADMIN" && (
        <Link href="/admin" className="inline-flex min-h-12 items-center font-semibold text-roller underline underline-offset-4">
          Open admin
        </Link>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button type="submit" className="min-h-12 rounded-full px-6 font-semibold text-ink-soft hover:bg-paper-sunk">
          Sign out
        </button>
      </form>
    </>
  );
}

async function Ledger({ userId }: { userId: string }) {
  const settings = await getSettings();
  const { year } = getChallengeMonth(new Date(), settings.timezone);
  const { ledger, earned, used } = await getJokerLedger(userId, year);

  return (
    <section aria-labelledby="ledger-heading" className="space-y-3">
      <h2 id="ledger-heading" className="text-xl font-semibold">
        Jokers {year}
      </h2>
      <p>
        Earned <strong className="text-lilac">{fmt(earned)}</strong>, used <strong>{fmt(used)}</strong>, left{" "}
        <strong className="text-lilac">{fmt(earned - used)}</strong>.
      </p>
      {ledger.length === 0 ? (
        <p className="text-ink-soft">No jokers yet. Three birds from one group earns your first.</p>
      ) : (
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
          {ledger.map((m) => (
            <li key={m.month} className="space-y-1 px-4 py-3">
              <p className="flex justify-between font-semibold">
                {monthName(year, m.month)}
                <span className="text-lilac">+{fmt(m.groupJokers + m.bonusJokers)}</span>
              </p>
              <p className="text-sm text-ink-soft">
                {fmt(m.groupJokers)} from groups
                {m.bonusLines.length > 0 && `, ${m.bonusLines.map((l) => `${l.rule} ${l.value > 0 ? "+" : ""}${l.value}`).join(", ")}`}
                {m.used > 0 && `. ${fmt(m.used)} spent later.`}
              </p>
              {m.coveredBy.length > 0 && (
                <p className="text-sm">
                  Short this month: covered with{" "}
                  {m.coveredBy.map((c) => `${fmt(c.amount)} from ${monthName(year, c.fromMonth)}`).join(" and ")}.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
