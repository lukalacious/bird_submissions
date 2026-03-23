/**
 * Pre-push check script for database migrations
 *
 * Verifies that schema.prisma changes in commits about to be pushed
 * are accompanied by migration files. This is the last safe moment
 * before Vercel auto-deploys from main.
 *
 * Run manually with: npx tsx scripts/check-migration.ts
 * Wired into .githooks/pre-push automatically.
 */

import { execSync } from "child_process";

function checkMigrations(): void {
  try {
    // Compare all commits on this branch vs origin/main
    const changedFiles = execSync("git diff origin/main...HEAD --name-only", {
      encoding: "utf-8",
    });

    const schemaChanged = changedFiles.includes("prisma/schema.prisma");
    const migrationsChanged = changedFiles.includes("prisma/migrations/");

    if (schemaChanged && !migrationsChanged) {
      console.error("\n❌ PUSH BLOCKED: schema.prisma was changed but no migration files found!\n");
      console.error("   You must create a migration before pushing schema changes:");
      console.error("   npm run db:migrate\n");
      console.error("   Then commit the migration files:");
      console.error("   git add prisma/schema.prisma prisma/migrations/");
      console.error("   git commit -m 'Add migration for schema change'\n");
      process.exit(1);
    }

    if (schemaChanged && migrationsChanged) {
      console.log("✅ Schema change detected with migration files - good to push!");
    } else if (!schemaChanged) {
      console.log("✅ No schema changes detected - good to push!");
    }

    process.exit(0);
  } catch (error) {
    // If origin/main doesn't exist (e.g., fresh clone), don't block
    console.warn("⚠️  Could not check migration status:", error);
    process.exit(0);
  }
}

checkMigrations();
