import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_NAME = "Bird Submissions";
const MAX_BIRDS_COLUMNS = 31;

// Create auth client using service account credentials
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    console.warn("Google Sheets credentials not configured");
    return null;
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
}

// Get sheets client
function getSheetsClient() {
  const auth = getAuth();
  if (!auth) return null;

  return google.sheets({ version: "v4", auth });
}

// Ensure headers exist in the sheet
async function ensureHeaders(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:AJ1`,
    });

    if (!response.data.values || response.data.values.length === 0) {
      // Create headers
      const headers = [
        "Timestamp",
        "UserId",
        "Email",
        "UserName",
        "Region",
        ...Array.from({ length: MAX_BIRDS_COLUMNS }, (_, i) => `Bird${i + 1}`),
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:AJ1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  } catch (error: unknown) {
    // If sheet doesn't exist, try to create it
    if (error instanceof Error && error.message.includes("Unable to parse range")) {
      try {
        // Get spreadsheet to find sheet IDs
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId,
        });

        // Check if sheet exists
        const sheetExists = spreadsheet.data.sheets?.some(
          (s) => s.properties?.title === SHEET_NAME
        );

        if (!sheetExists) {
          // Add new sheet
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: SHEET_NAME,
                    },
                  },
                },
              ],
            },
          });

          // Now add headers
          const headers = [
            "Timestamp",
            "UserId",
            "Email",
            "UserName",
            "Region",
            ...Array.from({ length: MAX_BIRDS_COLUMNS }, (_, i) => `Bird${i + 1}`),
          ];

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAME}!A1:AJ1`,
            valueInputOption: "RAW",
            requestBody: { values: [headers] },
          });
        }
      } catch (createError) {
        console.error("Failed to create sheet:", createError);
        throw createError;
      }
    } else {
      throw error;
    }
  }
}

// Sync submission to Google Sheets
export interface SheetSubmission {
  userId: string;
  email: string;
  userName: string;
  regionName: string;
  birdNames: string[];
  timestamp: string;
}

export async function syncToGoogleSheets(submission: SheetSubmission): Promise<boolean> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    console.warn("GOOGLE_SHEETS_SPREADSHEET_ID not configured, skipping sync");
    return false;
  }

  const sheets = getSheetsClient();
  if (!sheets) {
    console.warn("Google Sheets client not available, skipping sync");
    return false;
  }

  try {
    // Ensure headers exist
    await ensureHeaders(sheets, spreadsheetId);

    // Create row with exactly 36 columns (5 metadata + 31 bird columns)
    const row = [
      submission.timestamp,
      submission.userId,
      submission.email,
      submission.userName,
      submission.regionName,
      ...submission.birdNames,
      ...Array(MAX_BIRDS_COLUMNS - submission.birdNames.length).fill(""), // Fill remaining with empty
    ];

    // Append row to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:AJ`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    console.log(`Synced ${submission.birdNames.length} birds to Google Sheets`);
    return true;
  } catch (error) {
    console.error("Failed to sync to Google Sheets:", error);
    return false;
  }
}

// --- Form Response Reader (for bonus joker processing) ---

const FORM_RESPONSES_GID = "1953517996";

export interface FormResponse {
  email: string;
  timestamp: string;
  within15km: boolean | null;
  anyBeyond750km: boolean | null;
  nonMotorisedCount: number | null;
  goldenBirdsCount: number | null;
  lifersCount: number | null;
  photosCount: number | null;
}

// Discover the tab name from its gid
async function getSheetNameByGid(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  gid: string
): Promise<string | null> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => String(s.properties?.sheetId) === gid
  );
  return sheet?.properties?.title || null;
}

// Parse a yes/no answer to boolean
function parseYesNo(value: string | undefined): boolean | null {
  if (!value) return null;
  const lower = value.toString().trim().toLowerCase();
  if (lower === "yes") return true;
  if (lower === "no") return false;
  return null;
}

// Parse a numeric answer
function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value.toString().trim(), 10);
  return isNaN(num) ? null : num;
}

/**
 * Read form responses from the Google Sheet for a given year/month.
 * Column matching is done by header text substring (case-insensitive).
 * For the duplicate non-motorised questions (Q4 vs Q18), Q18 is identified
 * by having "joker" in its header text.
 */
export async function getFormResponses(
  year: number,
  month: number
): Promise<FormResponse[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");
  }

  const sheets = getSheetsClient();
  if (!sheets) {
    throw new Error("Google Sheets client not available");
  }

  // Discover the tab name from gid
  const tabName = await getSheetNameByGid(sheets, spreadsheetId, FORM_RESPONSES_GID);
  if (!tabName) {
    throw new Error(`Sheet tab with gid ${FORM_RESPONSES_GID} not found`);
  }

  // Read all data from the form responses tab
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'`,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h: string) => h.toString().toLowerCase());

  // Find column indices by header substring matching
  const timestampCol = headers.findIndex((h: string) => h.includes("timestamp"));
  const emailCol = headers.findIndex((h: string) => h.includes("email"));
  const within15kmCol = headers.findIndex((h: string) => h.includes("15km") || h.includes("15 km"));
  const beyond750kmCol = headers.findIndex((h: string) => h.includes("750km") || h.includes("750 km"));
  const goldenBirdsCol = headers.findIndex((h: string) => h.includes("golden bird"));
  const lifersCol = headers.findIndex((h: string) => h.includes("lifer"));
  const photosCol = headers.findIndex((h: string) => h.includes("photograph"));

  // For non-motorised: Q18 has "joker" in header, Q4 does not
  const nonMotorisedCol = headers.findIndex(
    (h: string) => (h.includes("motorised") || h.includes("motorized")) && h.includes("joker")
  );

  if (timestampCol === -1 || emailCol === -1) {
    throw new Error("Could not find timestamp or email columns in form responses");
  }

  // Parse data rows and filter by year/month
  const responses: FormResponse[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const timestampStr = row[timestampCol]?.toString();
    if (!timestampStr) continue;

    // Parse timestamp — Google Forms uses "M/D/YYYY H:mm:ss" or similar
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) continue;

    // Filter by year and month
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month) continue;

    responses.push({
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

  return responses;
}

// Get all submissions from Google Sheets (for verification/debugging)
export async function getSheetSubmissions(): Promise<string[][] | null> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return null;
  }

  const sheets = getSheetsClient();
  if (!sheets) {
    return null;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:AJ`,
    });

    return response.data.values || [];
  } catch (error) {
    console.error("Failed to get sheet submissions:", error);
    return null;
  }
}
