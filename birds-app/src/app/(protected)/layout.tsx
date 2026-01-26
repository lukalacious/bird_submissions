import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Bird, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { AnimatedPage } from "@/components/ui/animated-page";
import { BottomNav } from "@/components/ui/bottom-nav";
import { HamburgerMenu } from "@/components/ui/hamburger-menu";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  if (!session.user.id) {
    redirect("/auth/error?error=Configuration");
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Nav - Left side */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <Bird className="h-8 w-8 text-primary transition-transform group-hover:scale-105" />
                <span className="font-semibold text-xl text-foreground hidden sm:inline tracking-tight">Bird Tracker</span>
              </Link>
              <nav className="hidden md:flex items-center gap-8">
                <Link
                  href="/submissions"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Submissions
                </Link>
                <Link
                  href="/community"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Community
                </Link>
                <Link
                  href="/activity"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Activity
                </Link>
              </nav>
            </div>

            {/* Right side: Profile (desktop) + Hamburger (mobile) */}
            <div className="flex items-center gap-2">
              {/* Hamburger Menu (mobile) - positioned on right */}
              <HamburgerMenu
                user={{
                  name: session.user.name,
                  email: session.user.email,
                  image: session.user.image,
                  role: session.user.role,
                }}
                onSignOut={handleSignOut}
              />

              {/* User Menu (desktop only - hidden on mobile where hamburger is shown) */}
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hidden md:flex">
                  <Avatar className="h-10 w-10 ring-2 ring-border ring-offset-2 ring-offset-background">
                    <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {session.user.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/feedback" className="cursor-pointer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Feedback
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={handleSignOut}>
                    <button type="submit" className="flex items-center w-full cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-0">
        <AnimatedPage>{children}</AnimatedPage>
      </main>

      <BottomNav />
    </div>
  );
}
