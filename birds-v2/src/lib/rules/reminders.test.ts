import { describe, expect, it } from "vitest";
import { remindersDue } from "./reminders";

const opts = { deadlineDay: 7, timeZone: "Africa/Johannesburg" };
const at = (iso: string) => new Date(`${iso}Z`);

describe("remindersDue", () => {
  it("sends the month-end nudge once, 2–3 days before the end", () => {
    // October ends 31 Oct 22:00 UTC; 09:00 SAST on the 29th is 2 days 15h before
    expect(remindersDue(at("2026-10-29T07:00:00"), opts).monthEnd).toEqual({ year: 2026, month: 10 });
    expect(remindersDue(at("2026-10-28T07:00:00"), opts).monthEnd).toBeNull();
    expect(remindersDue(at("2026-10-30T07:00:00"), opts).monthEnd).toBeNull();
  });

  it("sends the check-in nudge the day before last month's check-in closes", () => {
    // October's check-in closes 7 Nov 22:00 UTC
    expect(remindersDue(at("2026-11-06T07:00:00"), opts).checkIn).toEqual({ year: 2026, month: 10 });
    expect(remindersDue(at("2026-11-05T07:00:00"), opts).checkIn).toBeNull();
  });

  it("never nudges about the current month's check-in", () => {
    expect(remindersDue(at("2026-10-25T07:00:00"), opts).checkIn).toBeNull();
  });
});
