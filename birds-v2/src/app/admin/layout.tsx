import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/changes", label: "Changes" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/check-ins", label: "Check-ins" },
  { href: "/admin/months", label: "Months" },
  { href: "/admin/settings", label: "Settings" },
];

// Static shell; every admin page checks requireAdmin() inside its own Suspense
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16 md:px-8">
      <header className="mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-rule pb-4">
        <Link href="/" className="font-display text-xl font-semibold">
          Twitch admin
        </Link>
        <nav aria-label="Admin" className="flex flex-wrap gap-x-4 gap-y-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-semibold text-ink-soft hover:text-ink">
              {l.label}
            </Link>
          ))}
          <a href="/admin/export" className="font-semibold text-ink-soft hover:text-ink">Export CSV</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
