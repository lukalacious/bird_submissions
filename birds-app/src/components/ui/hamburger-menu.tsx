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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

// Animation variants for smooth drawer slide
const drawerVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: {
    x: "100%",
    transition: { type: "tween" as const, duration: 0.25, ease: [0.32, 0.72, 0, 1] },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

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

  // Don't render anything on the server to avoid hydration mismatch
  if (typeof window === "undefined") {
    return (
      <button
        className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
    );
  }

  return (
    <>
      {/* Hamburger button - visible on mobile only */}
      <button
        className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
        onClick={openMenu}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* Portal-style overlay - rendered when open */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] md:hidden">
            {/* Dark backdrop with fade animation */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-black/60"
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Slide-out menu panel with slide animation */}
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col"
              style={{ backgroundColor: "#ffffff" }}
            >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <span className="font-bold text-lg text-gray-900">Twitch</span>
              <button
                onClick={closeMenu}
                aria-label="Close menu"
                className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* User info section */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                  <AvatarFallback className="bg-blue-600 text-white font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation links - scrollable */}
            <nav className="flex-1 min-h-0 overflow-y-auto py-2 pb-4 bg-white">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{label}</span>
                  </Link>
                );
              })}

              {/* Divider */}
              <div className="my-2 mx-4 border-t border-gray-200" />

              {/* Profile link */}
              <Link
                href="/profile"
                onClick={closeMenu}
                className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-lg transition-colors ${
                  pathname === "/profile"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">Profile</span>
              </Link>

              {/* Admin link - only for admins */}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-lg transition-colors ${
                    pathname.startsWith("/admin")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">Admin Panel</span>
                </Link>
              )}
            </nav>

            {/* Sign out button - fixed at bottom with padding for bottom nav */}
            <div
              className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 56px + 12px)",
              }}
            >
              <form action={onSignOut}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
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
