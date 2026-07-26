"use server";

import prisma from "@/lib/prisma";
import { syncToGoogleSheets } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { recalculateJokers, getUserJokerInfo } from "./joker-actions";
import {
  getMonthlySettings,
  getCurrentChallengeMonth,
  getSpecialBirdSpecies,
} from "@/lib/settings-utils";
import { requireSession } from "@/lib/auth-helpers";
import {
  checkCap,
  findDuplicates,
  findInvalidBirds,
  findSpeciesConflicts,
} from "@/lib/submission-validators";

interface SubmitBirdsInput {
  regionId: string;
  birdNames: string[];
  year: number;
  month: number;
  customBirds?: string[]; // Birds not in the predefined list
  /** Proof photos for photo birds: birdName -> Vercel Blob URL */
  photos?: Record<string, string>;
  /**
   * Bonus birds already twitched in a previous month, re-opened for a
   * photo-only submission. No new Submission row is created (doesn't count
   * toward the monthly cap) — the photo is attached to the existing
   * submission, tagged with this month via photoYear/photoMonth.
   */
  photoOnlyBirds?: string[];
}

// Only accept photo URLs from our own Blob store
function isOwnBlobUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Validate photo-only birds and resolve each to the user's EXISTING
 * submission of that species (any region, any month in the reset window).
 * Returns the submission updates to apply, or a user-facing error.
 */
async function resolvePhotoOnlyUpdates(params: {
  userId: string;
  regionId: string;
  year: number;
  month: number;
  photoOnlyBirds: string[];
  photos: Record<string, string>;
}): Promise<{ updates: { id: string; photoUrl: string }[]; error?: string }> {
  const { userId, regionId, year, month, photoOnlyBirds, photos } = params;

  // 1. Must be this month's announced golden/photo birds
  const special = await getSpecialBirdSpecies(year, month);
  const allowedSpecies = new Set([...special.goldenSpecies, ...special.photoSpecies]);

  const regionBirds = await prisma.bird.findMany({
    where: { regionId, fullName: { in: photoOnlyBirds } },
    select: { fullName: true, scientificName: true },
  });
  const sciByName = new Map(regionBirds.map((b) => [b.fullName, b.scientificName]));

  for (const name of photoOnlyBirds) {
    const sci = sciByName.get(name);
    if (!sci) {
      return { updates: [], error: `Unknown bird: ${name}` };
    }
    if (!allowedSpecies.has(sci)) {
      return { updates: [], error: `${name} is not a bonus bird this month` };
    }
    const url = photos[name];
    if (!url || !isOwnBlobUrl(url)) {
      return { updates: [], error: `Please attach a photo for ${name}` };
    }
  }

  // 2. Find the existing submission per species — the bird may have been
  // twitched in another region under a different common name
  const speciesBirds = await prisma.bird.findMany({
    where: { scientificName: { in: [...sciByName.values()] } },
    select: { fullName: true, regionId: true, scientificName: true },
  });

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const resetPeriod = settings?.resetPeriod ?? "YEARLY";
  const windowFilter =
    resetPeriod === "MONTHLY" ? { year, month } : resetPeriod === "YEARLY" ? { year } : {};

  const updates: { id: string; photoUrl: string }[] = [];
  for (const name of photoOnlyBirds) {
    const sci = sciByName.get(name)!;
    const namePairs = speciesBirds
      .filter((b) => b.scientificName === sci)
      .map((b) => ({ regionId: b.regionId, birdName: b.fullName }));

    const existing = await prisma.submission.findFirst({
      where: { userId, isCustomBird: false, ...windowFilter, OR: namePairs },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!existing) {
      return {
        updates: [],
        error: `You haven't twitched ${name} yet — select it from the list instead`,
      };
    }
    updates.push({ id: existing.id, photoUrl: photos[name] });
  }

  return { updates };
}

interface SubmitBirdsResult {
  success: boolean;
  count?: number;
  jokersEarned?: number;
  photosAttached?: number;
  error?: string;
}

export async function submitBirds(input: SubmitBirdsInput): Promise<SubmitBirdsResult> {
  const {
    regionId,
    birdNames,
    year,
    month,
    customBirds = [],
    photos = {},
    photoOnlyBirds = [],
  } = input;

  try {
    // SECURITY: identity comes from the session, never from the client
    const sessionUser = await requireSession();
    const userId = sessionUser.id!;

    // Combine regular and custom birds
    const allBirdNames = [...birdNames, ...customBirds];

    // Validate input (photo-only submissions may come with no new birds)
    if (allBirdNames.length === 0 && photoOnlyBirds.length === 0) {
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

    // Validate: check submission cap (pre-check for a friendly message;
    // the authoritative check happens inside the transaction below)
    const cap = checkCap(currentCount, allBirdNames.length, maxBirdsPerPeriod);
    if (!cap.ok) {
      return {
        success: false,
        error: `You can twitch at most ${cap.remaining} more birds this month`,
      };
    }

    // Validate: check for duplicates
    const alreadyTwitched = findDuplicates(
      existingSubmissions.map((s) => s.birdName),
      allBirdNames
    );
    if (alreadyTwitched.length > 0) {
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
    const invalidBirds = findInvalidBirds(
      region.birds.map((b) => b.fullName),
      birdNames
    );
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

        const speciesConflicts = findSpeciesConflicts(
          incomingBirds,
          new Set(existingBirds.map((b) => b.scientificName))
        );

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
      photoUrl:
        photos[birdName] && isOwnBlobUrl(photos[birdName]) ? photos[birdName] : null,
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

    // Photo-only bonus birds: validate + resolve to existing submissions
    // BEFORE writing anything, so a bad photo-only entry can't leave a
    // half-applied submission behind.
    let photoOnlyUpdates: { id: string; photoUrl: string }[] = [];
    if (photoOnlyBirds.length > 0) {
      const resolved = await resolvePhotoOnlyUpdates({
        userId,
        regionId,
        year,
        month,
        photoOnlyBirds,
        photos,
      });
      if (resolved.error) {
        return { success: false, error: resolved.error };
      }
      photoOnlyUpdates = resolved.updates;
    }

    // ATOMIC: re-check the cap and insert in one transaction so two
    // concurrent submits can't both pass the pre-check and exceed the cap.
    // Photo-only attachments ride along in the same transaction but are
    // UPDATEs on existing rows — they never count toward the cap.
    let createdCount: number;
    try {
      createdCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        if (allBirdNames.length > 0) {
          const countInTx = await tx.submission.count({
            where: { userId, year, month },
          });
          if (!checkCap(countInTx, allBirdNames.length, maxBirdsPerPeriod).ok) {
            throw new Error("CAP_EXCEEDED");
          }
          const created = await tx.submission.createMany({
            data: [...regularSubmissions, ...customSubmissions],
          });
          count = created.count;
        }
        for (const update of photoOnlyUpdates) {
          await tx.submission.update({
            where: { id: update.id },
            data: { photoUrl: update.photoUrl, photoYear: year, photoMonth: month },
          });
        }
        return count;
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "CAP_EXCEEDED") {
        return {
          success: false,
          error: "You've hit this month's bird limit",
        };
      }
      throw txError;
    }

    // OPTIMIZATION: Fire-and-forget Google Sheets sync (truly non-blocking)
    if (allBirdNames.length > 0) syncToGoogleSheets({
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
    // (photo-only attachments don't change group jokers)
    let jokersEarned = 0;
    if (allBirdNames.length > 0) try {
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
    if (photoOnlyUpdates.length > 0) revalidatePath("/community");

    return {
      success: true,
      count: createdCount,
      jokersEarned,
      photosAttached: photoOnlyUpdates.length,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Please sign in again" };
    }
    console.error("Failed to twitch birds:", error);
    return { success: false, error: "Failed to twitch birds. Please try again." };
  }
}

// Delete a single submission (own submissions only — identity from session)
export async function deleteSubmission(input: {
  birdName: string;
  year: number;
  month: number;
}): Promise<{ success: boolean; error?: string }> {
  const { birdName, year, month } = input;

  try {
    // SECURITY: identity comes from the session, never from the client
    const sessionUser = await requireSession();
    const userId = sessionUser.id!;

    // RULES: submissions are freely editable until the end of the month
    // (SAST). Whatever stands on the last day is final; past months are
    // locked and go through the admin change-request flow.
    const current = getCurrentChallengeMonth();
    if (year !== current.year || month !== current.month) {
      return {
        success: false,
        error: "Past months are locked — ask an admin to request a change",
      };
    }

    // Find and delete the submission (never joker submissions — those
    // represent spent jokers and deleting them wouldn't refund the joker)
    const target = await prisma.submission.findFirst({
      where: { userId, birdName, year, month, isJokerSubmission: false },
      select: { photoUrl: true },
    });

    const deleted = await prisma.submission.deleteMany({
      where: {
        userId,
        birdName,
        year,
        month,
        isJokerSubmission: false,
      },
    });

    if (deleted.count === 0) {
      return { success: false, error: "Submission not found" };
    }

    // Clean up the proof photo blob, if any (best-effort)
    if (target?.photoUrl) {
      import("@vercel/blob")
        .then(async ({ del }) => {
          const { getBlobToken } = await import("@/lib/blob-token");
          return del(target.photoUrl!, { token: getBlobToken() });
        })
        .catch((blobError) => console.error("Failed to delete photo blob:", blobError));
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Please sign in again" };
    }
    console.error("Failed to delete submission:", error);
    return { success: false, error: "Failed to delete submission" };
  }
}
