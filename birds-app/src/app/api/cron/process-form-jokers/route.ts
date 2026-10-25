import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { processFormJokersCore } from "@/lib/form-jokers";
import { getCurrentChallengeMonth } from "@/lib/settings-utils";

// Daily cron: recompute bonus jokers from the Google Form so admins don't
// have to click "process" manually. Safe to re-run — bonuses are set
// deterministically from the sheet, never added.
//
// Processes the current month, plus the previous month during the first
// 7 days (players submit month-N forms in early N+1).

async function run() {
  const { year, month } = getCurrentChallengeMonth();
  const dayOfMonth = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      day: "numeric",
    }).format(new Date())
  );

  const targets: Array<{ year: number; month: number }> = [{ year, month }];
  if (dayOfMonth <= 7) {
    targets.push(month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });
  }

  const summaries = [];
  for (const t of targets) {
    const result = await processFormJokersCore(t.year, t.month, "cron");
    summaries.push({
      year: t.year,
      month: t.month,
      success: result.success,
      matched: result.results.filter((r) => r.matched).length,
      unmatched: result.results.filter((r) => !r.matched).length,
      note: result.error,
    });
  }

  return { success: true, runs: summaries };
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await run());
  } catch (error) {
    console.error("Form joker cron failed:", error);
    return NextResponse.json({ error: "Failed to process form jokers" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await run());
  } catch (error) {
    console.error("Form joker cron failed:", error);
    return NextResponse.json({ error: "Failed to process form jokers" }, { status: 500 });
  }
}
