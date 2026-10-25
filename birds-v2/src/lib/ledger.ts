import "server-only";
import { db } from "@/lib/db";

export interface LedgerMonth {
  month: number;
  groupJokers: number;
  bonusJokers: number;
  bonusLines: { rule: string; value: number }[];
  used: number;
  /** joker spends covering this month's shortfall, and where they came from */
  coveredBy: { fromMonth: number; amount: number }[];
}

/** A player's joker story for one season, in two queries. */
export async function getJokerLedger(userId: string, year: number) {
  const [rows, spends] = await Promise.all([
    db.userJoker.findMany({ where: { userId, year }, orderBy: { month: "asc" } }),
    db.jokerSpend.findMany({ where: { userId, coversYear: year }, orderBy: { createdAt: "asc" } }),
  ]);
  const months = new Map<number, LedgerMonth>();
  const get = (month: number) => {
    if (!months.has(month)) months.set(month, { month, groupJokers: 0, bonusJokers: 0, bonusLines: [], used: 0, coveredBy: [] });
    return months.get(month)!;
  };
  for (const r of rows) {
    Object.assign(get(r.month), {
      groupJokers: r.jokers,
      bonusJokers: r.bonusJokers,
      bonusLines: Array.isArray(r.bonusBreakdown) ? (r.bonusBreakdown as LedgerMonth["bonusLines"]) : [],
      used: r.usedJokers,
    });
  }
  for (const s of spends) get(s.coversMonth).coveredBy.push({ fromMonth: s.fromMonth, amount: s.amount });

  const ledger = [...months.values()].sort((a, b) => b.month - a.month);
  const earned = rows.reduce((sum, r) => sum + r.totalJokers, 0);
  const used = rows.reduce((sum, r) => sum + r.usedJokers, 0);
  return { ledger, earned, used };
}
