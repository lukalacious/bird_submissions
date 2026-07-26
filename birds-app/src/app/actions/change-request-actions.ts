"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, requireAdmin } from "@/lib/auth-helpers";
import { getCurrentChallengeMonth } from "@/lib/settings-utils";
import { deleteSubmissionForUser, swapSubmission } from "@/lib/admin-mutations";
import type { ChangeRequestType } from "@prisma/client";

// --- User side ---

export async function createChangeRequest(input: {
  type: ChangeRequestType;
  year: number;
  month: number;
  birdName?: string;
  replacementBird?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireSession();
    const userId = user.id!;

    // Only PAST months go through requests — current month is self-service
    const current = getCurrentChallengeMonth();
    if (input.year > current.year || (input.year === current.year && input.month >= current.month)) {
      return {
        success: false,
        error: "Current-month birds can be edited directly on your submissions page",
      };
    }

    // For swap/delete the target must be the user's own submission
    if (input.type !== "OTHER") {
      if (!input.birdName) {
        return { success: false, error: "Select the bird to change" };
      }
      const target = await prisma.submission.findFirst({
        where: {
          userId,
          birdName: input.birdName,
          year: input.year,
          month: input.month,
        },
      });
      if (!target) {
        return { success: false, error: "That bird isn't in your submissions for that month" };
      }
    }

    if (input.type === "SWAP" && !input.replacementBird?.trim()) {
      return { success: false, error: "Enter the replacement bird" };
    }

    // One pending request per target to avoid duplicates
    const existing = await prisma.changeRequest.findFirst({
      where: {
        userId,
        status: "PENDING",
        year: input.year,
        month: input.month,
        birdName: input.birdName ?? null,
      },
    });
    if (existing) {
      return { success: false, error: "You already have a pending request for this" };
    }

    await prisma.changeRequest.create({
      data: {
        userId,
        type: input.type,
        year: input.year,
        month: input.month,
        birdName: input.birdName?.trim() || null,
        replacementBird: input.replacementBird?.trim() || null,
        note: input.note?.trim() || null,
      },
    });

    revalidatePath("/submissions");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Please sign in again" };
    }
    console.error("Failed to create change request:", error);
    return { success: false, error: "Failed to submit request" };
  }
}

export async function getMyChangeRequests() {
  const user = await requireSession();
  return prisma.changeRequest.findMany({
    where: { userId: user.id! },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// --- Admin side ---

export async function getPendingChangeRequests() {
  await requireAdmin();
  return prisma.changeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, username: true, email: true } } },
  });
}

export async function getResolvedChangeRequests(limit = 30) {
  await requireAdmin();
  return prisma.changeRequest.findMany({
    where: { status: { not: "PENDING" } },
    orderBy: { resolvedAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, username: true, email: true } } },
  });
}

export async function approveChangeRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "PENDING") {
      return { success: false, error: "Request already resolved" };
    }

    // Apply the change (SWAP/DELETE auto-apply; OTHER is manual — approving
    // it just records that the admin handled it)
    if (request.type === "DELETE") {
      const result = await deleteSubmissionForUser(
        prisma,
        request.userId,
        request.birdName!,
        request.year,
        request.month
      );
      if (!result.success) return result;
    } else if (request.type === "SWAP") {
      const result = await swapSubmission(
        prisma,
        request.userId,
        request.birdName!,
        request.replacementBird!,
        request.year,
        request.month
      );
      if (!result.success) return result;
    }

    await prisma.changeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        adminNote: adminNote?.trim() || null,
        resolvedById: admin.id!,
        resolvedAt: new Date(),
      },
    });

    revalidatePath("/admin/change-requests");
    revalidatePath("/dashboard");
    revalidatePath("/submissions");
    return { success: true };
  } catch (error) {
    console.error("Failed to approve change request:", error);
    return { success: false, error: "Failed to approve request" };
  }
}

export async function rejectChangeRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "PENDING") {
      return { success: false, error: "Request already resolved" };
    }

    await prisma.changeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        adminNote: adminNote?.trim() || null,
        resolvedById: admin.id!,
        resolvedAt: new Date(),
      },
    });

    revalidatePath("/admin/change-requests");
    return { success: true };
  } catch (error) {
    console.error("Failed to reject change request:", error);
    return { success: false, error: "Failed to reject request" };
  }
}
