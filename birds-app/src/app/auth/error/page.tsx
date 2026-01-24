"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; description: string }> = {
    AccessDenied: {
      title: "Access Denied",
      description:
        "Your email address is not registered in our system. Please contact an administrator to request access.",
    },
    Configuration: {
      title: "Configuration Error",
      description:
        "The database or auth setup may be missing or misconfigured. Run `npx prisma db push` and `npm run db:seed`, then restart the dev server. If you use Neon and see TLS errors, try the direct (non-pooler) connection string in .env. Check the terminal running `npm run dev` for the actual error.",
    },
    Verification: {
      title: "Verification Error",
      description: "The verification link may have expired or already been used.",
    },
    Default: {
      title: "Authentication Error",
      description: "An error occurred during authentication. Please try again.",
    },
  };

  const { title, description } = errorMessages[error || ""] || errorMessages.Default;

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild variant="default" className="w-full">
            <Link href="/">Return to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen gradient-primary flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
