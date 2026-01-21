// Google Sheets configuration is handled in googleSheets.service.js
// This file can be used for any additional Sheets-related config if needed

module.exports = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName: 'Bird Submissions',
  maxBirdsPerSubmission: 31
};
