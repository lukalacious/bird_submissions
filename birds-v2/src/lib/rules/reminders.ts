import {
  checkInDeadline,
  getChallengeMonth,
  monthEnd,
  openCheckInMonth,
  timeUntil,
  type ChallengeMonth,
} from "@/lib/challenge-time";

/**
 * Which reminders are due at `now` (the cron runs once a day, so each window
 * is one day wide; CronRun makes each send happen at most once).
 *  - monthEnd: 2–3 days before the month closes
 *  - checkIn:  1–2 days before last month's check-in closes
 */
export function remindersDue(now: Date, opts: { deadlineDay: number; timeZone: string }) {
  const current = getChallengeMonth(now, opts.timeZone);
  const toMonthEnd = timeUntil(monthEnd(current, opts.timeZone), now).days;

  const checkInMonth = openCheckInMonth({ now, deadlineDay: opts.deadlineDay, timeZone: opts.timeZone });
  const toCheckIn = checkInMonth ? timeUntil(checkInDeadline(checkInMonth, opts.deadlineDay, opts.timeZone), now).days : null;

  return {
    monthEnd: toMonthEnd === 2 ? current : null,
    // only last month's check-in: this month's is still days from closing
    checkIn: checkInMonth && toCheckIn === 1 && !sameMonth(checkInMonth, current) ? checkInMonth : null,
  };
}

const sameMonth = (a: ChallengeMonth, b: ChallengeMonth) => a.year === b.year && a.month === b.month;

const MONTH_NAME = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });

/** The push sent when an admin sets or adds to the current month's golden birds. */
export function goldenAnnouncement(month: number, names: string[], isUpdate: boolean) {
  const monthName = MONTH_NAME.format(new Date(Date.UTC(2026, month - 1, 15)));
  const shown = names.slice(0, 4).join(", ") + (names.length > 4 ? ` and ${names.length - 4} more` : "");
  return {
    title: isUpdate ? `${monthName}'s golden birds have changed` : `${monthName}'s golden birds are out`,
    body: `${shown}. Each one is worth a bonus joker.`,
    url: "/",
  };
}
