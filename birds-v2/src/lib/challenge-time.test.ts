import { describe, expect, it } from "vitest";
import {
  checkInDeadline,
  getChallengeMonth,
  isCheckInOpen,
  isMonthOpen,
  monthEnd,
  nextMonth,
  previousMonth,
  timeUntil,
} from "./challenge-time";

// SAST is UTC+2 all year (no DST)
const utc = (iso: string) => new Date(`${iso}Z`);

describe("getChallengeMonth", () => {
  it("is already the new month at 00:30 SAST on the 1st (22:30 UTC the day before)", () => {
    // v1 bug: UTC getMonth() still said October here
    expect(getChallengeMonth(utc("2026-10-31T22:30:00"))).toEqual({ year: 2026, month: 11 });
  });

  it("is still the old month one second before SAST midnight", () => {
    expect(getChallengeMonth(utc("2026-10-31T21:59:59"))).toEqual({ year: 2026, month: 10 });
  });

  it("rolls the year at SAST new year", () => {
    expect(getChallengeMonth(utc("2026-12-31T22:00:00"))).toEqual({ year: 2027, month: 1 });
  });

  it("respects another timezone", () => {
    // 23:30 UTC on 31 Oct is still October in Amsterdam (UTC+1 after DST ends)
    expect(getChallengeMonth(utc("2026-10-31T22:30:00"), "Europe/Amsterdam")).toEqual({
      year: 2026,
      month: 10,
    });
  });
});

describe("month arithmetic", () => {
  it("wraps years", () => {
    expect(previousMonth({ year: 2027, month: 1 })).toEqual({ year: 2026, month: 12 });
    expect(nextMonth({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
  });

  it("monthEnd is SAST midnight starting the next month", () => {
    expect(monthEnd({ year: 2026, month: 12 }).toISOString()).toBe("2026-12-31T22:00:00.000Z");
    expect(monthEnd({ year: 2027, month: 2 }).toISOString()).toBe("2027-02-28T22:00:00.000Z");
  });

  it("handles DST zones", () => {
    // Amsterdam: March 2027 ends at local midnight 1 April, which is UTC+2 (CEST)
    expect(monthEnd({ year: 2027, month: 3 }, "Europe/Amsterdam").toISOString()).toBe(
      "2027-03-31T22:00:00.000Z"
    );
  });
});

describe("isMonthOpen", () => {
  const oct = { year: 2026, month: 10 };

  it("is open during the month", () => {
    expect(isMonthOpen(oct, { now: utc("2026-10-15T12:00:00") })).toBe(true);
  });

  it("closes at SAST month-end with no grace", () => {
    expect(isMonthOpen(oct, { now: utc("2026-10-31T21:59:59") })).toBe(true);
    expect(isMonthOpen(oct, { now: utc("2026-10-31T22:00:00") })).toBe(false);
  });

  it("stays open through the grace window", () => {
    expect(isMonthOpen(oct, { now: utc("2026-11-02T21:59:00"), graceHours: 48 })).toBe(true);
    expect(isMonthOpen(oct, { now: utc("2026-11-02T22:00:00"), graceHours: 48 })).toBe(false);
  });

  it("is not open before the month starts", () => {
    expect(isMonthOpen({ year: 2026, month: 11 }, { now: utc("2026-10-20T12:00:00") })).toBe(false);
  });
});

describe("check-in window", () => {
  const dec = { year: 2026, month: 12 };

  it("deadline is the end of day 7 of the next month", () => {
    expect(checkInDeadline(dec, 7).toISOString()).toBe("2027-01-07T22:00:00.000Z");
  });

  it("opens on day 20 and closes at the deadline", () => {
    const opts = { deadlineDay: 7 };
    expect(isCheckInOpen(dec, { ...opts, now: utc("2026-12-19T21:59:00") })).toBe(false);
    expect(isCheckInOpen(dec, { ...opts, now: utc("2026-12-19T22:00:00") })).toBe(true);
    expect(isCheckInOpen(dec, { ...opts, now: utc("2027-01-07T21:59:00") })).toBe(true);
    expect(isCheckInOpen(dec, { ...opts, now: utc("2027-01-07T22:00:00") })).toBe(false);
  });
});

describe("timeUntil", () => {
  it("breaks down the remaining time and floors at zero", () => {
    const end = utc("2026-10-31T22:00:00");
    expect(timeUntil(end, utc("2026-10-30T20:30:00"))).toMatchObject({ days: 1, hours: 1, minutes: 30 });
    expect(timeUntil(end, utc("2026-11-01T00:00:00")).ms).toBe(0);
  });
});
