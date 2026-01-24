"use server";

import prisma from "@/lib/prisma";
import { syncToGoogleSheets } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";

interface SubmitBirdsInput {
  userId: string;
  regionId: string;
  birdNames: string[];
  year: number;
  month: number;
}

interface SubmitBirdsResult {
  success: boolean;
  count?: number;
  error?: string;
}

export async function submitBirds(input: SubmitBirdsInput): Promise<SubmitBirdsResult> {
  const { userId, regionId, birdNames, year, month } = input;

  try {
    // Validate input
    if (!birdNames || birdNames.length === 0) {
      return { success: false, error: "No birds selected" };
    }

    // Get settings to check max birds per period (month)
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const maxBirdsPerPeriod = settings?.maxBirdsPerPeriod ?? 31;

    // Cap: count existing submissions for (userId, regionId, year, month)
    const currentCount = await prisma.submission.count({
      where: { userId, regionId, year, month },
    });

    if (currentCount + birdNames.length > maxBirdsPerPeriod) {
      const remaining = Math.max(0, maxBirdsPerPeriod - currentCount);
      return {
        success: false,
        error: `You can submit at most ${remaining} more birds this month`,
      };
    }

    // Duplicates: check for already submitted birds in this (userId, regionId, year, month)
    const existingSubmissions = await prisma.submission.findMany({
      where: {
        userId,
        regionId,
        year,
        month,
        birdName: { in: birdNames },
      },
      select: { birdName: true },
    });

    if (existingSubmissions.length > 0) {
      const alreadySubmitted = existingSubmissions.map((s) => s.birdName);
      return {
        success: false,
        error: `Already submitted: ${alreadySubmitted.join(", ")}`,
      };
    }

    // Verify birds exist in the region
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      include: {
        birds: {
          where: { fullName: { in: birdNames } },
          select: { fullName: true },
        },
      },
    });

    if (!region) {
      return { success: false, error: "Invalid region" };
    }

    const validBirdNames = region.birds.map((b) => b.fullName);
    const invalidBirds = birdNames.filter((name) => !validBirdNames.includes(name));

    if (invalidBirds.length > 0) {
      return {
        success: false,
        error: `Invalid birds for region: ${invalidBirds.join(", ")}`,
      };
    }

    // Create submissions in database
    const submissions = await prisma.submission.createMany({
      data: birdNames.map((birdName) => ({
        userId,
        regionId,
        birdName,
        year,
        month,
      })),
    });

    // Get user info for Google Sheets sync
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Sync to Google Sheets (non-blocking, don't fail if it errors)
    try {
      await syncToGoogleSheets({
        userId,
        email: user?.email || "",
        userName: user?.name || "",
        regionName: region.name,
        birdNames,
        timestamp: new Date().toISOString(),
      });
    } catch (sheetError) {
      console.error("Failed to sync to Google Sheets:", sheetError);
      // Don't fail the submission if sheet sync fails
    }

    // Revalidate paths
    revalidatePath("/region");
    revalidatePath("/submit");
    revalidatePath("/submissions");

    return { success: true, count: submissions.count };
  } catch (error) {
    console.error("Failed to submit birds:", error);
    return { success: false, error: "Failed to submit birds. Please try again." };
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

    // Revalidate paths
    revalidatePath("/region");
    revalidatePath("/submit");
    revalidatePath("/submissions");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return { success: false, error: "Failed to delete submission" };
  }
}
