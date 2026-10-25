import "server-only";
import { db } from "@/lib/db";
import { recalculateBonusJokers } from "@/lib/bonus-db";
import { recalculateGroupJokers } from "@/lib/jokers-db";

/**
 * Apply an approved change to a closed month: remove a bird, or swap it for
 * another bird from the same region. Joker totals are rebuilt either way.
 * Returns an error string instead of applying when the swap breaks a rule.
 */
export async function applyChangeRequest(requestId: string, adminId: string): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const req = await tx.changeRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (req.status !== "PENDING") return "This request was already handled.";
    const sub = req.submissionId ? await tx.submission.findUnique({ where: { id: req.submissionId } }) : null;
    const month = { year: req.year, month: req.month };

    if (req.type === "DELETE") {
      if (!sub) return "That bird is no longer on the list.";
      await tx.submission.delete({ where: { id: sub.id } });
    } else if (req.type === "SWAP") {
      if (!sub || !req.replacementBirdId) return "The request is missing the bird or its replacement.";
      const replacement = await tx.bird.findUniqueOrThrow({ where: { id: req.replacementBirdId } });
      if (replacement.regionId !== sub.regionId) return "The replacement must be from the same region.";
      const clash = await tx.submission.findFirst({
        where: { userId: req.userId, year: req.year, speciesId: replacement.speciesId, id: { not: sub.id } },
      });
      if (clash) return "The player already has that species this season.";
      await tx.submission.update({ where: { id: sub.id }, data: { birdId: replacement.id, speciesId: replacement.speciesId, customName: null } });
    }

    await recalculateGroupJokers(tx, req.userId, month);
    await recalculateBonusJokers(tx, req.userId, month);
    await tx.changeRequest.update({
      where: { id: req.id },
      data: { status: "APPROVED", resolvedById: adminId, resolvedAt: new Date() },
    });
    return null;
  });
}
