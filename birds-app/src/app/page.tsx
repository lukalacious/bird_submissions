import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bird, MapPin, CheckCircle, Users } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();

  // If already logged in, redirect to region selection
  if (session?.user) {
    redirect("/region");
  }

  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">Bird Submission Tracker</h1>
          <p className="text-lg opacity-90">Track the birds you&apos;ve spotted each year</p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Bird className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Track Birds</span>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <MapPin className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Multiple Regions</span>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">31 Birds/Submission</span>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Invite Only</span>
            </CardContent>
          </Card>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="p-6">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/region" });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full h-12 text-base font-semibold border-2 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
                Sign in with Google
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              Access is by invitation only. Contact an administrator if you need access.
            </p>
          </CardContent>
        </Card>

        {/* Featured Bird Image */}
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white/30 shadow-lg">
            <Image
              src="/ruddy.jpg"
              alt="Ruddy Turnstone"
              fill
              className="object-cover"
              priority
            />
          </div>
          <p className="mt-3 text-white/80 text-sm">Featured: Ruddy Turnstone</p>
        </div>
      </div>
    </div>
  );
}
