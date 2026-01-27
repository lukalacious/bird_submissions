"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface OffCanvasMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  onSignOut: () => Promise<void>;
}

// All navigation pages
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/twitch", label: "Twitch", icon: PlusCircle },
  { href: "/submissions", label: "My Twitches", icon: FileText },
  { href: "/community", label: "Community", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/monthly-form", label: "Google Form", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export function HamburgerMenu({ user, onSignOut }: OffCanvasMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Close on escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  // Lock body scroll when open
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

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Menu trigger button */}
      <button
        className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* Off-canvas menu */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsOpen(false)}
            />

            {/* Canvas panel - slides from right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-y-0 right-0 w-[280px] bg-white flex flex-col shadow-xl"
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="font-semibold text-gray-900">Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* User section */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="bg-blue-600 text-white font-medium text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation - takes remaining space */}
              <nav className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{label}</span>
                      </Link>
                    );
                  })}

                  {/* Admin link - only for admins */}
                  {user.role === "ADMIN" && (
                    <>
                      <div className="my-2 border-t border-gray-100" />
                      <Link
                        href="/admin"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          pathname.startsWith("/admin")
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Settings className="h-5 w-5 flex-shrink-0" />
                        <span>Admin Panel</span>
                      </Link>
                    </>
                  )}
                </div>
              </nav>

              {/* Sign out - pinned to bottom */}
              <div
                className="p-4 border-t border-gray-100"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
              >
                <form action={onSignOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
