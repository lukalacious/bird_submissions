"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  PlusCircle,
  Users,
  FileText,
  ClipboardList,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Separator } from "./separator";

interface HamburgerMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  onSignOut: () => Promise<void>;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/twitch", label: "Twitch", icon: PlusCircle },
  { href: "/submissions", label: "My Twitches", icon: FileText },
  { href: "/community", label: "Community", icon: Users },
  { href: "/activity", label: "Activity", icon: Users },
  { href: "/monthly-form", label: "Google Form", icon: ClipboardList },
];

export function HamburgerMenu({ user, onSignOut }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Close menu on escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  // Handle body scroll lock and escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleEscape]);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger button - visible on mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-10 w-10"
        onClick={openMenu}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Slide-out menu from RIGHT side */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-card shadow-xl md:hidden transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
            <span className="font-bold text-lg">Twitch</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMenu}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="flex-shrink-0 p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation - scrollable area */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-secondary text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}

            <Separator className="my-3" />

            <Link
              href="/profile"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                pathname === "/profile"
                  ? "bg-secondary text-primary"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <User className="h-5 w-5" />
              <span className="font-medium">Profile</span>
            </Link>

            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-secondary text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Admin Panel</span>
              </Link>
            )}
          </nav>

          {/* Sign out - fixed at bottom */}
          <div className="flex-shrink-0 p-4 border-t border-border bg-card">
            <form action={onSignOut}>
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
