import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { closeMonth, monthDueForClose } from "@/lib/month-end";

/**
 * Daily. Closes last month once its grace window has passed: covers
 * shortfalls with jokers or eliminates. Safe to run any number of times.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = await monthDueForClose();
  if (!month) return NextResponse.json({ ran: false, reason: "No month due" });
  const summary = await closeMonth(month);
  return NextResponse.json({ ran: Boolean(summary), summary });
}
