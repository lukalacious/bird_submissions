import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { calculateCheckInBonus } from "@/lib/rules/check-in-bonus";

type Db = Pick<PrismaClient, "monthlyCheckIn" | "photo" | "userJoker">;

/**
 * The ONLY writer of bonusJokers: check-in answers + admin photo awards for
 * one user-month. v1 had two writers that disagreed and wiped photo awards.
 * Group jokers (jokers) and usedJokers are left alone; totalJokers is rebuilt.
 */
export async function recalculateBonusJokers(db: Db, userId: string, { year, month }: ChallengeMonth) {
  const [checkIn, photos] = await Promise.all([
    db.monthlyCheckIn.findUnique({ where: { userId_year_month: { userId, year, month } } }),
    db.photo.findMany({
      where: { userId, year, month, jokerAward: { gt: 0 } },
      select: { jokerAward: true, submission: { select: { bird: { select: { displayName: true } }, customName: true } } },
    }),
  ]);

  const form = checkIn ? calculateCheckInBonus(checkIn) : { total: 0, breakdown: [] };
  const awards = photos.map((p) => ({
    rule: `Photo award: ${p.submission.bird?.displayName ?? p.submission.customName ?? "bird"}`,
    value: p.jokerAward,
  }));
  const bonus = form.total + awards.reduce((sum, a) => sum + a.value, 0);
  const breakdown = [...form.breakdown, ...awards] as unknown as Prisma.InputJsonValue;

  const existing = await db.userJoker.findUnique({ where: { userId_year_month: { userId, year, month } } });
  await db.userJoker.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, bonusJokers: bonus, bonusBreakdown: breakdown, totalJokers: bonus },
    update: { bonusJokers: bonus, bonusBreakdown: breakdown, totalJokers: (existing?.jokers ?? 0) + bonus },
  });
  return bonus;
}
