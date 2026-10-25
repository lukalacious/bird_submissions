import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Data Access Layer: the one place that reads the session. Every Server
 * Component, Server Action and Route Handler authorises through here —
 * never via client-supplied IDs, and never via the proxy alone.
 *
 * Reads cookies, so callers must render inside a <Suspense> boundary
 * (Cache Components).
 */
export const getCurrentUser = cache(async () => {
  // auth() may re-issue the session cookie (random IV), so it must never run
  // while prerendering — this marks every session read as request-time
  await connection();
  const session = await auth();
  return session?.user?.id ? session.user : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/**
 * A signed-in user who has cleared the duplicate-account check. Every game
 * screen uses this, so a possible duplicate can't start a second player's
 * history before "Are you already playing as X?" is answered.
 */
export const requirePlayer = cache(async () => {
  const user = await requireUser();
  const row = await db.user.findUnique({ where: { id: user.id }, select: { identityCheckedAt: true } });
  if (!row) redirect("/signin");
  if (!row.identityCheckedAt) redirect("/welcome");
  return user;
});

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
