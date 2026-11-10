// Throwaway test player for local render checks against v2-staging.
//   npx tsx scripts/test-session.mts create <email> [https]   → prints a session cookie value
//   npx tsx scripts/test-session.mts create-admin <email> [https] → the same, as an admin
//   npx tsx scripts/test-session.mts token <email> [https]    → session for an existing test player
//   npx tsx scripts/test-session.mts delete <email>
// Dev/E2E only: works against whatever DATABASE_URL .env points at (v2-staging).
import "dotenv/config";
import { encode } from "@auth/core/jwt";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const [cmd, email, mode] = process.argv.slice(2);
// Auth.js uses the cookie name as the JWE salt; on https it's the __Secure- name
const cookieName = mode === "https" ? "__Secure-authjs.session-token" : "authjs.session-token";
if (!email?.endsWith("@example.test")) throw new Error("test emails only (@example.test)");
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }, { schema: "v2" }) });

if (cmd === "delete") {
  // the admin log keeps plain ids on purpose, so clear a test admin's rows by hand
  const gone = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (gone) await db.adminLog.deleteMany({ where: { OR: [{ adminId: gone.id }, { playerId: gone.id }] } });
  await db.user.deleteMany({ where: { email } });
} else {
  // "create" makes a fresh player; "token" signs in as an existing test player (keeps its role)
  const u =
    cmd === "token"
      ? await db.user.findUniqueOrThrow({ where: { email } })
      : await db.user.create({
          data: { email, emailNormalized: email, name: cmd === "create-admin" ? "Render Admin" : "Render Test", role: cmd === "create-admin" ? "ADMIN" : "USER", identityCheckedAt: new Date() },
        });
  process.stdout.write(
    await encode({
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
      token: { sub: u.id, id: u.id, name: u.name, email: u.email, role: u.role, username: u.username, refreshedAt: Date.now() },
    })
  );
}
await db.$disconnect();
