/**
 * C1 (July 2026): Audit Bird.groupName across regions and propose a
 * normalized mapping for east_africa / west_africa, which use long
 * taxonomic group names while south_africa / netherlands use short
 * name-derived ones ("Flycatcher", "Heron", ...). Mixed schemes broke
 * cross-region joker grouping.
 *
 * Proposal rule per EA/WA bird:
 *   1. Same species (scientificName) exists in SA, else NL -> adopt that groupName
 *   2. Otherwise -> last word of the bird's fullName
 *
 * Writes scripts/group-name-mapping.json (birdId -> { from, to, ... })
 * for manual review; normalize-group-names.ts applies it.
 *
 * Usage: DATABASE_URL="..." npx tsx scripts/audit-group-names.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

function lastWord(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
}

async function main() {
  const regions = await prisma.region.findMany({ select: { id: true, name: true } });
  const regionName = new Map(regions.map((r) => [r.id, r.name]));

  const birds = await prisma.bird.findMany({
    select: {
      id: true,
      fullName: true,
      scientificName: true,
      groupName: true,
      regionId: true,
    },
  });

  const shortScheme = new Map<string, string>(); // scientificName -> groupName (SA preferred, then NL)
  for (const preferred of ["south_africa", "netherlands"]) {
    for (const b of birds) {
      if (regionName.get(b.regionId) === preferred && b.groupName && !shortScheme.has(b.scientificName)) {
        shortScheme.set(b.scientificName, b.groupName);
      }
    }
  }

  const mapping: Record<
    string,
    { region: string; fullName: string; scientificName: string; from: string | null; to: string; source: string }
  > = {};
  const stats = { adopted: 0, derived: 0, unchanged: 0 };

  for (const b of birds) {
    const region = regionName.get(b.regionId)!;
    if (region !== "east_africa" && region !== "west_africa") continue;

    const adopted = shortScheme.get(b.scientificName);
    const proposed = adopted ?? lastWord(b.fullName);
    const source = adopted ? "cross-region species match" : "last word of name";

    if (b.groupName === proposed) {
      stats.unchanged++;
      continue;
    }
    if (adopted) stats.adopted++;
    else stats.derived++;

    mapping[b.id] = {
      region,
      fullName: b.fullName,
      scientificName: b.scientificName,
      from: b.groupName,
      to: proposed,
      source,
    };
  }

  const outPath = path.join(__dirname, "group-name-mapping.json");
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));

  console.log(`Birds needing change: ${Object.keys(mapping).length}`);
  console.log(`  via cross-region species match: ${stats.adopted}`);
  console.log(`  via last-word derivation:       ${stats.derived}`);
  console.log(`  already conforming:             ${stats.unchanged}`);
  console.log(`Mapping written to ${outPath}`);

  // Summary of resulting group renames for eyeballing
  const renamePairs = new Map<string, number>();
  for (const m of Object.values(mapping)) {
    const key = `${m.from} -> ${m.to}`;
    renamePairs.set(key, (renamePairs.get(key) || 0) + 1);
  }
  const sorted = [...renamePairs.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\nTop group renames (count):");
  for (const [pair, count] of sorted.slice(0, 40)) {
    console.log(`  ${count.toString().padStart(4)}  ${pair}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
