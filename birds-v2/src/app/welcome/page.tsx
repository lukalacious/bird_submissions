import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { findMatchesFor } from "@/lib/players";
import { cancelClaim, claimPlayer, confirmNewPlayer } from "./actions";

export const metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const user = await requireUser();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: {
      identityCheckedAt: true,
      linkRequests: { where: { status: "PENDING" }, select: { target: { select: { name: true, username: true } } } },
    },
  });
  if (row?.identityCheckedAt) redirect("/");

  const pending = row?.linkRequests[0];
  if (pending) {
    const name = pending.target.username ?? pending.target.name ?? "that player";
    return (
      <section className="space-y-5">
        <h1 className="text-3xl font-semibold">Almost there</h1>
        <p className="text-lg">
          We&apos;ve asked an admin to join this Google account ({user.email}) to <strong>{name}</strong>&apos;s birds.
        </p>
        <p className="text-ink-soft">
          You&apos;ll be able to twitch as soon as it&apos;s done, usually within a day. Your existing birds and
          jokers stay exactly as they are.
        </p>
        <form action={cancelClaim}>
          <button type="submit" className="font-semibold text-roller underline underline-offset-4">
            That&apos;s not me, choose again
          </button>
        </form>
      </section>
    );
  }

  const matches = await findMatchesFor(user.id);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">Are you already playing?</h1>
        <p className="text-lg text-ink-soft">
          You signed in as {user.email}. This looks like it could be someone already in the challenge. If it&apos;s
          you on a different Google account, we&apos;ll keep all your birds together.
        </p>
      </div>

      <ul className="space-y-3">
        {matches.map((m) => (
          <li key={m.id}>
            <form action={claimPlayer}>
              <input type="hidden" name="targetId" value={m.id} />
              <button
                type="submit"
                className="flex min-h-16 w-full items-center gap-4 rounded-2xl border border-rule bg-paper-raised p-4 text-left hover:border-roller"
              >
                {m.image ? (
                  <Image src={m.image} alt="" width={48} height={48} className="size-12 rounded-full" />
                ) : (
                  <span aria-hidden className="size-12 rounded-full bg-paper-sunk" />
                )}
                <span>
                  <span className="block font-semibold">Yes, I&apos;m {m.name}</span>
                  <span className="block text-sm text-ink-soft">Usually signs in as {m.maskedEmail}</span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={confirmNewPlayer}>
        <button
          type="submit"
          className="min-h-12 w-full rounded-full border border-rule px-6 font-semibold hover:bg-paper-sunk"
        >
          No, I&apos;m new to the challenge
        </button>
      </form>
    </section>
  );
}
