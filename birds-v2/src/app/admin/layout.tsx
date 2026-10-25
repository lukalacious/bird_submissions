import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/players", label: "Players" },
];

// Static shell; every admin page checks requireAdmin() inside its own Suspense
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16 md:px-8">
      <header className="mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-rule pb-4">
        <Link href="/" className="font-display text-xl font-semibold">
          Twitch admin
        </Link>
        <nav aria-label="Admin" className="flex gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-semibold text-ink-soft hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
