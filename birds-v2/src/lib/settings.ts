import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, type ChallengeMonth } from "@/lib/challenge-time";

export const SETTINGS_TAG = "settings";

const DEFAULTS = {
  maxBirdsPerPeriod: 31,
  eliminationThreshold: 30,
  timezone: DEFAULT_TIMEZONE,
  graceHours: 0,
  checkInDeadlineDay: 7,
};

/** Game settings — read on nearly every page, so cached until an admin edits them. */
export async function getSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("days");

  const row = await db.settings.findUnique({ where: { id: "default" } });
  return { ...DEFAULTS, ...row };
}

/** Bird cap and elimination threshold for one month (monthly override → global). */
export async function getMonthRules({ year, month }: ChallengeMonth) {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("days");

  const [settings, monthly] = await Promise.all([
    getSettings(),
    db.monthlySettings.findUnique({ where: { year_month: { year, month } } }),
  ]);
  return {
    maxBirds: monthly?.maxBirdsPerPeriod ?? settings.maxBirdsPerPeriod,
    eliminationThreshold: monthly?.eliminationThreshold ?? settings.eliminationThreshold,
  };
}
