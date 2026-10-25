import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Data Access Layer: the one place that reads the session. Every Server
 * Component, Server Action and Route Handler authorises through here —
 * never via client-supplied IDs, and never via the proxy alone.
 *
 * Reads cookies, so callers must render inside a <Suspense> boundary
 * (Cache Components).
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user?.id ? session.user : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
