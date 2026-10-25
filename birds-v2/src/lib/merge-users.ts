import "server-only";
import { db } from "@/lib/db";
import { recalculateGroupJokers } from "@/lib/jokers-db";
import { planMerge, type MergeSubmission } from "@/lib/merge-plan";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function loadSide(tx: Tx | typeof db, userId: string) {
  const [user, submissions, checkIns] = await Promise.all([
    tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, username: true },
    }),
    tx.submission.findMany({
      where: { userId },
      select: {
        id: true, speciesId: true, customName: true, year: true, month: true,
        bird: { select: { displayName: true } },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }, { createdAt: "asc" }],
    }),
    tx.monthlyCheckIn.findMany({ where: { userId }, select: { year: true, month: true } }),
  ]);
  const subs: MergeSubmission[] = submissions.map((s) => ({
    id: s.id, speciesId: s.speciesId, customName: s.customName, year: s.year, month: s.month,
    label: s.bird?.displayName ?? s.customName ?? "Unknown bird",
  }));
  return { user, submissions: subs, checkIns };
}

/** Dry run for the admin preview. Nothing is written. */
export async function previewMerge(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new Error("Choose two different players");
  const [source, target] = await Promise.all([loadSide(db, sourceId), loadSide(db, targetId)]);
  return { source: source.user, target: target.user, plan: planMerge({ source, target }) };
}

/**
 * Merge `sourceId` into `targetId` in one transaction, then delete the source.
 * The source's Google accounts move too, so signing in with either lands on
 * the target player.
 */
export async function executeMerge(sourceId: string, targetId: string, adminId: string) {
  if (sourceId === targetId) throw new Error("Choose two different players");

  return db.$transaction(
    async (tx) => {
      const [source, target] = await Promise.all([loadSide(tx, sourceId), loadSide(tx, targetId)]);
      const plan = planMerge({ source, target });
      const months = new Map(plan.affectedMonths.map((m) => [`${m.year}-${m.month}`, m]));

      // Birds
      await tx.submission.deleteMany({ where: { id: { in: plan.dropSubmissions.map((s) => s.id) } } });
      await tx.submission.updateMany({ where: { id: { in: plan.moveSubmissionIds } }, data: { userId: targetId } });
      await tx.photo.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });

      // Check-ins: the target's answer wins where both filed
      for (const m of plan.dropCheckInMonths) {
        await tx.monthlyCheckIn.delete({ where: { userId_year_month: { userId: sourceId, ...m } } });
      }
      await tx.monthlyCheckIn.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });

      // Jokers: same month on both → keep the larger form bonus, add up jokers spent
      const sourceJokers = await tx.userJoker.findMany({ where: { userId: sourceId } });
      for (const sj of sourceJokers) {
        const key = { userId_year_month: { userId: targetId, year: sj.year, month: sj.month } };
        const tj = await tx.userJoker.findUnique({ where: key });
        if (tj) {
          await tx.userJoker.update({
            where: key,
            data: {
              bonusJokers: Math.max(tj.bonusJokers, sj.bonusJokers),
              bonusBreakdown: (tj.bonusJokers >= sj.bonusJokers ? tj.bonusBreakdown : sj.bonusBreakdown) ?? undefined,
              usedJokers: tj.usedJokers + sj.usedJokers,
            },
          });
          await tx.userJoker.delete({ where: { id: sj.id } });
        } else {
          await tx.userJoker.update({ where: { id: sj.id }, data: { userId: targetId } });
        }
        months.set(`${sj.year}-${sj.month}`, { year: sj.year, month: sj.month });
      }
      await tx.jokerSpend.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });

      // Season status: earliest join month, target's elimination state
      for (const ss of await tx.userChallengeStatus.findMany({ where: { userId: sourceId } })) {
        const ts = await tx.userChallengeStatus.findUnique({ where: { userId_year: { userId: targetId, year: ss.year } } });
        if (ts) {
          await tx.userChallengeStatus.update({ where: { id: ts.id }, data: { joinedMonth: Math.min(ts.joinedMonth, ss.joinedMonth) } });
          await tx.userChallengeStatus.delete({ where: { id: ss.id } });
        } else {
          await tx.userChallengeStatus.update({ where: { id: ss.id }, data: { userId: targetId } });
        }
      }

      // Logins and the rest follow the player
      await tx.account.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });
      await tx.pushSubscription.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });
      await tx.changeRequest.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });
      await tx.linkRequest.updateMany({
        where: { requesterId: sourceId, targetId, status: "PENDING" },
        data: { status: "APPROVED", resolvedById: adminId, resolvedAt: new Date() },
      });

      const movedRows = {
        submissions: plan.moveSubmissionIds.length,
        droppedSubmissions: plan.dropSubmissions.map((s) => `${s.year}-${s.month} ${s.label}`),
        checkIns: plan.moveCheckInMonths.length,
        jokerMonths: sourceJokers.length,
      };
      await tx.mergeEvent.create({
        data: { fromUserId: sourceId, fromEmail: source.user.email, toUserId: targetId, movedRows, adminId },
      });
      // Link requests reference the source with cascade — the audit lives in MergeEvent
      await tx.user.delete({ where: { id: sourceId } });

      for (const m of months.values()) await recalculateGroupJokers(tx, targetId, m);
      return movedRows;
    },
    { timeout: 30_000 }
  );
}
