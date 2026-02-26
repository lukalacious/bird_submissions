/**
 * Standalone script to process January 2026 bonus jokers.
 * Mirrors the logic in src/app/actions/form-joker-actions.ts
 * but runs from CLI without auth requirements.
 *
 * Usage: npx tsx scripts/process-january-jokers.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

// We can't import from src/lib/ in a standalone script due to Next.js module resolution,
// so we inline the relevant bits from google-sheets.ts.
import { google } from "googleapis";

const YEAR = 2026;
const MONTH = 1;

// --- Google Sheets setup ---

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const FORM_RESPONSES_GID = "1953517996";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    console.error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    process.exit(1);
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: SCOPES,
  });
}

// --- Timestamp parser (same as the fix in google-sheets.ts) ---

function parseTimestamp(timestampStr: string): Date {
  const match = timestampStr.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
  return new Date(timestampStr);
}

// --- Helpers ---

function parseYesNo(value: string | undefined): boolean | null {
  if (!value) return null;
  const lower = value.toString().trim().toLowerCase();
  if (lower === "yes") return true;
  if (lower === "no") return false;
  return null;
}

function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value.toString().trim(), 10);
  return isNaN(num) ? null : num;
}

interface FormResponse {
  email: string;
  timestamp: string;
  within15km: boolean | null;
  anyBeyond750km: boolean | null;
  nonMotorisedCount: number | null;
  goldenBirdsCount: number | null;
  lifersCount: number | null;
  photosCount: number | null;
}

interface BonusBreakdown {
  rule: string;
  value: number;
}

// --- Bonus calculation (matches form-joker-actions.ts exactly) ---

function calculateFormBonus(response: FormResponse): { total: number; breakdown: BonusBreakdown[] } {
  const breakdown: BonusBreakdown[] = [];

  const r1 = response.within15km === true ? 5 : 0;
  if (r1 !== 0) breakdown.push({ rule: "All within 15km", value: r1 });

  const r2 = response.anyBeyond750km === true ? -3 : 0;
  if (r2 !== 0) breakdown.push({ rule: "Beyond 750km penalty", value: r2 });

  const r3 = response.nonMotorisedCount != null
    ? Math.min(Math.floor(response.nonMotorisedCount / 10), 3)
    : 0;
  if (r3 !== 0) breakdown.push({ rule: `Non-motorised (${response.nonMotorisedCount} birds)`, value: r3 });

  const r4 = response.goldenBirdsCount != null
    ? Math.min(response.goldenBirdsCount, 5)
    : 0;
  if (r4 !== 0) breakdown.push({ rule: `Golden birds (${response.goldenBirdsCount})`, value: r4 });

  const r5 = response.lifersCount != null
    ? Math.min(response.lifersCount, 5)
    : 0;
  if (r5 !== 0) breakdown.push({ rule: `Lifers (${response.lifersCount})`, value: r5 });

  const r6 = response.photosCount != null
    ? Math.min(response.photosCount, 3)
    : 0;
  if (r6 !== 0) breakdown.push({ rule: `Photos (${response.photosCount})`, value: r6 });

  return { total: r1 + r2 + r3 + r4 + r5 + r6, breakdown };
}

// --- Main ---

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`\nProcessing January ${YEAR} bonus jokers (${dryRun ? "DRY RUN" : "LIVE"})\n`);

  const prisma = new PrismaClient();

  try {
    // 1. Read form responses from Google Sheet
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    // Discover tab name
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(
      (s) => String(s.properties?.sheetId) === FORM_RESPONSES_GID
    );
    const tabName = sheet?.properties?.title;
    if (!tabName) {
      console.error("Could not find form responses tab");
      process.exit(1);
    }
    console.log(`Reading from tab: "${tabName}"`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabName}'`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log("No data rows found.");
      return;
    }

    const headers = rows[0].map((h: string) => h.toString().toLowerCase());

    // Find columns
    const timestampCol = headers.findIndex((h: string) => h.includes("timestamp"));
    const emailCol = headers.findIndex((h: string) => h.includes("email"));
    const within15kmCol = headers.findIndex((h: string) => h.includes("15km") || h.includes("15 km"));
    const beyond750kmCol = headers.findIndex((h: string) => h.includes("750km") || h.includes("750 km"));
    const goldenBirdsCol = headers.findIndex((h: string) => h.includes("golden bird"));
    const lifersCol = headers.findIndex((h: string) => h.includes("lifer"));
    const photosCol = headers.findIndex((h: string) => h.includes("photograph"));
    const nonMotorisedCol = headers.findIndex(
      (h: string) => (h.includes("motorised") || h.includes("motorized")) && h.includes("joker")
    );

    if (timestampCol === -1 || emailCol === -1) {
      console.error("Could not find timestamp or email columns");
      process.exit(1);
    }

    // Parse and filter for January 2026
    const formResponses: FormResponse[] = [];
    let parsedCount = 0;
    let filteredCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const timestampStr = row[timestampCol]?.toString();
      if (!timestampStr) continue;

      const date = parseTimestamp(timestampStr);
      if (isNaN(date.getTime())) {
        console.warn(`  Row ${i + 1}: unparseable timestamp "${timestampStr}"`);
        continue;
      }

      parsedCount++;

      if (date.getFullYear() !== YEAR || date.getMonth() + 1 !== MONTH) {
        filteredCount++;
        continue;
      }

      formResponses.push({
        email: row[emailCol]?.toString()?.trim() || "",
        timestamp: timestampStr,
        within15km: within15kmCol !== -1 ? parseYesNo(row[within15kmCol]) : null,
        anyBeyond750km: beyond750kmCol !== -1 ? parseYesNo(row[beyond750kmCol]) : null,
        nonMotorisedCount: nonMotorisedCol !== -1 ? parseCount(row[nonMotorisedCol]) : null,
        goldenBirdsCount: goldenBirdsCol !== -1 ? parseCount(row[goldenBirdsCol]) : null,
        lifersCount: lifersCol !== -1 ? parseCount(row[lifersCol]) : null,
        photosCount: photosCol !== -1 ? parseCount(row[photosCol]) : null,
      });
    }

    console.log(`Parsed: ${parsedCount} rows, filtered out: ${filteredCount} (wrong month), matched: ${formResponses.length}`);

    if (formResponses.length === 0) {
      console.log("No form responses for January 2026.");
      return;
    }

    // 2. Deduplicate by email
    const seenEmails = new Set<string>();
    const uniqueResponses: FormResponse[] = [];
    for (const r of formResponses) {
      const normalized = r.email.toLowerCase().trim();
      if (!seenEmails.has(normalized)) {
        seenEmails.add(normalized);
        uniqueResponses.push(r);
      }
    }
    console.log(`Unique responses: ${uniqueResponses.length} (deduped from ${formResponses.length})`);

    // 3. Match emails to users
    const allEmails = uniqueResponses.map((r) => r.email.toLowerCase().trim());
    const users = await prisma.user.findMany({
      where: { email: { in: allEmails, mode: "insensitive" } },
      select: { id: true, email: true, name: true, username: true },
    });
    const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    console.log(`Matched ${users.length} of ${uniqueResponses.length} emails to database users\n`);

    // 4. Calculate and upsert
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const response of uniqueResponses) {
      const normalized = response.email.toLowerCase().trim();
      const user = userByEmail.get(normalized);
      const { total, breakdown } = calculateFormBonus(response);

      const breakdownStr = breakdown.map((b) => `${b.rule}: ${b.value > 0 ? "+" : ""}${b.value}`).join(", ");

      if (user) {
        matchedCount++;
        console.log(`  ${(user.username || user.name || user.email).padEnd(25)} bonus: ${String(total).padStart(2)} [${breakdownStr}]`);

        if (!dryRun) {
          const existing = await prisma.userJoker.findUnique({
            where: { userId_year_month: { userId: user.id, year: YEAR, month: MONTH } },
          });
          const existingGroupJokers = existing?.jokers || 0;

          await prisma.userJoker.upsert({
            where: { userId_year_month: { userId: user.id, year: YEAR, month: MONTH } },
            create: {
              userId: user.id,
              year: YEAR,
              month: MONTH,
              jokers: 0,
              bonusJokers: total,
              totalJokers: total,
              usedJokers: 0,
            },
            update: {
              bonusJokers: total,
              totalJokers: existingGroupJokers + total,
            },
          });
        }
      } else {
        unmatchedCount++;
        console.log(`  UNMATCHED: ${response.email.padEnd(35)} bonus: ${String(total).padStart(2)} [${breakdownStr}]`);
      }
    }

    console.log(`\nDone: ${matchedCount} matched, ${unmatchedCount} unmatched`);
    if (dryRun) console.log("(Dry run — no DB changes made)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
