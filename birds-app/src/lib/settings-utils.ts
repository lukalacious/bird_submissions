import prisma from "@/lib/prisma";

/**
 * The challenge runs on South African time: submissions for a month are
 * editable until midnight SAST on the last day, then final.
 */
export const CHALLENGE_TIMEZONE = "Africa/Johannesburg";

export function getCurrentChallengeMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHALLENGE_TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  return { year, month };
}

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
    const maxBirds = global?.maxBirdsPerPeriod ?? 31;
    return {
      maxBirdsPerPeriod: maxBirds,
      // Default elimination threshold to maxBirdsPerPeriod (monthly goal = threshold)
      eliminationThreshold: global?.eliminationThreshold ?? maxBirds,
      goldenBirds: [] as string[],
      photoBirds: [] as string[],
    };
  }

  return {
    maxBirdsPerPeriod: monthly.maxBirdsPerPeriod,
    // Default to maxBirdsPerPeriod if eliminationThreshold not explicitly set
    eliminationThreshold: monthly.eliminationThreshold ?? monthly.maxBirdsPerPeriod,
    goldenBirds: monthly.goldenBirds,
    photoBirds: monthly.photoBirds,
  };
}

/**
 * Resolve the month's golden/photo bird names to scientificName sets.
 * Matching is by species across ALL regions (a golden bird counts whether
 * ticked in SA, EA or WA), and name matching is case-insensitive since
 * admins type names as announced in the group.
 */
export async function getSpecialBirdSpecies(year: number, month: number) {
  const { goldenBirds, photoBirds } = await getMonthlySettings(year, month);
  const allNames = [...goldenBirds, ...photoBirds];

  if (allNames.length === 0) {
    return {
      goldenBirds,
      photoBirds,
      goldenResolved: [] as { name: string; scientificName: string | null }[],
      photoResolved: [] as { name: string; scientificName: string | null }[],
      goldenSpecies: new Set<string>(),
      photoSpecies: new Set<string>(),
    };
  }

  const birds = await prisma.bird.findMany({
    where: {
      OR: allNames.map((name) => ({
        fullName: { equals: name, mode: "insensitive" as const },
      })),
    },
    select: { fullName: true, scientificName: true },
  });

  const sciByLowerName = new Map(
    birds.map((b) => [b.fullName.toLowerCase(), b.scientificName])
  );
  const resolve = (names: string[]) =>
    names.map((name) => ({
      name,
      scientificName: sciByLowerName.get(name.toLowerCase()) ?? null,
    }));
  const goldenResolved = resolve(goldenBirds);
  const photoResolved = resolve(photoBirds);
  const toSpecies = (resolved: { scientificName: string | null }[]) =>
    new Set(
      resolved.map((r) => r.scientificName).filter((s): s is string => Boolean(s))
    );

  return {
    goldenBirds,
    photoBirds,
    goldenResolved,
    photoResolved,
    goldenSpecies: toSpecies(goldenResolved),
    photoSpecies: toSpecies(photoResolved),
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
      // Default to maxBirdsPerPeriod if eliminationThreshold not explicitly set
      eliminationThreshold: custom?.eliminationThreshold ?? custom?.maxBirdsPerPeriod ?? globalThreshold,
      isCustom: !!custom,
    });
  }

  return months;
}
