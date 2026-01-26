import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bird, ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { SuccessAnimation } from "./success-animation";

interface SuccessPageProps {
  searchParams: Promise<{ count?: string; region?: string }>;
}

async function SuccessContent({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const count = parseInt(params.count || "0", 10);
  const region = params.region || "";

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <SuccessAnimation>
        <Card className="text-center overflow-hidden">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
              <svg
                className="h-12 w-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Submission Successful!
            </CardTitle>
            <CardDescription className="text-base">
              Your bird sightings have been recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center justify-center gap-2 text-5xl font-bold text-purple-600">
                <Bird className="h-12 w-12" />
                <span>{count}</span>
              </div>
            </div>
            <p className="text-gray-600 text-lg">
              {count === 1 ? "bird" : "birds"} submitted successfully
            </p>

            <div className="flex flex-col gap-3 pt-4">
              {region && (
                <Button asChild className="w-full min-h-[44px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                  <Link href={`/submit?region=${region}`}>
                    Submit More Birds
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="w-full min-h-[44px]">
                <Link href="/dashboard">Choose Another Region</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </SuccessAnimation>
    </div>
  );
}

export default function SuccessPage(props: SuccessPageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      }
    >
      <SuccessContent {...props} />
    </Suspense>
  );
}
