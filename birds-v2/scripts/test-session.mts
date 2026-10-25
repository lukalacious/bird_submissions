// Throwaway test player for local render checks against v2-staging.
//   npx tsx scripts/test-session.mts create <email> [https]   → prints a session cookie value
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
  await db.user.deleteMany({ where: { email } });
} else {
  const u = await db.user.create({ data: { email, emailNormalized: email, name: "Render Test", identityCheckedAt: new Date() } });
  process.stdout.write(
    await encode({
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
      token: { sub: u.id, id: u.id, name: u.name, email: u.email, role: "USER", username: null, refreshedAt: Date.now() },
    })
  );
}
await db.$disconnect();
