/**
 * The ONLY place that decides "which challenge month is it?".
 *
 * The game runs on South African time. Server code (Vercel = UTC) must never
 * call `new Date().getMonth()` for game logic — v1 did in 11 places and showed
 * the wrong month between 00:00 and 02:00 SAST on the 1st. Lint enforces this.
 *
 * Pure functions: `now` is injectable so every boundary is unit-testable.
 */

export const DEFAULT_TIMEZONE = "Africa/Johannesburg";

export type ChallengeMonth = { year: number; month: number };

/** Local wall-clock parts of `date` in `timeZone`. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** UTC instant of local midnight on (year, month, day) in `timeZone`. */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  // Date.UTC normalises overflow (month 13 → January next year)
  const guess = Date.UTC(year, month - 1, day);
  const offsetAt = (ms: number) => {
    const p = zonedParts(new Date(ms), timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
  };
  const first = guess - offsetAt(guess);
  // Second pass corrects for a DST change between guess and result
  return new Date(guess - offsetAt(first));
}

export function getChallengeMonth(now: Date = new Date(), timeZone = DEFAULT_TIMEZONE): ChallengeMonth {
  const { year, month } = zonedParts(now, timeZone);
  return { year, month };
}

export function previousMonth({ year, month }: ChallengeMonth): ChallengeMonth {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth({ year, month }: ChallengeMonth): ChallengeMonth {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** Instant the month ends (local midnight starting the next month). */
export function monthEnd({ year, month }: ChallengeMonth, timeZone = DEFAULT_TIMEZONE): Date {
  return zonedMidnight(year, month + 1, 1, timeZone);
}

/**
 * Can submissions for `target` still be added or edited? True for the current
 * month, and for the previous month until `graceHours` after it ended.
 */
export function isMonthOpen(
  target: ChallengeMonth,
  opts: { now?: Date; graceHours?: number; timeZone?: string } = {}
): boolean {
  const { now = new Date(), graceHours = 0, timeZone = DEFAULT_TIMEZONE } = opts;
  const start = zonedMidnight(target.year, target.month, 1, timeZone);
  const closes = monthEnd(target, timeZone).getTime() + graceHours * 3_600_000;
  return now.getTime() >= start.getTime() && now.getTime() < closes;
}

/** Check-in for month N closes at the end of `deadlineDay` of month N+1. */
export function checkInDeadline(
  target: ChallengeMonth,
  deadlineDay: number,
  timeZone = DEFAULT_TIMEZONE
): Date {
  const { year, month } = nextMonth(target);
  return zonedMidnight(year, month, deadlineDay + 1, timeZone);
}

/** Check-in for `target` opens on `opensDay` of that month and runs to the deadline. */
export function isCheckInOpen(
  target: ChallengeMonth,
  opts: { now?: Date; opensDay?: number; deadlineDay: number; timeZone?: string }
): boolean {
  const { now = new Date(), opensDay = 20, deadlineDay, timeZone = DEFAULT_TIMEZONE } = opts;
  const opens = zonedMidnight(target.year, target.month, opensDay, timeZone);
  const closes = checkInDeadline(target, deadlineDay, timeZone);
  return now.getTime() >= opens.getTime() && now.getTime() < closes.getTime();
}

/** Whole days/hours/minutes until `end` (zeros once passed) — for countdowns. */
export function timeUntil(end: Date, now: Date = new Date()) {
  const ms = Math.max(0, end.getTime() - now.getTime());
  return {
    ms,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
  };
}

/**
 * Months a player can add to right now: the current month, plus last month
 * while its grace window runs. Newest first.
 */
export function openMonths(
  opts: { now?: Date; graceHours?: number; timeZone?: string } = {}
): ChallengeMonth[] {
  const { now = new Date(), timeZone = DEFAULT_TIMEZONE } = opts;
  const current = getChallengeMonth(now, timeZone);
  const previous = previousMonth(current);
  return isMonthOpen(previous, opts) ? [current, previous] : [current];
}
