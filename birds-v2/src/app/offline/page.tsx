export const metadata = { title: "Offline" };

// Served by the service worker when there's no signal
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">No signal</h1>
      <p className="text-ink-soft">
        Twitch needs a connection to load. Birds you&apos;ve already put in your list on Twitch are saved on this phone
        and will be waiting when you&apos;re back online.
      </p>
    </main>
  );
}
