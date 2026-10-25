import Image from "next/image";
import { Suspense } from "react";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/dal";

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
  const user = await requireUser();

  return (
    <>
      <section className="flex items-center gap-4">
        {user.image && (
          <Image src={user.image} alt="" width={64} height={64} className="size-16 rounded-full" />
        )}
        <div>
          <p className="font-display text-xl font-semibold">{user.username ?? user.name}</p>
          <p className="text-ink-soft">{user.email}</p>
        </div>
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button
          type="submit"
          className="min-h-12 rounded-full border border-rule px-6 font-semibold hover:bg-paper-sunk"
        >
          Sign out
        </button>
      </form>
    </>
  );
}
