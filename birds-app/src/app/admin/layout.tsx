import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bird, Users, UserPlus, Settings, ArrowLeft } from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: Bird },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/add-user", label: "Add User", icon: UserPlus },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/");
  }

  // Redirect if not admin
  if (session.user.role !== "ADMIN") {
    redirect("/region");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-purple-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/region" className="flex items-center gap-2 text-purple-200 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to App</span>
              </Link>
              <div className="h-6 w-px bg-purple-700" />
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <span className="font-semibold">Admin Panel</span>
              </div>
            </div>
            <div className="text-sm text-purple-200">
              {session.user.name} ({session.user.email})
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white border-r border-gray-200 hidden md:block">
          <nav className="p-4 space-y-1">
            {adminNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden w-full bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {adminNavItems.map((item) => (
              <Button
                key={item.href}
                variant="outline"
                size="sm"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-1 h-3 w-3" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
