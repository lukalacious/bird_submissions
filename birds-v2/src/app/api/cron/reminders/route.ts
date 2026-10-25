import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { pushConfigured, sendPush } from "@/lib/push";
import { remindersDue } from "@/lib/rules/reminders";
import { getMonthRules, getSettings } from "@/lib/settings";

/** Claim a reminder for a month; false if it already went out. */
async function claim(type: string, month: { year: number; month: number }) {
  const { count } = await db.cronRun.createMany({ data: [{ type, ...month }], skipDuplicates: true });
  return count === 1;
}

/** Daily at 09:00 SAST. Each reminder is sent at most once per month. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ sent: 0, reason: "Push keys not set" });

  const settings = await getSettings();
  const due = remindersDue(new Date(), { deadlineDay: settings.checkInDeadlineDay, timeZone: settings.timezone });
  const result: Record<string, number> = {};

  if (due.monthEnd && (await claim("remind-month-end", due.monthEnd))) {
    const { maxBirds } = await getMonthRules(due.monthEnd);
    const counts = await db.submission.groupBy({ by: ["userId"], where: due.monthEnd, _count: { _all: true } });
    const full = new Set(counts.filter((c) => c._count._all >= maxBirds).map((c) => c.userId));
    const players = await db.user.findMany({
      where: { pushSubscriptions: { some: {} }, NOT: { challengeStatus: { some: { year: due.monthEnd.year, isEliminated: true } } } },
      select: { id: true },
    });
    result.monthEnd = await sendPush(
      players.map((p) => p.id).filter((id) => !full.has(id)),
      { title: "3 days left this month", body: "Time to tick off a few more birds.", url: "/twitch" }
    );
  }

  if (due.checkIn && (await claim("remind-check-in", due.checkIn))) {
    const players = await db.user.findMany({
      where: {
        pushSubscriptions: { some: {} },
        submissions: { some: due.checkIn },
        checkIns: { none: due.checkIn },
      },
      select: { id: true },
    });
    result.checkIn = await sendPush(players.map((p) => p.id), {
      title: "Check-in closes tomorrow",
      body: "Six quick questions for your bonus jokers.",
      url: "/check-in",
    });
  }

  return NextResponse.json({ due, sent: result });
}
