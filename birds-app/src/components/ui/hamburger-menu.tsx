"use client";

import { useState } from "react";
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
  MessageSquare,
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
  { href: "/submit", label: "Submit Birds", icon: PlusCircle },
  { href: "/activity", label: "Activity", icon: Users },
  { href: "/submissions", label: "My Submissions", icon: FileText },
  { href: "/community", label: "Community", icon: Users },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
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

  return (
    <>
      {/* Hamburger button - positioned for right side via parent flex */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-10 w-10 btn-tactile"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay and slide-out menu from RIGHT */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Slide-out menu from RIGHT side */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-card shadow-xl md:hidden overflow-hidden"
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
                  <span className="font-bold text-lg text-foreground">Bird Tracker</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu"
                    className="btn-tactile"
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
                      <p className="font-medium text-sm truncate text-foreground">{user.name}</p>
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
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-100 active:scale-[0.97] ${
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
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-100 active:scale-[0.97] ${
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
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-100 active:scale-[0.97] ${
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
