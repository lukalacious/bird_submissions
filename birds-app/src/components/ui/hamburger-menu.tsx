"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Info,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface SlideMenuProps {
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
  { href: "/monthly-form", label: "Google Form", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/about", label: "About", icon: Info },
];

export function HamburgerMenu({ user, onSignOut }: SlideMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Mount portal only on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Menu trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Full-screen overlay portal */}
      {mounted && createPortal(
        <AnimatePresence mode="wait">
          {isOpen && (
            <div
              className="fixed inset-0 md:hidden"
              style={{ zIndex: 9999 }}
            >
              {/* Dark backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-black/60"
              />

              {/* Slide-out drawer panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 300,
                }}
                className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-2xl"
              >
                {/* Drawer content container */}
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* User info */}
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-white">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation links - scrollable */}
                  <nav className="flex-1 overflow-y-auto overscroll-contain p-3">
                    <div className="space-y-1">
                      {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive =
                          pathname === href || pathname.startsWith(href + "/");
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={`
                              flex items-center gap-3 px-4 py-3 rounded-lg
                              transition-all duration-150
                              ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                                  : "text-gray-700 hover:bg-gray-100"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm">{label}</span>
                          </Link>
                        );
                      })}

                      {/* Admin section */}
                      {user.role === "ADMIN" && (
                        <>
                          <div className="my-3 border-t" />
                          <Link
                            href="/admin"
                            className={`
                              flex items-center gap-3 px-4 py-3 rounded-lg
                              transition-all duration-150
                              ${
                                pathname.startsWith("/admin")
                                  ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                                  : "text-gray-700 hover:bg-gray-100"
                              }
                            `}
                          >
                            <Settings className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm">Admin Panel</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </nav>

                  {/* Sign out button - pinned to bottom */}
                  <div className="p-4 border-t bg-white">
                    <form action={onSignOut} className="w-full">
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign out</span>
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
