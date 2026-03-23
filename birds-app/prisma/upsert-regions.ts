/**
 * Non-destructive region and bird data loader.
 *
 * Unlike seed.ts (which deletes all data first), this script uses upsert
 * operations to safely add or update regions and birds without losing
 * existing submissions, jokers, or user data.
 *
 * Usage:
 *   npm run db:upsert-regions                        # Process all sheets
 *   npm run db:upsert-regions -- --region=east_africa # Single region
 *   npm run db:upsert-regions -- --production         # Allow on production
 *
 * Safety: Refuses to run against production unless --production flag is passed.
 */

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

interface BirdRow {
  "Alphabetical Name"?: string;
  "Full  Name "?: string;
  "Full Name"?: string;
  "Scientific Name"?: string;
  "Group Name"?: string;
  "Family Name"?: string;
}

function formatRegionLabel(sheetName: string): string {
  return sheetName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatRegionName(sheetName: string): string {
  return sheetName.toLowerCase().replace(/\s+/g, "_");
}

// Map Excel sheet names to canonical region names used in production
const NAME_OVERRIDES: Record<string, string> = {
  southern_africa: "south_africa",
  the_netherlands: "netherlands",
};

const LABEL_OVERRIDES: Record<string, string> = {
  south_africa: "South Africa",
  netherlands: "The Netherlands",
};

async function main() {
  const args = process.argv.slice(2);
  const regionFlag = args.find((a) => a.startsWith("--region="));
  const targetRegion = regionFlag?.split("=")[1];
  const allowProduction = args.includes("--production");

  // Safety check
  const databaseUrl = process.env.DATABASE_URL || "";
  const isProduction =
    process.env.NODE_ENV === "production" ||
    databaseUrl.includes("ep-holy-brook");

  if (isProduction && !allowProduction) {
    console.error("❌ SAFETY CHECK: This appears to be a production database.");
    console.error("   Pass --production flag to confirm: npm run db:upsert-regions -- --production");
    process.exit(1);
  }

  if (isProduction) {
    console.warn("⚠️  Running against PRODUCTION database");
  }

  // Load Excel file
  const excelPath = path.join(__dirname, "Bird Species Database.xlsx");
  console.log(`📖 Reading Excel file from: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const getRegionName = (sheetName: string) => {
    const raw = formatRegionName(sheetName);
    return NAME_OVERRIDES[raw] ?? raw;
  };

  const sheetsToProcess = targetRegion
    ? workbook.SheetNames.filter((s) => getRegionName(s) === targetRegion)
    : workbook.SheetNames;

  if (sheetsToProcess.length === 0) {
    console.error(`❌ No sheet found for region: ${targetRegion}`);
    console.error(`   Available regions: ${workbook.SheetNames.map(formatRegionName).join(", ")}`);
    process.exit(1);
  }

  console.log(`📋 Processing ${sheetsToProcess.length} region(s): ${sheetsToProcess.join(", ")}`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;

  for (const sheetName of sheetsToProcess) {
    const regionName = getRegionName(sheetName);
    const regionLabel = LABEL_OVERRIDES[regionName] ?? formatRegionLabel(sheetName);

    console.log(`\n🌍 Processing region: ${regionLabel} (${regionName})`);

    // Upsert region
    const region = await prisma.region.upsert({
      where: { name: regionName },
      update: { label: regionLabel },
      create: { name: regionName, label: regionLabel },
    });

    // Read sheet data
    const worksheet = workbook.Sheets[sheetName];
    const rawData: BirdRow[] = XLSX.utils.sheet_to_json(worksheet);

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const row of rawData) {
      const fullName = (row["Full  Name "] || row["Full Name"] || "").toString().trim();
      const alphabeticalName = (row["Alphabetical Name"] || "").toString().trim();
      const scientificName = (row["Scientific Name"] || "").toString().trim();
      const groupName = (row["Group Name"] || row["Family Name"] || "").toString().trim() || null;

      if (!fullName) continue;

      // Check if bird exists to determine create vs update vs unchanged
      const existing = await prisma.bird.findUnique({
        where: { fullName_regionId: { fullName, regionId: region.id } },
      });

      if (!existing) {
        await prisma.bird.create({
          data: {
            alphabeticalName,
            fullName,
            scientificName,
            groupName,
            regionId: region.id,
          },
        });
        created++;
      } else {
        const needsUpdate =
          existing.alphabeticalName !== alphabeticalName ||
          existing.scientificName !== scientificName ||
          existing.groupName !== groupName;

        if (needsUpdate) {
          await prisma.bird.update({
            where: { id: existing.id },
            data: { alphabeticalName, scientificName, groupName },
          });
          updated++;
        } else {
          unchanged++;
        }
      }
    }

    console.log(`   ✅ ${created} created, ${updated} updated, ${unchanged} unchanged`);
    totalCreated += created;
    totalUpdated += updated;
    totalUnchanged += unchanged;
  }

  console.log(`\n✨ Done! ${totalCreated} created, ${totalUpdated} updated, ${totalUnchanged} unchanged`);
}

main()
  .catch((e) => {
    console.error("❌ Upsert failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
