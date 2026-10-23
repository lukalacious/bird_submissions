/**
 * C2 (July 2026): Apply the reviewed group-name mapping produced by
 * audit-group-names.ts (scripts/group-name-mapping.json) to Bird.groupName.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/normalize-group-names.ts          # dry run
 *   DATABASE_URL="..." npx tsx scripts/normalize-group-names.ts --apply  # execute
 *   ... --mapping=hyphen-group-mapping.json                              # alternate mapping file
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
  const mappingPath = path.join(__dirname, mappingArg ?? "group-name-mapping.json");
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
