import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getCurrentChallengeMonth,
  getMonthlySettings,
  getDaysInMonth,
  CHALLENGE_TIMEZONE,
} from "@/lib/settings-utils";
import { sendPushToUser } from "@/lib/push";

// Scheduled daily near month end (vercel.json); only fires when exactly
// 3 days remain in the month (SAST). Nudges players below the cap.

async function run() {
  const { year, month } = getCurrentChallengeMonth();
  const dayOfMonth = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: CHALLENGE_TIMEZONE, day: "numeric" }).format(
      new Date()
    )
  );
  const daysLeft = getDaysInMonth(year, month) - dayOfMonth;

  if (daysLeft !== 3) {
    return { success: true, skipped: true, reason: `daysLeft=${daysLeft}, fires at 3` };
  }

  const { maxBirdsPerPeriod } = await getMonthlySettings(year, month);

  // Users with a push subscription who are below the cap this month
  const subscribedUsers = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  let notified = 0;
  for (const { userId } of subscribedUsers) {
    const count = await prisma.submission.count({ where: { userId, year, month } });
    if (count >= maxBirdsPerPeriod) continue;
    const sent = await sendPushToUser(userId, {
      title: "3 days left this month! 🐦",
      body: `You're at ${count}/${maxBirdsPerPeriod} birds — time for some last-minute twitching.`,
      url: "/twitch",
    });
    if (sent > 0) notified++;
  }

  return { success: true, notified, month, year };
}

function authorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !cronSecret || authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await run());
  } catch (error) {
    console.error("Month-end reminder cron failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && !authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await run());
  } catch (error) {
    console.error("Month-end reminder cron failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
