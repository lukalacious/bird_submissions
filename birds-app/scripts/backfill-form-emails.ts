import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import * as readline from "node:readline/promises";
import * as fs from "node:fs";
import * as path from "node:path";

// --- Types ---

type MatchConfidence =
  | "EXACT"
  | "NORMALIZED"
  | "CROSS_REF"
  | "FUZZY"
  | "AMBIGUOUS"
  | "UNMATCHED"
  | "SKIPPED";

interface DbUser {
  name: string | null;
  username: string | null;
  email: string;
}

interface MatchResult {
  rowIndex: number;
  formName: string;
  matchedEmail: string | null;
  matchType: MatchConfidence;
  matchedVia?: string;
  candidates?: Array<{ name: string | null; email: string; score: number }>;
}

interface NameIndex {
  byExactName: Map<string, DbUser>;
  byExactUsername: Map<string, DbUser>;
  byEmailLocal: Map<string, DbUser>;
  byFirstName: Map<string, DbUser[]>;
  byNormalized: Map<string, DbUser>;
  byCrossRef: Map<string, string>;
  allUsers: DbUser[];
}

// --- CLI Args ---

function parseArgs(argv: string[]) {
  const args = {
    apply: false,
    overrides: null as string | null,
    nameCol: null as number | null,
    tab: "Form Responses 1",
  };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg.startsWith("--overrides=")) args.overrides = arg.split("=")[1];
    else if (arg.startsWith("--name-col=")) args.nameCol = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--tab=")) args.tab = arg.split("=")[1];
  }
  return args;
}

// --- Google Sheets auth (copied from src/lib/google-sheets.ts) ---

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const BIRD_SUBMISSIONS_TAB = "Bird Submissions";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    console.error("❌ Google Sheets credentials not configured");
    process.exit(1);
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: SCOPES,
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// --- Utilities ---

function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// --- Build name index from DB users ---

function buildNameIndex(users: DbUser[], crossRefMap: Map<string, string>): NameIndex {
  const index: NameIndex = {
    byExactName: new Map(),
    byExactUsername: new Map(),
    byEmailLocal: new Map(),
    byFirstName: new Map(),
    byNormalized: new Map(),
    byCrossRef: crossRefMap,
    allUsers: users,
  };

  for (const user of users) {
    if (user.name) {
      const lower = user.name.toLowerCase().trim();
      index.byExactName.set(lower, user);
      index.byNormalized.set(normalize(user.name), user);

      const firstName = lower.split(" ")[0];
      if (firstName) {
        const existing = index.byFirstName.get(firstName) || [];
        existing.push(user);
        index.byFirstName.set(firstName, existing);
      }
    }

    if (user.username) {
      index.byExactUsername.set(user.username.toLowerCase().trim(), user);
    }

    const localPart = user.email.split("@")[0].toLowerCase();
    index.byEmailLocal.set(localPart, user);
  }

  return index;
}

// --- Build cross-reference map from Bird Submissions tab ---

async function buildCrossRefMap(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${BIRD_SUBMISSIONS_TAB}'!A:D`,
    });

    const rows = response.data.values || [];
    // Skip header row; columns: [Timestamp, UserId, Email, UserName]
    for (let i = 1; i < rows.length; i++) {
      const email = rows[i][2]?.trim();
      const userName = rows[i][3]?.trim();
      if (email && userName && email.includes("@")) {
        map.set(normalize(userName), email);
      }
    }

    console.log(`📋 Cross-reference: ${map.size} unique name→email pairs from Bird Submissions`);
  } catch (error) {
    console.warn("⚠️  Could not read Bird Submissions tab for cross-reference");
  }

  return map;
}

// --- Core matching logic ---

function matchName(formName: string, index: NameIndex): MatchResult {
  const rowIndex = -1; // Set by caller
  const lower = formName.toLowerCase().trim();
  const norm = normalize(formName);

  // Tier 1: Exact match against name, username, or email local-part
  const exactByName = index.byExactName.get(lower);
  if (exactByName) {
    return { rowIndex, formName, matchedEmail: exactByName.email, matchType: "EXACT", matchedVia: "name" };
  }

  const exactByUsername = index.byExactUsername.get(lower);
  if (exactByUsername) {
    return { rowIndex, formName, matchedEmail: exactByUsername.email, matchType: "EXACT", matchedVia: "username" };
  }

  const exactByEmailLocal = index.byEmailLocal.get(lower);
  if (exactByEmailLocal) {
    return { rowIndex, formName, matchedEmail: exactByEmailLocal.email, matchType: "EXACT", matchedVia: "email local-part" };
  }

  // Tier 2: Normalized match (diacritics stripped, whitespace collapsed)
  const normalizedMatch = index.byNormalized.get(norm);
  if (normalizedMatch) {
    return { rowIndex, formName, matchedEmail: normalizedMatch.email, matchType: "NORMALIZED", matchedVia: "normalized name" };
  }

  // Tier 2b: First name match
  const firstName = norm.split(" ")[0];
  const firstNameMatches = index.byFirstName.get(firstName);
  if (firstNameMatches && firstNameMatches.length === 1) {
    return { rowIndex, formName, matchedEmail: firstNameMatches[0].email, matchType: "NORMALIZED", matchedVia: "first name" };
  }

  // Tier 3: Cross-reference from Bird Submissions tab
  const crossRef = index.byCrossRef.get(norm);
  if (crossRef) {
    return { rowIndex, formName, matchedEmail: crossRef, matchType: "CROSS_REF", matchedVia: "Bird Submissions tab" };
  }

  // Tier 4: Fuzzy matching via Levenshtein distance
  const fuzzyThreshold = 2;
  const fuzzyCandidates: Array<{ name: string | null; email: string; score: number }> = [];

  for (const user of index.allUsers) {
    const targets = [user.name, user.username].filter(Boolean) as string[];
    for (const target of targets) {
      const targetNorm = normalize(target);
      const dist = levenshtein(norm, targetNorm);

      // Only fuzzy-match if both strings are long enough to be meaningful
      if (dist <= fuzzyThreshold && norm.length > 3 && targetNorm.length > 3) {
        fuzzyCandidates.push({ name: user.name, email: user.email, score: dist });
      }
    }
  }

  // Deduplicate by email (a user might match on both name and username)
  const uniqueCandidates = [...new Map(fuzzyCandidates.map((c) => [c.email, c])).values()]
    .sort((a, b) => a.score - b.score);

  if (uniqueCandidates.length === 1) {
    return {
      rowIndex,
      formName,
      matchedEmail: uniqueCandidates[0].email,
      matchType: "FUZZY",
      matchedVia: `edit distance: ${uniqueCandidates[0].score}`,
    };
  }

  if (uniqueCandidates.length > 1) {
    // Multiple first-name matches from Tier 2b also fall through here
    return {
      rowIndex,
      formName,
      matchedEmail: null,
      matchType: "AMBIGUOUS",
      candidates: uniqueCandidates,
    };
  }

  // If first name had multiple matches but fuzzy found nothing, still flag as ambiguous
  if (firstNameMatches && firstNameMatches.length > 1) {
    return {
      rowIndex,
      formName,
      matchedEmail: null,
      matchType: "AMBIGUOUS",
      candidates: firstNameMatches.map((u) => ({ name: u.name, email: u.email, score: 0 })),
    };
  }

  return { rowIndex, formName, matchedEmail: null, matchType: "UNMATCHED" };
}

// --- Report ---

function printReport(results: MatchResult[]) {
  const grouped = {
    EXACT: results.filter((r) => r.matchType === "EXACT"),
    NORMALIZED: results.filter((r) => r.matchType === "NORMALIZED"),
    CROSS_REF: results.filter((r) => r.matchType === "CROSS_REF"),
    FUZZY: results.filter((r) => r.matchType === "FUZZY"),
    AMBIGUOUS: results.filter((r) => r.matchType === "AMBIGUOUS"),
    UNMATCHED: results.filter((r) => r.matchType === "UNMATCHED"),
    SKIPPED: results.filter((r) => r.matchType === "SKIPPED"),
  };

  console.log("\n" + "=".repeat(60));
  console.log("  Form Email Backfill Report");
  console.log("=".repeat(60));

  for (const [type, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;

    const label =
      type === "AMBIGUOUS"
        ? "AMBIGUOUS - NEEDS MANUAL RESOLUTION"
        : type === "SKIPPED"
          ? "SKIPPED (already email)"
          : `${type} MATCHES`;

    console.log(`\n${label} (${items.length} rows)`);

    for (const r of items) {
      const rowNum = String(r.rowIndex + 1).padStart(3);
      if (type === "AMBIGUOUS" && r.candidates) {
        console.log(`  Row ${rowNum}: "${r.formName}"`);
        for (const c of r.candidates) {
          console.log(`    Candidate: ${c.name || "?"} <${c.email}> (score: ${c.score})`);
        }
      } else if (type === "UNMATCHED") {
        console.log(`  Row ${rowNum}: "${r.formName}" -> NO MATCH`);
      } else if (type === "SKIPPED") {
        console.log(`  Row ${rowNum}: "${r.formName}" (already an email)`);
      } else {
        const via = r.matchedVia ? ` (${r.matchedVia})` : "";
        console.log(`  Row ${rowNum}: "${r.formName}" -> ${r.matchedEmail}${via}`);
      }
    }
  }

  const resolved = results.filter(
    (r) => !["AMBIGUOUS", "UNMATCHED", "SKIPPED"].includes(r.matchType)
  ).length;
  const ambiguous = grouped.AMBIGUOUS.length;
  const unmatched = grouped.UNMATCHED.length;
  const skipped = grouped.SKIPPED.length;

  console.log("\n" + "-".repeat(60));
  console.log(
    `Summary: ${resolved} resolved | ${ambiguous} ambiguous | ${unmatched} unmatched | ${skipped} skipped`
  );
  console.log("-".repeat(60));
}

// --- Backup ---

async function backupFormResponses(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string
): Promise<string> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!A:ZZ`,
  });

  const backupPath = path.join(
    __dirname,
    `form-responses-backup-${Date.now()}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(response.data.values || [], null, 2));
  return backupPath;
}

// --- Apply changes ---

async function applyChanges(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
  nameColIndex: number,
  results: MatchResult[]
) {
  const toUpdate = results.filter(
    (r) => r.matchedEmail && !["AMBIGUOUS", "UNMATCHED", "SKIPPED"].includes(r.matchType)
  );

  if (toUpdate.length === 0) {
    console.log("ℹ️  No changes to apply.");
    return;
  }

  const colLetter = String.fromCharCode(65 + nameColIndex); // A=0, B=1, etc.

  const data = toUpdate.map((r) => ({
    range: `'${tabName}'!${colLetter}${r.rowIndex + 1}`,
    values: [[r.matchedEmail]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });

  console.log(`✅ Updated ${toUpdate.length} rows in "${tabName}"`);
}

// --- Confirmation prompt ---

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(message);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

// --- Detect name column ---

function detectNameColumn(headers: string[]): number | null {
  // First look for a "name" column (original form)
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes("name") && !h.includes("bird") && !h.includes("kind")) return i;
  }
  // Fall back to "email" column (updated form — old rows still have names)
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes("email")) return i;
  }
  return null;
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    console.log("🔄 Backfill Form Emails");
    console.log(`   Mode: ${args.apply ? "APPLY" : "DRY RUN"}`);
    console.log(`   Tab: "${args.tab}"`);

    // DB safety notice
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.includes("ep-holy-brook")) {
      console.log("   ⚠️  Connected to PRODUCTION database (read-only query)");
    }

    // 1. Read form responses
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.error("❌ GOOGLE_SHEETS_SPREADSHEET_ID not set");
      process.exit(1);
    }

    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${args.tab}'!A:ZZ`,
    });

    const allRows = response.data.values || [];
    if (allRows.length < 2) {
      console.log("ℹ️  No data rows found in form responses.");
      return;
    }

    const headers = allRows[0];
    console.log(`\n📄 Headers: ${headers.join(" | ")}`);

    // 2. Detect or use specified name column
    const nameColIndex = args.nameCol ?? detectNameColumn(headers);
    if (nameColIndex === null) {
      console.error("❌ Could not auto-detect name column. Use --name-col=N");
      console.error("   Headers:", headers.map((h, i) => `${i}="${h}"`).join(", "));
      process.exit(1);
    }
    console.log(`   Name column: ${nameColIndex} ("${headers[nameColIndex]}")`);

    // 3. Query DB users
    const users = await prisma.user.findMany({
      select: { name: true, username: true, email: true },
    });
    console.log(`👥 Found ${users.length} users in database`);

    // 4. Build cross-reference from Bird Submissions
    const crossRefMap = await buildCrossRefMap(sheets, spreadsheetId);

    // 5. Build name index
    const nameIndex = buildNameIndex(users, crossRefMap);

    // 6. Load overrides if provided
    const overrides = new Map<string, string>();
    if (args.overrides) {
      const raw = JSON.parse(fs.readFileSync(args.overrides, "utf-8"));
      for (const [name, email] of Object.entries(raw)) {
        overrides.set(normalize(name), email as string);
      }
      console.log(`📎 Loaded ${overrides.size} manual overrides`);
    }

    // 7. Match each row
    const results: MatchResult[] = [];
    for (let i = 1; i < allRows.length; i++) {
      const formName = allRows[i][nameColIndex]?.trim() || "";

      if (!formName) continue;

      // Skip if already an email
      if (formName.includes("@")) {
        results.push({
          rowIndex: i,
          formName,
          matchedEmail: null,
          matchType: "SKIPPED",
        });
        continue;
      }

      // Check overrides first
      const overrideEmail = overrides.get(normalize(formName));
      if (overrideEmail) {
        results.push({
          rowIndex: i,
          formName,
          matchedEmail: overrideEmail,
          matchType: "EXACT",
          matchedVia: "manual override",
        });
        continue;
      }

      const result = matchName(formName, nameIndex);
      result.rowIndex = i;
      results.push(result);
    }

    // 8. Print report
    printReport(results);

    // 9. Apply if requested
    if (args.apply) {
      const backupPath = await backupFormResponses(sheets, spreadsheetId, args.tab);
      console.log(`\n💾 Backup saved to: ${backupPath}`);

      const resolved = results.filter(
        (r) => r.matchedEmail && !["AMBIGUOUS", "UNMATCHED", "SKIPPED"].includes(r.matchType)
      ).length;

      const proceed = await confirm(
        `\nApply ${resolved} changes to "${args.tab}"? (yes/no): `
      );

      if (proceed) {
        await applyChanges(sheets, spreadsheetId, args.tab, nameColIndex, results);
      } else {
        console.log("❌ Cancelled.");
      }
    } else {
      console.log("\n💡 Run with --apply to write changes.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
