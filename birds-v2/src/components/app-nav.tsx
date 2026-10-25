"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bird, Binoculars, CircleUserRound, Sunrise, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Today", icon: Sunrise },
  { href: "/twitch", label: "Twitch", icon: Binoculars },
  { href: "/flock", label: "Flock", icon: Bird },
  { href: "/me", label: "Me", icon: CircleUserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** One nav for every screen size: bottom tab bar on phones, side rail from md up. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:h-dvh md:border-t-0 md:border-r md:bg-paper md:pb-0"
    >
      <p className="hidden px-6 pt-8 pb-6 font-display text-2xl font-semibold md:block">Twitch</p>
      <ul className="grid grid-cols-4 md:block md:space-y-1 md:px-3">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold md:min-h-12 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-base ${
                  active
                    ? "text-roller md:bg-roller-wash"
                    : "text-ink-soft hover:text-ink md:hover:bg-paper-sunk"
                }`}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
