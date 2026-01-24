import { PrismaClient, Role } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

interface BirdRow {
  "Alphabetical Name"?: string;
  "Full  Name "?: string; // Note: has extra space in original Excel
  "Full Name"?: string;
  "Scientific Name"?: string;
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

// Override display labels when the formatted sheet name isn't preferred (e.g. "The Netherlands")
const LABEL_OVERRIDES: Record<string, string> = {
  netherlands: "The Netherlands",
};

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.submission.deleteMany();
  await prisma.bird.deleteMany();
  await prisma.region.deleteMany();

  // Load Excel file
  const excelPath = path.join(__dirname, "Bird Species Database.xlsx");
  console.log(`📖 Reading Excel file from: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  console.log(`📋 Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`);

  let totalBirds = 0;

  // Process each sheet as a region
  for (const sheetName of workbook.SheetNames) {
    const regionName = formatRegionName(sheetName);
    const regionLabel = LABEL_OVERRIDES[regionName] ?? formatRegionLabel(sheetName);

    console.log(`\n🌍 Processing region: ${regionLabel} (${regionName})`);

    // Create region
    const region = await prisma.region.create({
      data: {
        name: regionName,
        label: regionLabel,
      },
    });

    // Read sheet data
    const worksheet = workbook.Sheets[sheetName];
    const rawData: BirdRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`   Found ${rawData.length} birds`);

    // Transform and insert birds
    const birds = rawData
      .map((row) => {
        const fullName = (row["Full  Name "] || row["Full Name"] || "").toString().trim();
        const alphabeticalName = (row["Alphabetical Name"] || "").toString().trim();
        const scientificName = (row["Scientific Name"] || "").toString().trim();

        if (!fullName) return null;

        return {
          alphabeticalName,
          fullName,
          scientificName,
          regionId: region.id,
        };
      })
      .filter((bird): bird is NonNullable<typeof bird> => bird !== null);

    // Batch insert birds
    await prisma.bird.createMany({
      data: birds,
      skipDuplicates: true,
    });

    totalBirds += birds.length;
    console.log(`   ✅ Inserted ${birds.length} birds for ${regionLabel}`);
  }

  // Create default settings
  console.log("\n⚙️  Creating default settings...");
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      maxBirdsPerSubmission: 31,
      resetPeriod: "YEARLY",
      currentYear: new Date().getFullYear(),
    },
  });

  // Create initial admin user (optional - can be changed)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    console.log(`\n👤 Creating admin user: ${adminEmail}`);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: Role.ADMIN },
      create: {
        email: adminEmail,
        role: Role.ADMIN,
      },
    });
  }

  console.log(`\n✨ Seed completed successfully!`);
  console.log(`   - Regions: ${workbook.SheetNames.length}`);
  console.log(`   - Total birds: ${totalBirds}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
