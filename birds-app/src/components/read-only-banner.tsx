import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isReadOnly, NEW_APP_URL } from "@/lib/read-only";

/**
 * Shown at the top of every signed-in page once READ_ONLY=1 (after the
 * cutover to v2). Renders nothing otherwise.
 */
export function ReadOnlyBanner() {
  if (!isReadOnly()) return null;

  return (
    <div
      role="status"
      className="bg-amber-100 text-amber-950 border-b border-amber-300 px-4 py-2 text-sm text-center"
    >
      Twitch has moved. This site is a read-only record of the 2026 season.{" "}
      <Link
        href={NEW_APP_URL}
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-700"
      >
        Open the new app
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * Full-page stand-in for pages whose only purpose is to write (Twitch, the
 * Google Form) once the site is read-only.
 */
export function ReadOnlyNotice({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="rounded-xl border border-border bg-card py-12 px-6 text-center shadow-sm">
        <h1 className="heading-display text-2xl text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Twitch has moved to the new app. Your 2026 birds and jokers stay here to look back on,
          but nothing can be added or changed.
        </p>
        <Link
          href={NEW_APP_URL}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open the new app
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
