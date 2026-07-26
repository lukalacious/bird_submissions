import { auth } from "@/lib/auth";

/**
 * Require a logged-in session. Throws if absent.
 * Use in every user-facing server action instead of trusting client-supplied IDs.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Non-throwing admin check for actions that return error objects.
 */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.id && session.user.role === "ADMIN");
}

/**
 * Require an ADMIN session. Throws if absent or not admin.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}
