import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Flown off</h1>
      <p className="text-ink-soft">There&apos;s nothing at this address.</p>
      <Link href="/" className="font-semibold text-roller underline underline-offset-4">
        Go to Today
      </Link>
    </main>
  );
}
