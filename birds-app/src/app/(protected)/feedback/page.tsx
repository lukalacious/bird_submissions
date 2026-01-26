import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default async function FeedbackPage() {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: { feedbackFormEmbedUrl: true },
  });
  const formUrl = settings?.feedbackFormEmbedUrl?.trim() || null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <div className="mb-6">
        <h1 className="heading-display text-2xl md:text-3xl text-foreground mb-1 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" />
          Feedback
        </h1>
        <p className="text-muted-foreground">Send us feedback or suggestions</p>
      </div>

      {formUrl ? (
        <>
          <p className="text-muted-foreground mb-4">Use the form below to send feedback or suggestions.</p>
          <Card className="overflow-hidden">
            <iframe
              src={formUrl}
              className="w-full border-0 min-h-[50vh] md:min-h-[600px]"
              title="Feedback form"
            />
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">The feedback form is not configured yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Please check back later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
