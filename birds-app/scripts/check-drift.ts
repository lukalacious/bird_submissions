/**
 * Schema drift check: compares local schema.prisma against production database.
 *
 * Uses `prisma migrate diff` to detect differences between the local Prisma
 * schema and the production Neon branch. Useful before deploying to ensure
 * migrations are in sync.
 *
 * Exit codes:
 *   0 = no drift (schemas match)
 *   1 = drift detected (prints SQL diff)
 *   2 = configuration error (missing env var)
 *
 * Usage: npm run db:check-drift
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

// Load .env manually (tsx doesn't auto-load like Prisma CLI does)
const envPath = path.resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found — rely on environment variables
}

function checkDrift(): void {
  const prodUrl = process.env.DATABASE_URL_PRODUCTION;

  if (!prodUrl) {
    console.error("❌ Missing DATABASE_URL_PRODUCTION environment variable.");
    console.error("   Add it to .env with the production Neon connection string.");
    process.exit(2);
  }

  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

  try {
    const diff = execSync(
      `npx prisma migrate diff --from-url "${prodUrl}" --to-schema-datamodel "${schemaPath}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    const trimmed = diff.trim();

    if (trimmed === "" || trimmed === "-- This is an empty migration." || trimmed === "No difference detected.") {
      console.log("✅ No schema drift — local schema matches production.");
      process.exit(0);
    }

    console.error("⚠️  Schema drift detected!\n");
    console.error("SQL needed to bring production in sync with local schema:\n");
    console.error(trimmed);
    console.error("\nRun `npm run db:migrate:deploy` on production to apply pending migrations.");
    process.exit(1);
  } catch (error) {
    // prisma migrate diff exits non-zero when it encounters errors
    if (error instanceof Error && "stderr" in error) {
      console.error("❌ prisma migrate diff failed:\n", (error as { stderr: string }).stderr);
    } else {
      console.error("❌ Unexpected error:", error);
    }
    process.exit(2);
  }
}

checkDrift();
