/**
 * C4 (October 2026): Audit hyphenated / bracketed / case-split groupNames
 * that fragment of-a-kind joker families (e.g. NL "Wood-Pigeon" vs "Pigeon"
 * — the family splits into sub-3 groups that each earn 0 jokers).
 *
 * Proposal rules, per region:
 *   1. Hyphenated group "X-Y" -> "Y", ONLY if "Y" already exists as a
 *      groupName in the same region (case-insensitive). So Wood-Pigeon ->
 *      Pigeon, Scops-Owl -> Owl, but Bee-eater / Thick-knee / Go-away-bird
 *      stay (their tails aren't real groups).
 *   2. Case-split merges: groups equal case-insensitively but not exactly
 *      (Robin-Chat vs Robin-chat) -> the globally most common spelling.
 *   3. Junk cleanup: strip wrapping brackets/parens from group names.
 *
 * Read-only: writes scripts/data/hyphen-group-mapping.json (same format as
 * group-name-mapping.json) and prints a review table for Dale. Apply later
 * with: npx tsx scripts/normalize-group-names.ts --mapping=hyphen-group-mapping.json --apply
 * then recalc-all-jokers.ts, and mirror the changes into
 * prisma/Bird Species Database.xlsx (else db:upsert-regions reverts them).
 *
 * Usage: DATABASE_URL="..." npx tsx scripts/audit-hyphen-groups.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

interface MappingEntry {
  region: string;
  fullName: string;
  scientificName: string;
  from: string | null;
  to: string;
  source: string;
}

function stripBrackets(name: string): string {
  // Fully wrapped: "(Thrush-babbler)" / "[Yellow-rumped]" -> inner text
  const wrapped = name.match(/^[\[\(](.+)[\]\)]$/);
  if (wrapped) return wrapped[1].trim();
  // Stray unmatched trailing close-bracket: "Malkoha)" -> "Malkoha".
  // Balanced internal parens ("Korhaan (Bustard)") are left alone.
  if (/[\)\]]$/.test(name) && !/[\(\[]/.test(name)) {
    return name.replace(/[\]\)]+$/, "").trim();
  }
  return name;
}

async function main() {
  const regions = await prisma.region.findMany({ select: { id: true, name: true } });
  const regionName = new Map(regions.map((r) => [r.id, r.name]));

  const birds = await prisma.bird.findMany({
    where: { groupName: { not: null } },
    select: { id: true, fullName: true, scientificName: true, groupName: true, regionId: true },
  });

  // Per-region group -> member count, and global case-insensitive spelling counts
  const regionGroups = new Map<string, Map<string, number>>(); // region -> groupName -> count
  const spellingCounts = new Map<string, Map<string, number>>(); // lower(group) -> spelling -> count
  for (const b of birds) {
    const region = regionName.get(b.regionId)!;
    const g = b.groupName!;
    if (!regionGroups.has(region)) regionGroups.set(region, new Map());
    const rg = regionGroups.get(region)!;
    rg.set(g, (rg.get(g) || 0) + 1);

    const lower = g.toLowerCase();
    if (!spellingCounts.has(lower)) spellingCounts.set(lower, new Map());
    const sc = spellingCounts.get(lower)!;
    sc.set(g, (sc.get(g) || 0) + 1);
  }

  // Canonical spelling per case-insensitive group = most common spelling globally
  const canonicalSpelling = new Map<string, string>();
  for (const [lower, sc] of spellingCounts) {
    const best = [...sc.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (sc.size > 1) canonicalSpelling.set(lower, best);
  }

  const mapping: Record<string, MappingEntry> = {};
  const renameSummary = new Map<string, { regions: Set<string>; birds: number }>();

  for (const b of birds) {
    const region = regionName.get(b.regionId)!;
    const from = b.groupName!;
    const rg = regionGroups.get(region)!;

    let to = from;
    let source = "";

    // Rule 3: junk cleanup first
    const stripped = stripBrackets(to);
    if (stripped !== to && stripped.length > 0) {
      to = stripped;
      source = "bracket cleanup";
    }

    // Rule 1a: dehyphenated concatenation beats tail merge — "Bush-shrike"
    // joins the existing "Bushshrike" group, NOT the unrelated "Shrike"s
    if (to.includes("-")) {
      const concat = to.replace(/-/g, "").toLowerCase();
      const concatMatch = [...rg.keys()].find(
        (g) => g.toLowerCase() === concat && g.toLowerCase() !== to.toLowerCase()
      );
      if (concatMatch) {
        to = concatMatch;
        source = source ? `${source} + dehyphen merge` : "dehyphen merge (concatenation exists in region)";
      }
    }

    // Rule 1b: hyphen merge when the tail is a real group in the same region
    if (to.includes("-")) {
      const tail = to.split("-").pop()!.trim();
      const tailMatch = [...rg.keys()].find(
        (g) => g.toLowerCase() === tail.toLowerCase() && g.toLowerCase() !== to.toLowerCase()
      );
      if (tailMatch) {
        to = tailMatch;
        source = source ? `${source} + hyphen merge` : "hyphen merge (tail exists in region)";
      }
    }

    // Rule 2: case-fold to the most common spelling
    const canonical = canonicalSpelling.get(to.toLowerCase());
    if (canonical && canonical !== to) {
      to = canonical;
      source = source ? `${source} + case fold` : "case fold to majority spelling";
    }

    if (to === from) continue;

    mapping[b.id] = {
      region,
      fullName: b.fullName,
      scientificName: b.scientificName,
      from,
      to,
      source,
    };

    const key = `${from} -> ${to}`;
    if (!renameSummary.has(key)) renameSummary.set(key, { regions: new Set(), birds: 0 });
    renameSummary.get(key)!.regions.add(region);
    renameSummary.get(key)!.birds++;
  }

  const outPath = path.join(__dirname, "data", "hyphen-group-mapping.json");
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));

  console.log(`Birds needing change: ${Object.keys(mapping).length}`);
  console.log(`Mapping written to ${outPath}\n`);

  // Review table for Dale: rename, regions, affected birds, resulting group size
  console.log("Proposed merges (for review — nothing has been changed):");
  console.log("rename".padEnd(42) + "regions".padEnd(38) + "birds");
  const sorted = [...renameSummary.entries()].sort((a, b) => b[1].birds - a[1].birds);
  for (const [pair, info] of sorted) {
    console.log(pair.padEnd(42) + [...info.regions].join(",").padEnd(38) + info.birds);
  }

  // What stays fragmented (hyphenated groups whose tail is NOT a group) — FYI list
  console.log("\nLeft alone (tail is not a group in the region):");
  const untouched = new Set<string>();
  for (const [region, rg] of regionGroups) {
    for (const g of rg.keys()) {
      if (!g.includes("-")) continue;
      const tail = g.split("-").pop()!.trim().toLowerCase();
      const hasTail = [...rg.keys()].some((other) => other.toLowerCase() === tail);
      if (!hasTail) untouched.add(g);
    }
  }
  console.log([...untouched].sort().join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
