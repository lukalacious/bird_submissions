import "server-only";
import { db } from "@/lib/db";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { recalculateBonusJokers } from "@/lib/bonus-db";

/**
 * Hand-edits an admin can make to a player. Each returns an error message,
 * or null when it worked. The server actions add auth, logging and cache tags.
 */

export async function addJokerAdjustment(input: { userId: string; month: ChallengeMonth; amount: number; reason: string; adminId: string }) {
  const { userId, month, amount, reason, adminId } = input;
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 20 || (amount * 2) % 1 !== 0) {
    return "Enter a whole or half number of jokers between −20 and 20, not zero.";
  }
  if (reason.trim().length < 3) return "Say why, in a few words. The player sees it on their joker list.";
  await db.$transaction(async (tx) => {
    await tx.jokerAdjustment.create({ data: { userId, ...month, amount, reason: reason.trim(), adminId } });
    await recalculateBonusJokers(tx, userId, month);
  });
  return null;
}

export async function removeJokerAdjustment(id: string) {
  const adj = await db.jokerAdjustment.findUnique({ where: { id } });
  if (!adj) return { error: "That adjustment was already removed.", adjustment: null };
  await db.$transaction(async (tx) => {
    await tx.jokerAdjustment.delete({ where: { id } });
    await recalculateBonusJokers(tx, adj.userId, { year: adj.year, month: adj.month });
  });
  return { error: null, adjustment: adj };
}

/** Put a player out of the season by hand (the month-end job does this automatically). */
export async function eliminatePlayer(userId: string, month: ChallengeMonth) {
  await db.userChallengeStatus.upsert({
    where: { userId_year: { userId, year: month.year } },
    // no record yet means this is their first month, as month-end would record it
    create: { userId, year: month.year, joinedMonth: month.month, isEliminated: true, eliminatedAt: new Date(), eliminationMonth: month.month },
    update: { isEliminated: true, eliminatedAt: new Date(), eliminationMonth: month.month },
  });
}

/** Back in. Month-end judges them again from the next close, like anyone else. */
export async function reinstatePlayer(userId: string, year: number) {
  const status = await db.userChallengeStatus.findUnique({ where: { userId_year: { userId, year } } });
  if (!status?.isEliminated) return "That player isn't out.";
  await db.userChallengeStatus.update({ where: { id: status.id }, data: { isEliminated: false, eliminatedAt: null, eliminationMonth: null } });
  return null;
}

export async function setRole(userId: string, role: "USER" | "ADMIN", adminId: string) {
  if (userId === adminId) return "You can't change your own role. Ask another admin.";
  await db.user.update({ where: { id: userId }, data: { role } });
  return null;
}

/** Deletes the player and everything they logged. The typed email is the confirmation. */
export async function removePlayer(userId: string, typedEmail: string, adminId: string) {
  if (userId === adminId) return "You can't remove yourself.";
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return "That player no longer exists.";
  if (typedEmail.trim().toLowerCase() !== user.email.toLowerCase()) return "The email you typed doesn't match this player. Nothing was removed.";
  await db.user.delete({ where: { id: userId } });
  return null;
}
