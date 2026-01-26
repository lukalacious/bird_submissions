import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function MonthlyFormPage() {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: { monthlyFormEmbedUrl: true },
  });
  const formUrl = settings?.monthlyFormEmbedUrl?.trim() || null;

  // Convert embed URL to direct link (remove ?embedded=true)
  const directUrl = formUrl?.replace("?embedded=true", "") || null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <div className="mb-6">
        <h1 className="heading-display text-2xl md:text-3xl text-foreground mb-1 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary" />
          Google Form
        </h1>
        <p className="text-muted-foreground">Complete your monthly form submission</p>
      </div>

      {directUrl ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Monthly Bird-A-Day Challenge</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Please complete the form below. This form should be filled out once per month to record your challenge progress.
            </p>
            <Button asChild size="lg">
              <Link href={directUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5 mr-2" />
                Open Google Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">The Google Form is not configured yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Please check back later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
