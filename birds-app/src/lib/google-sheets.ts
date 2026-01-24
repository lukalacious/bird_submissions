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
