import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bird } from "lucide-react";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();

  // If already logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-12">
          {/* Logo & Brand */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <Bird className="h-12 w-12 text-primary" strokeWidth={1.5} />
              <h1 className="text-4xl font-bold text-white tracking-tight">Twitch</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Bird tracking
            </p>
          </div>

          {/* Sign In Button */}
          <div className="flex justify-center">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button
                type="submit"
                className="h-10 text-sm font-medium bg-white hover:bg-slate-100 text-slate-900 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg px-6"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-slate-500 text-sm">
          Built by{" "}
          <Link
            href="https://github.com/lukalacious"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            @lukalacious
          </Link>
        </p>
      </footer>
    </div>
  );
}
