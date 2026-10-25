import type { PrismaClient } from "@/generated/prisma/client";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { computeGroupJokers } from "@/lib/rules/jokers";

type Db = Pick<PrismaClient, "submission" | "userJoker">;

/**
 * Rewrite the group-joker part of one user-month from their submissions.
 * Groups come from Species.groupId (one canonical group across regions).
 * bonusJokers and usedJokers are never touched; totalJokers is rebuilt.
 * Takes the client so it runs inside transactions and scripts alike.
 */
export async function recalculateGroupJokers(db: Db, userId: string, { year, month }: ChallengeMonth) {
  const subs = await db.submission.findMany({
    where: { userId, year, month },
    select: { bird: { select: { species: { select: { group: { select: { name: true } } } } } } },
  });
  const { total } = computeGroupJokers(subs.map((s) => s.bird?.species.group?.name ?? null));

  const existing = await db.userJoker.findUnique({ where: { userId_year_month: { userId, year, month } } });
  if (!existing && total === 0) return 0;

  await db.userJoker.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, jokers: total, totalJokers: total },
    update: { jokers: total, totalJokers: total + (existing?.bonusJokers ?? 0) },
  });
  return total;
}
