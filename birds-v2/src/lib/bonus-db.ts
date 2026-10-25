import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { calculateMonthBonus } from "@/lib/rules/check-in-bonus";

type Db = Pick<PrismaClient, "monthlyCheckIn" | "photo" | "specialBird" | "userJoker">;

/**
 * The ONLY writer of bonusJokers for one user-month: check-in answers plus
 * golden birds proven by a photo (pending or approved; an admin reject
 * removes it). v1 had two writers that disagreed. Group jokers (jokers) and
 * usedJokers are left alone; totalJokers is rebuilt.
 */
export async function recalculateBonusJokers(db: Db, userId: string, { year, month }: ChallengeMonth) {
  const [checkIn, golden, photos] = await Promise.all([
    db.monthlyCheckIn.findUnique({ where: { userId_year_month: { userId, year, month } } }),
    db.specialBird.findMany({ where: { year, month, kind: "GOLDEN" }, select: { speciesId: true } }),
    db.photo.findMany({
      where: { userId, year, month, status: { not: "REJECTED" } },
      select: { submission: { select: { speciesId: true } } },
    }),
  ]);
  const goldenSpecies = new Set(golden.map((g) => g.speciesId));
  const proven = new Set(
    photos.map((p) => p.submission.speciesId).filter((s): s is string => !!s && goldenSpecies.has(s))
  );

  const { total, breakdown } = calculateMonthBonus({ year, checkIn, goldenWithPhoto: proven.size });
  const bonusBreakdown = breakdown as unknown as Prisma.InputJsonValue;

  const existing = await db.userJoker.findUnique({ where: { userId_year_month: { userId, year, month } } });
  if (!existing && total === 0) return 0;
  await db.userJoker.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, bonusJokers: total, bonusBreakdown, totalJokers: total },
    update: { bonusJokers: total, bonusBreakdown, totalJokers: (existing?.jokers ?? 0) + total },
  });
  return total;
}
