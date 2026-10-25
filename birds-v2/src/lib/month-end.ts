import "server-only";
import { db } from "@/lib/db";
import { isMonthOpen, openMonths, previousMonth, type ChallengeMonth } from "@/lib/challenge-time";
import { planElimination } from "@/lib/rules/elimination";
import { getMonthRules, getSettings } from "@/lib/settings";

export const MONTH_END = "month-end";

export interface MonthEndSummary {
  month: ChallengeMonth;
  safe: number;
  covered: { userId: string; jokers: number }[];
  eliminated: { userId: string; reason: string }[];
  newPlayers: number;
}

/**
 * Which month is ready to close: last month, once its grace window is over.
 * The cron runs daily and calls this, so a changed grace setting just works.
 */
export async function monthDueForClose(now = new Date()): Promise<ChallengeMonth | null> {
  const settings = await getSettings();
  const [current] = openMonths({ now, graceHours: settings.graceHours, timeZone: settings.timezone });
  const last = previousMonth(current);
  if (isMonthOpen(last, { now, graceHours: settings.graceHours, timeZone: settings.timezone })) return null;
  const done = await db.cronRun.findUnique({ where: { type_year_month: { type: MONTH_END, ...last } } });
  return done ? null : last;
}

/** Close one month for every active player. Idempotent via the CronRun lock. */
export async function closeMonth(month: ChallengeMonth): Promise<MonthEndSummary | null> {
  const settings = await getSettings();
  const { eliminationThreshold: threshold } = await getMonthRules(month);

  return db.$transaction(
    async (tx) => {
      // Claim the month first: a second concurrent run fails on the unique key
      const claimed = await tx.cronRun.createMany({ data: [{ type: MONTH_END, ...month }], skipDuplicates: true });
      if (claimed.count === 0) return null;

      const [users, statuses, monthCounts, jokers] = await Promise.all([
        tx.user.findMany({ select: { id: true } }),
        tx.userChallengeStatus.findMany({ where: { year: month.year } }),
        tx.submission.groupBy({
          by: ["userId", "month"],
          where: { year: month.year, month: { lte: month.month } },
          _count: { _all: true },
        }),
        tx.userJoker.findMany({ where: { year: month.year, month: { lt: month.month } } }),
      ]);

      const statusBy = new Map(statuses.map((s) => [s.userId, s]));
      const counts = new Map(monthCounts.map((c) => [`${c.userId}:${c.month}`, c._count._all]));
      const summary: MonthEndSummary = { month, safe: 0, covered: [], eliminated: [], newPlayers: 0 };

      for (const { id: userId } of users) {
        const status = statusBy.get(userId);
        if (status?.isEliminated) continue;
        if (!status) {
          // First month on record: they joined mid-month, so it doesn't count (v1 rule)
          await tx.userChallengeStatus.create({ data: { userId, year: month.year, joinedMonth: month.month } });
          summary.newPlayers++;
          continue;
        }
        if (status.joinedMonth >= month.month) continue;

        let emptyStreak = 0;
        for (let m = month.month; m >= status.joinedMonth && (counts.get(`${userId}:${m}`) ?? 0) === 0; m--) emptyStreak++;

        const plan = planElimination({
          birdCount: counts.get(`${userId}:${month.month}`) ?? 0,
          threshold,
          jokerMonths: jokers
            .filter((j) => j.userId === userId)
            .map((j) => ({ year: j.year, month: j.month, available: j.totalJokers - j.usedJokers })),
          emptyStreak,
          maxEmptyMonths: settings.maxEmptyMonths,
          poolFractions: settings.poolFractionalJokers,
        });

        if (plan.outcome === "safe") {
          summary.safe++;
        } else if (plan.outcome === "covered") {
          for (const d of plan.draws) {
            await tx.jokerSpend.create({
              data: { userId, coversYear: month.year, coversMonth: month.month, fromYear: d.fromYear, fromMonth: d.fromMonth, amount: d.amount, reason: "AUTO_ELIMINATION" },
            });
            await tx.userJoker.update({
              where: { userId_year_month: { userId, year: d.fromYear, month: d.fromMonth } },
              data: { usedJokers: { increment: d.amount } },
            });
          }
          summary.covered.push({ userId, jokers: plan.shortfall });
        } else {
          await tx.userChallengeStatus.update({
            where: { id: status.id },
            data: { isEliminated: true, eliminatedAt: new Date(), eliminationMonth: month.month },
          });
          summary.eliminated.push({ userId, reason: plan.reason });
        }
      }

      await tx.cronRun.update({
        where: { type_year_month: { type: MONTH_END, ...month } },
        data: { result: JSON.parse(JSON.stringify(summary)) },
      });
      return summary;
    },
    { timeout: 60_000 }
  );
}
