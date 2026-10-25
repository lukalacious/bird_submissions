import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";

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
