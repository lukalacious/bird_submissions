"use server";

import prisma from "@/lib/prisma";
import { syncToGoogleSheets } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { recalculateJokers, getUserJokerInfo } from "./joker-actions";
import { getMonthlySettings } from "@/lib/settings-utils";

interface SubmitBirdsInput {
  userId: string;
  regionId: string;
  birdNames: string[];
  year: number;
  month: number;
  customBirds?: string[]; // Birds not in the predefined list
}

interface SubmitBirdsResult {
  success: boolean;
  count?: number;
  jokersEarned?: number;
  error?: string;
}

export async function submitBirds(input: SubmitBirdsInput): Promise<SubmitBirdsResult> {
  const { userId, regionId, birdNames, year, month, customBirds = [] } = input;

  try {
    // Combine regular and custom birds
    const allBirdNames = [...birdNames, ...customBirds];

    // Validate input
    if (allBirdNames.length === 0) {
      return { success: false, error: "No birds selected" };
    }

    // OPTIMIZATION: Run all validation queries in parallel
    const [monthlySettings, currentCount, existingSubmissions, region, user, jokersBefore] = await Promise.all([
      // Get monthly settings to check max birds per period
      getMonthlySettings(year, month),
      // Cap: count existing submissions for (userId, year, month) ACROSS ALL REGIONS
      // — the monthly cap is shared, mixing regions in a month is allowed
      prisma.submission.count({
        where: { userId, year, month },
      }),
      // Duplicates: check for already submitted birds
      prisma.submission.findMany({
        where: {
          userId,
          regionId,
          year,
          month,
          birdName: { in: allBirdNames },
        },
        select: { birdName: true },
      }),
      // Verify regular birds exist in the region
      prisma.region.findUnique({
        where: { id: regionId },
        include: {
          birds: {
            where: { fullName: { in: birdNames } },
            select: { fullName: true },
          },
        },
      }),
      // Get user info for Google Sheets sync (fetch early)
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      }),
      // Get joker count BEFORE submission
      getUserJokerInfo(userId, year, month),
    ]);

    const maxBirdsPerPeriod = monthlySettings.maxBirdsPerPeriod;

    // Validate: check submission cap
    if (currentCount + allBirdNames.length > maxBirdsPerPeriod) {
      const remaining = Math.max(0, maxBirdsPerPeriod - currentCount);
      return {
        success: false,
        error: `You can twitch at most ${remaining} more birds this month`,
      };
    }

    // Validate: check for duplicates
    if (existingSubmissions.length > 0) {
      const alreadyTwitched = existingSubmissions.map((s) => s.birdName);
      return {
        success: false,
        error: `Already twitched: ${alreadyTwitched.join(", ")}`,
      };
    }

    // Validate: region exists
    if (!region) {
      return { success: false, error: "Invalid region" };
    }

    // Validate: birds exist in region
    const validBirdNames = region.birds.map((b) => b.fullName);
    const invalidBirds = birdNames.filter((name) => !validBirdNames.includes(name));

    if (invalidBirds.length > 0) {
      return {
        success: false,
        error: `Invalid birds for region: ${invalidBirds.join(", ")}`,
      };
    }

    // Validate: same SPECIES not already twitched in another region.
    // The same species can exist in multiple regions, sometimes under different
    // common names (e.g. Southern Fiscal / Common Fiscal), so match on
    // scientificName across all of the user's submissions in the reset window.
    if (birdNames.length > 0) {
      const settings = await prisma.settings.findUnique({ where: { id: "default" } });
      const resetPeriod = settings?.resetPeriod ?? "YEARLY";
      const windowFilter =
        resetPeriod === "MONTHLY" ? { year, month } : resetPeriod === "YEARLY" ? { year } : {};

      const existingElsewhere = await prisma.submission.findMany({
        where: {
          userId,
          regionId: { not: regionId },
          isCustomBird: false,
          ...windowFilter,
        },
        select: { birdName: true, regionId: true },
      });

      if (existingElsewhere.length > 0) {
        const [incomingBirds, existingBirds] = await Promise.all([
          prisma.bird.findMany({
            where: { regionId, fullName: { in: birdNames } },
            select: { fullName: true, scientificName: true },
          }),
          prisma.bird.findMany({
            where: {
              OR: existingElsewhere.map((s) => ({
                regionId: s.regionId,
                fullName: s.birdName,
              })),
            },
            select: { scientificName: true },
          }),
        ]);

        const alreadyTwitchedSci = new Set(existingBirds.map((b) => b.scientificName));
        const speciesConflicts = incomingBirds
          .filter((b) => alreadyTwitchedSci.has(b.scientificName))
          .map((b) => b.fullName);

        if (speciesConflicts.length > 0) {
          return {
            success: false,
            error: `Already twitched in another region (same species): ${speciesConflicts.join(", ")}`,
          };
        }
      }
    }

    // Create submissions in database (regular birds + custom birds)
    const regularSubmissions = birdNames.map((birdName) => ({
      userId,
      regionId,
      birdName,
      year,
      month,
      isCustomBird: false,
    }));

    const customSubmissions = customBirds.map((birdName) => ({
      userId,
      regionId,
      birdName: birdName.trim(),
      year,
      month,
      isCustomBird: true,
    }));

    const jokerCountBefore = jokersBefore?.totalJokers || 0;

    const submissions = await prisma.submission.createMany({
      data: [...regularSubmissions, ...customSubmissions],
    });

    // OPTIMIZATION: Fire-and-forget Google Sheets sync (truly non-blocking)
    syncToGoogleSheets({
      userId,
      email: user?.email || "",
      userName: user?.name || "",
      regionName: region.name,
      birdNames: allBirdNames,
      timestamp: new Date().toISOString(),
    }).catch((sheetError) => {
      console.error("Failed to sync to Google Sheets:", sheetError);
    });

    // Recalculate jokers based on group submissions and get the new count
    let jokersEarned = 0;
    try {
      await recalculateJokers(userId, year, month);

      // Get joker count AFTER submission
      const jokersAfter = await getUserJokerInfo(userId, year, month);
      const jokerCountAfter = jokersAfter?.totalJokers || 0;

      // Calculate jokers earned from THIS submission only
      jokersEarned = jokerCountAfter - jokerCountBefore;
    } catch (jokerError) {
      console.error("Failed to recalculate jokers:", jokerError);
      // Don't fail the submission if joker calc fails
    }

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/twitch");
    revalidatePath("/submissions");

    return { success: true, count: submissions.count, jokersEarned };
  } catch (error) {
    console.error("Failed to twitch birds:", error);
    return { success: false, error: "Failed to twitch birds. Please try again." };
  }
}

// Delete a single submission
export async function deleteSubmission(input: {
  userId: string;
  birdName: string;
  year: number;
  month: number;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, birdName, year, month } = input;

  try {
    // Find and delete the submission
    const deleted = await prisma.submission.deleteMany({
      where: {
        userId,
        birdName,
        year,
        month,
      },
    });

    if (deleted.count === 0) {
      return { success: false, error: "Submission not found" };
    }

    // Recalculate jokers after deletion
    try {
      await recalculateJokers(userId, year, month);
    } catch (jokerError) {
      console.error("Failed to recalculate jokers:", jokerError);
    }

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/twitch");
    revalidatePath("/submissions");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return { success: false, error: "Failed to delete submission" };
  }
}
