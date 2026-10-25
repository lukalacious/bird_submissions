import { Suspense } from "react";
import { signIn } from "@/auth";
import { Tally } from "@/components/tally";

export const metadata = { title: "Sign in" };

// Only same-site paths — never an open redirect
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "That Google account is linked to a different player. Sign in with the account you normally use, or ask an admin to link them.",
  AccessDenied: "Google didn't let us sign you in. Try again, or use a different Google account.",
};

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-6 py-12">
      <div className="space-y-4">
        <div className="w-40">
          <Tally count={7} cap={10} decorative />
        </div>
        <h1 className="text-4xl font-semibold">Twitch</h1>
        <p className="text-lg text-ink-soft">A bird a day, all year. Sign in to tick off this month&apos;s birds.</p>
      </div>
      <Suspense>
        <SignInForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInForm({ searchParams }: Pick<PageProps<"/signin">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? "Sign-in failed. Try again.") : null;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-alarm/40 bg-paper-raised p-4 text-alarm">
          {error}
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: next });
        }}
      >
        <button
          type="submit"
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-roller px-6 text-lg font-semibold text-roller-ink"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.9h5.35c-.25 1.45-1.65 4.25-5.35 4.25-3.2 0-5.85-2.65-5.85-5.95S8.8 6.35 12 6.35c1.85 0 3.05.75 3.75 1.4l2.55-2.45C16.65 3.75 14.55 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.8-3.75 8.8-9 0-.6-.05-1.05-.15-1.5z"
            />
          </svg>
          Continue with Google
        </button>
      </form>
      <p className="text-sm text-ink-soft">Use the same Google account every time so your birds stay in one place.</p>
    </div>
  );
}
