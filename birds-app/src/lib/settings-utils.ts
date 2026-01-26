import prisma from "@/lib/prisma";

/**
 * Get the number of days in a given month
 */
export function getDaysInMonth(year: number, month: number): number {
  // month is 1-indexed (January = 1)
  return new Date(year, month, 0).getDate();
}

/**
 * Get the monthly settings for a specific year and month.
 * Falls back to global settings if no month-specific settings exist.
 */
export async function getMonthlySettings(year: number, month: number) {
  // Try to get month-specific settings
  const monthly = await prisma.monthlySettings.findUnique({
    where: {
      year_month: { year, month },
    },
  });

  // Fall back to global settings if no monthly override
  if (!monthly) {
    const global = await prisma.settings.findUnique({
      where: { id: "default" },
    });
    return {
      maxBirdsPerPeriod: global?.maxBirdsPerPeriod ?? 31,
      eliminationThreshold: global?.eliminationThreshold ?? 30,
    };
  }

  return {
    maxBirdsPerPeriod: monthly.maxBirdsPerPeriod,
    eliminationThreshold: monthly.eliminationThreshold ?? 30,
  };
}

/**
 * Get all monthly settings for a given year.
 * Returns an array of 12 months with either custom settings or defaults.
 */
export async function getYearlyMonthlySettings(year: number) {
  const [monthlySettings, globalSettings] = await Promise.all([
    prisma.monthlySettings.findMany({
      where: { year },
      orderBy: { month: "asc" },
    }),
    prisma.settings.findUnique({
      where: { id: "default" },
    }),
  ]);

  const globalMax = globalSettings?.maxBirdsPerPeriod ?? 31;
  const globalThreshold = globalSettings?.eliminationThreshold ?? 30;

  // Create a map for quick lookup
  const settingsMap = new Map(
    monthlySettings.map((s) => [s.month, s])
  );

  // Build array for all 12 months
  const months = [];
  for (let month = 1; month <= 12; month++) {
    const custom = settingsMap.get(month);
    const daysInMonth = getDaysInMonth(year, month);

    months.push({
      month,
      year,
      daysInMonth,
      maxBirdsPerPeriod: custom?.maxBirdsPerPeriod ?? globalMax,
      eliminationThreshold: custom?.eliminationThreshold ?? globalThreshold,
      isCustom: !!custom,
    });
  }

  return months;
}
