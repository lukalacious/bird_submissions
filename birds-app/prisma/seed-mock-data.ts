import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed mock submission data across multiple months for development.
 * This script creates realistic submission patterns for testing the dashboard.
 *
 * Usage: npx ts-node prisma/seed-mock-data.ts
 */

// Sample bird names to use (these should exist in your bird database)
const SAMPLE_BIRDS = [
  "African Fish Eagle",
  "African Penguin",
  "Cape Sugarbird",
  "Southern Yellow-billed Hornbill",
  "Secretarybird",
  "Martial Eagle",
  "Cape Vulture",
  "Blue Crane",
  "African Sacred Ibis",
  "Egyptian Goose",
  "Hadeda Ibis",
  "African Hoopoe",
  "Cape Robin-Chat",
  "Cape Weaver",
  "Red-billed Quelea",
  "Southern Masked Weaver",
  "Village Weaver",
  "Cape Sparrow",
  "House Sparrow",
  "Common Fiscal",
  "Fork-tailed Drongo",
  "Pied Crow",
  "Black-headed Heron",
  "Grey Heron",
  "Cattle Egret",
  "Great White Pelican",
  "African Darter",
  "Reed Cormorant",
  "White-breasted Cormorant",
  "African Spoonbill",
  "Hamerkop",
  "Black-winged Stilt",
  "Blacksmith Lapwing",
  "Crowned Lapwing",
  "Kittlitz's Plover",
  "Three-banded Plover",
  "Common Sandpiper",
  "Wood Sandpiper",
  "Greenshank",
  "Marsh Sandpiper",
];

function getRandomBirds(count: number): string[] {
  const shuffled = [...SAMPLE_BIRDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getRandomDate(year: number, month: number): Date {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  const hour = Math.floor(Math.random() * 12) + 8; // Between 8am and 8pm
  const minute = Math.floor(Math.random() * 60);
  return new Date(year, month - 1, day, hour, minute);
}

async function main() {
  console.log("🐦 Starting mock data seed...\n");

  // Get the first user (or create a test user if needed)
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log("No user found. Creating a test user...");
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    });
  }

  console.log(`Using user: ${user.name} (${user.email})`);

  // Get the first region
  const region = await prisma.region.findFirst();

  if (!region) {
    console.error("❌ No region found. Please run the main seed first.");
    process.exit(1);
  }

  console.log(`Using region: ${region.label}\n`);

  // Get existing birds from the region to use their actual names
  const existingBirds = await prisma.bird.findMany({
    where: { regionId: region.id },
    select: { fullName: true },
    take: 50,
  });

  const availableBirdNames = existingBirds.length > 0
    ? existingBirds.map(b => b.fullName)
    : SAMPLE_BIRDS;

  console.log(`Found ${availableBirdNames.length} available birds\n`);

  // Define months to seed (going back 6 months from current)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const monthsToSeed = [];
  for (let i = 5; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
    monthsToSeed.push({ year, month });
  }

  console.log("📅 Seeding data for months:");
  monthsToSeed.forEach(m => console.log(`   - ${m.year}-${String(m.month).padStart(2, '0')}`));
  console.log("");

  // Clear existing submissions for this user (in development only!)
  const deletedCount = await prisma.submission.deleteMany({
    where: { userId: user.id },
  });
  console.log(`🗑️  Cleared ${deletedCount.count} existing submissions\n`);

  let totalCreated = 0;

  for (const { year, month } of monthsToSeed) {
    // Randomize submission count per month (15-31 birds)
    const submissionCount = Math.floor(Math.random() * 17) + 15;
    const selectedBirds = getRandomBirds(Math.min(submissionCount, availableBirdNames.length));

    // Use actual bird names from the database if available
    const birdsToSubmit = selectedBirds.map((_, i) =>
      availableBirdNames[i % availableBirdNames.length]
    ).slice(0, submissionCount);

    const submissions = birdsToSubmit.map((birdName) => ({
      userId: user!.id,
      regionId: region.id,
      birdName,
      year,
      month,
      createdAt: getRandomDate(year, month),
    }));

    // Insert submissions
    const created = await prisma.submission.createMany({
      data: submissions,
      skipDuplicates: true,
    });

    console.log(`✅ ${year}-${String(month).padStart(2, '0')}: Created ${created.count} submissions`);
    totalCreated += created.count;
  }

  console.log(`\n🎉 Mock data seed completed!`);
  console.log(`   Total submissions created: ${totalCreated}`);
  console.log(`   User: ${user.name}`);
  console.log(`   Region: ${region.label}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
