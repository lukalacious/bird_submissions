"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { logAdmin } from "@/lib/admin-log";
import { addJokerAdjustment, eliminatePlayer, reinstatePlayer, removeJokerAdjustment, removePlayer, setRole } from "@/lib/admin-players";
import { getSettings } from "@/lib/settings";
import { feedTag, leaderboardTag } from "@/lib/tags";

const Id = z.string().min(1);
const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const monthName = (m: number) => MONTH.format(new Date(Date.UTC(2026, m - 1, 15)));

async function context(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Id.parse(formData.get("userId"));
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, email: true } });
  if (!user) redirect("/admin/players");
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  // forms on the Standing page come back to it
  const back = formData.get("back") === "standing" ? "/admin/standing" : `/admin/players/${userId}`;
  return { admin, player: { id: user.id, name: user.username ?? user.name ?? user.email }, current, back };
}

function finish(back: string, current: { year: number; month: number }, result: { error: string } | { done: string }): never {
  updateTag(feedTag);
  updateTag(leaderboardTag(current));
  revalidatePath("/admin", "layout");
  const [key, value] = "error" in result ? ["error", result.error] : ["done", result.done];
  redirect(`${back}?${key}=${encodeURIComponent(value)}`);
}

export async function adjustJokers(formData: FormData) {
  const { admin, player, current, back } = await context(formData);
  const input = z
    .object({ month: z.coerce.number().int().min(1).max(12), amount: z.coerce.number(), reason: z.string().max(120) })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) finish(back, current, { error: "Fill in the month, the number of jokers and a reason." });
  const { month, amount, reason } = input.data;
  if (month > current.month) finish(back, current, { error: "That month hasn't started yet." });

  const error = await addJokerAdjustment({ userId: player.id, month: { year: current.year, month }, amount, reason, adminId: admin.id });
  if (error) finish(back, current, { error });
  await logAdmin(admin, "Adjusted jokers", player, `${amount > 0 ? "+" : ""}${amount} in ${monthName(month)} ${current.year}: ${reason.trim()}`);
  finish(back, current, { done: `${amount > 0 ? "Added" : "Took off"} ${Math.abs(amount)} for ${monthName(month)}.` });
}

export async function undoAdjustment(formData: FormData) {
  const { admin, player, current, back } = await context(formData);
  const { error, adjustment } = await removeJokerAdjustment(Id.parse(formData.get("id")));
  if (error || !adjustment) finish(back, current, { error: error ?? "Not found." });
  await logAdmin(admin, "Removed a joker adjustment", player, `${adjustment.amount} in ${monthName(adjustment.month)} ${adjustment.year}: ${adjustment.reason}`);
  finish(back, current, { done: "Adjustment removed." });
}

export async function eliminate(formData: FormData) {
  const { admin, player, current, back } = await context(formData);
  await eliminatePlayer(player.id, current);
  await logAdmin(admin, "Eliminated by hand", player, `${monthName(current.month)} ${current.year}`);
  finish(back, current, { done: `${player.name} is out of the ${current.year} season.` });
}

export async function reinstate(formData: FormData) {
  const { admin, player, current, back } = await context(formData);
  const error = await reinstatePlayer(player.id, current.year);
  if (error) finish(back, current, { error });
  await logAdmin(admin, "Reinstated", player, `${current.year} season`);
  finish(back, current, { done: `${player.name} is back in. Month-end judges them again from the next close.` });
}

export async function changeRole(formData: FormData) {
  const { admin, player, current, back } = await context(formData);
  const role = z.enum(["USER", "ADMIN"]).parse(formData.get("role"));
  const error = await setRole(player.id, role, admin.id);
  if (error) finish(back, current, { error });
  await logAdmin(admin, role === "ADMIN" ? "Made admin" : "Removed admin rights", player);
  finish(back, current, { done: role === "ADMIN" ? `${player.name} is now an admin.` : `${player.name} is no longer an admin.` });
}

export async function remove(formData: FormData) {
  const { admin, player, current, back } = await context(formData);
  const error = await removePlayer(player.id, String(formData.get("email") ?? ""), admin.id);
  if (error) finish(back, current, { error });
  await logAdmin(admin, "Removed player", player, "All their birds, photos and jokers were deleted");
  finish("/admin/players", current, { done: `${player.name} was removed.` });
}
