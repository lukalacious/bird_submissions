/**
 * Apply a reviewed group-name mapping (as produced by audit-hyphen-groups.ts,
 * stored in scripts/data/) to Bird.groupName. Originally written for the
 * July 2026 EA/WA normalization (C2), whose mapping has since been applied
 * and removed.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/normalize-group-names.ts --mapping=hyphen-group-mapping.json          # dry run
 *   DATABASE_URL="..." npx tsx scripts/normalize-group-names.ts --mapping=hyphen-group-mapping.json --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

interface MappingEntry {
  region: string;
  fullName: string;
  scientificName: string;
  from: string | null;
  to: string;
  source: string;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");

  const mappingArg = process.argv.find((a) => a.startsWith("--mapping="))?.split("=")[1];
  if (!mappingArg) {
    console.error("Missing --mapping=<file in scripts/data/>, e.g. --mapping=hyphen-group-mapping.json");
    process.exit(1);
  }
  const mappingPath = path.join(__dirname, "data", mappingArg);
  console.log(`Mapping file: ${mappingPath}`);
  const mapping: Record<string, MappingEntry> = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
  const entries = Object.entries(mapping);
  console.log(`Mapping entries: ${entries.length}`);

  let applied = 0;
  let skipped = 0;

  for (const [birdId, entry] of entries) {
    const bird = await prisma.bird.findUnique({
      where: { id: birdId },
      select: { groupName: true, fullName: true },
    });
    if (!bird) {
      console.warn(`SKIP: bird ${birdId} (${entry.fullName}) not found`);
      skipped++;
      continue;
    }
    if (bird.groupName !== entry.from) {
      console.warn(
        `SKIP: ${entry.fullName} groupName is "${bird.groupName}", mapping expected "${entry.from}" (stale mapping?)`
      );
      skipped++;
      continue;
    }
    if (APPLY) {
      await prisma.bird.update({ where: { id: birdId }, data: { groupName: entry.to } });
    }
    applied++;
  }

  console.log(`${APPLY ? "Updated" : "Would update"}: ${applied}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
