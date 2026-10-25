"use client";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <h1 className="text-2xl font-semibold">This page didn&apos;t load</h1>
      <p className="max-w-prose text-ink-soft">
        Your birds are safe. Check your connection and try again. If it keeps happening, send an admin this code:{" "}
        <span className="font-semibold text-ink">{error.digest ?? "no code"}</span>
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-12 rounded-full bg-roller px-6 font-semibold text-roller-ink"
      >
        Try again
      </button>
    </div>
  );
}
