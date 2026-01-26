"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, Users, FileText } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard", label: "Submit", icon: PlusCircle },
  { href: "/community", label: "Community", icon: Users },
  { href: "/submissions", label: "My Birds", icon: FileText },
];

function isActive(href: string, label: string, pathname: string): boolean {
  if (label === "Submit") return pathname.startsWith("/submit");
  if (label === "My Birds") return pathname.startsWith("/submissions");
  if (label === "Community") return pathname.startsWith("/community") || pathname.startsWith("/activity");
  if (label === "Home") return pathname === "/dashboard";
  return pathname === href;
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-1px_3px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, label, pathname);
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center min-h-[48px] py-2 px-3 flex-1 transition-all duration-100 active:scale-95 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-xs font-medium mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
