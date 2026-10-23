/**
 * One-off fix (October 2026): rewrite colin.jackson@arocha.org to
 * chwjackson@gmail.com in the Google Form responses sheet, so the form
 * data matches his real account at source. (EMAIL_ALIASES in
 * src/lib/form-jokers.ts also covers this at processing time — this keeps
 * the sheet itself correct.)
 *
 * Only cells in the email column that exactly match the wrong address are
 * touched. A JSON backup of the whole tab is written before any change.
 *
 * Usage (needs GOOGLE_* env vars, e.g. source .env first):
 *   npx tsx scripts/fix-colin-sheet-email.ts                          # dry run
 *   npx tsx scripts/fix-colin-sheet-email.ts --apply                  # execute
 *   npx tsx scripts/fix-colin-sheet-email.ts --tab="Form Responses 1" # custom tab
 */
import { google } from "googleapis";
import * as readline from "node:readline/promises";
import * as fs from "node:fs";
import * as path from "node:path";

const WRONG_EMAIL = "colin.jackson@arocha.org";
const REAL_EMAIL = "chwjackson@gmail.com";

const APPLY = process.argv.includes("--apply");
const TAB =
  process.argv.find((a) => a.startsWith("--tab="))?.split("=")[1] ?? "Form Responses 1";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    console.error("❌ Google Sheets credentials not configured");
    process.exit(1);
  }
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: SCOPES,
  });
  return google.sheets({ version: "v4", auth });
}

function colLetter(index: number): string {
  // Supports A-Z and AA-AZ etc.
  let s = "";
  let n = index;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(message);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY RUN (pass --apply to execute) ===");
  console.log(`Tab: "${TAB}"`);

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("❌ GOOGLE_SHEETS_SPREADSHEET_ID not set");
    process.exit(1);
  }

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TAB}'!A:ZZ`,
  });
  const rows = response.data.values || [];
  if (rows.length < 2) {
    console.log("ℹ️  No data rows found.");
    return;
  }

  const headers = rows[0];
  const emailCol = headers.findIndex((h: string) => h.toLowerCase().includes("email"));
  if (emailCol === -1) {
    console.error(`❌ No email column found. Headers: ${headers.join(" | ")}`);
    process.exit(1);
  }
  console.log(`Email column: ${colLetter(emailCol)} ("${headers[emailCol]}")`);

  // Find target cells in the email column
  const hits: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cell = (rows[i][emailCol] ?? "").trim().toLowerCase();
    if (cell === WRONG_EMAIL) hits.push(i);
  }

  // Report (but don't touch) occurrences outside the email column
  let strayCount = 0;
  for (let i = 1; i < rows.length; i++) {
    for (let c = 0; c < (rows[i]?.length ?? 0); c++) {
      if (c === emailCol) continue;
      if ((rows[i][c] ?? "").toLowerCase().includes(WRONG_EMAIL)) {
        console.log(`⚠️  Stray occurrence at ${colLetter(c)}${i + 1} (not changed)`);
        strayCount++;
      }
    }
  }
  if (strayCount === 0) console.log("No stray occurrences outside the email column ✓");

  if (hits.length === 0) {
    console.log(`No cells matching ${WRONG_EMAIL} in the email column. Nothing to do.`);
    return;
  }
  console.log(`\n${hits.length} cell(s) to update -> ${REAL_EMAIL}:`);
  for (const i of hits) {
    const ts = rows[i][0] ?? "?";
    console.log(`  Row ${i + 1} (timestamp: ${ts})`);
  }

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to execute.");
    return;
  }

  const backupPath = path.join(__dirname, `form-responses-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2));
  console.log(`💾 Backup saved to: ${backupPath}`);

  const proceed = await confirm(`Apply ${hits.length} change(s) to "${TAB}"? (yes/no): `);
  if (!proceed) {
    console.log("❌ Cancelled.");
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: hits.map((i) => ({
        range: `'${TAB}'!${colLetter(emailCol)}${i + 1}`,
        values: [[REAL_EMAIL]],
      })),
    },
  });
  console.log(`✅ Updated ${hits.length} cell(s) in "${TAB}"`);
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
