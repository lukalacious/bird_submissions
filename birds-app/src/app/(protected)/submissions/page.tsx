import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Bird, Calendar, Pencil } from "lucide-react";
import { getCurrentChallengeMonth } from "@/lib/settings-utils";
import { DeletableBirdPill } from "@/components/submissions/deletable-bird-pill";
import { RequestChangePill } from "@/components/submissions/request-change-pill";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface BirdEntry {
  birdName: string;
  year: number;
  month: number;
  deletable: boolean;
  requestable: boolean;
}

export default async function SubmissionsPage() {
  const session = await auth();
  const userId = session!.user.id!;

  const current = getCurrentChallengeMonth();

  // All of the user's submissions, across every region (mixed-region months
  // are allowed — the monthly cap is shared)
  const submissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      birdName: true,
      createdAt: true,
      year: true,
      month: true,
      isJokerSubmission: true,
    },
  });

  // Group by submission date
  const byDate = new Map<string, { date: Date; birds: BirdEntry[] }>();
  for (const s of submissions) {
    const dateKey = formatDateKey(s.createdAt);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { date: s.createdAt, birds: [] });
    }
    const isCurrentMonth = s.year === current.year && s.month === current.month;
    byDate.get(dateKey)!.birds.push({
      birdName: s.birdName,
      year: s.year,
      month: s.month,
      // Current month is freely editable until month end (SAST);
      // joker submissions represent spent jokers and can't be removed here
      deletable: isCurrentMonth && !s.isJokerSubmission,
      // Past months are locked — changes go through an admin request
      requestable: !isCurrentMonth && !s.isJokerSubmission,
    });
  }

  // Sort by date descending
  const groups = Array.from(byDate.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  // Calculate total bird count
  const totalBirds = submissions.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          My Submissions
        </h1>
        <p className="text-muted-foreground">All regions</p>
      </div>

      {/* Editable-month hint */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
        <Pencil className="h-4 w-4 text-primary flex-shrink-0" />
        <span>
          {MONTH_NAMES[current.month - 1]} birds are editable until the end of the
          month (SAST) — tap a bird to remove it. Whatever stands on the last day
          is your final list.
        </span>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bird className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalBirds}</p>
                <p className="text-sm text-muted-foreground">Total birds twitched</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">{groups.length}</p>
              <p className="text-sm text-muted-foreground">submission days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions by Date */}
      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Bird className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No submissions yet.</p>
            <Link
              href="/twitch"
              className="text-primary hover:underline inline-block py-2"
            >
              Twitch your first bird →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const dateKey = formatDateKey(g.date);
            const isToday = dateKey === formatDateKey(new Date());

            return (
              <Card key={dateKey} className={`py-0 gap-0 ${isToday ? "border-primary/30 bg-primary/5" : ""}`}>
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(g.date)}
                      {isToday && (
                        <span className="text-xs font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {g.birds.length} bird{g.birds.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-2 px-4">
                  <ul className="flex flex-wrap gap-1">
                    {g.birds
                      .sort((a, b) => a.birdName.localeCompare(b.birdName))
                      .map((bird, idx) =>
                        bird.requestable ? (
                          <RequestChangePill
                            key={`${bird.birdName}-${idx}`}
                            birdName={bird.birdName}
                            year={bird.year}
                            month={bird.month}
                          />
                        ) : (
                          <DeletableBirdPill
                            key={`${bird.birdName}-${idx}`}
                            birdName={bird.birdName}
                            year={bird.year}
                            month={bird.month}
                            deletable={bird.deletable}
                          />
                        )
                      )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
