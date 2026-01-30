/**
 * Pre-commit check script for database migrations
 *
 * This script verifies that schema.prisma changes are accompanied by migration files.
 * Run manually with: npx tsx scripts/check-migration.ts
 * Or add to pre-commit hooks.
 */

import { execSync } from "child_process";

function checkMigrations(): void {
  try {
    // Get staged files
    const stagedFiles = execSync("git diff --cached --name-only", {
      encoding: "utf-8",
    });

    const schemaStaged = stagedFiles.includes("prisma/schema.prisma");
    const migrationsStaged = stagedFiles.includes("prisma/migrations/");

    if (schemaStaged && !migrationsStaged) {
      console.error("\n❌ ERROR: schema.prisma is staged but no migration files found!\n");
      console.error("   You must create a migration before committing schema changes:");
      console.error("   npm run db:migrate\n");
      console.error("   Then stage the migration files:");
      console.error("   git add prisma/migrations/\n");
      process.exit(1);
    }

    if (schemaStaged && migrationsStaged) {
      console.log("✅ Schema change detected with migration files - good to go!");
    } else if (!schemaStaged) {
      console.log("✅ No schema changes detected");
    }

    process.exit(0);
  } catch (error) {
    // Not in a git repository or git not available
    console.warn("⚠️  Could not check git status:", error);
    process.exit(0); // Don't block commit if we can't check
  }
}

checkMigrations();
