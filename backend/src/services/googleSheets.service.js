const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  }

  /**
   * Initialize Google Sheets API with service account credentials
   */
  async initialize() {
    try {
      if (this.auth) {
        return; // Already initialized
      }

      const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      throw new Error(`Failed to initialize Google Sheets: ${error.message}`);
    }
  }

  /**
   * Get all submissions from the sheet
   * @returns {Array} All submission rows
   */
  async getAllSubmissions() {
    await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Bird Submissions!A:AJ' // Columns A through AJ (up to 36 columns)
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        return [];
      }

      // Skip header row if it exists
      const hasHeader = rows[0]?.[0] === 'Timestamp' || rows[0]?.[0] === 'timestamp';
      return hasHeader ? rows.slice(1) : rows;
    } catch (error) {
      // If sheet doesn't exist or is empty, return empty array
      if (error.code === 400 || error.message?.includes('Unable to parse range')) {
        console.log('Sheet is empty or doesn\'t exist yet, initializing...');
        await this.initializeSheet();
        return [];
      }
      throw error;
    }
  }

  /**
   * Initialize the sheet with headers if it doesn't exist
   */
  async initializeSheet() {
    await this.initialize();

    try {
      const headers = [
        'Timestamp',
        'UserId',
        'Email',
        'UserName',
        'Region',
        ...Array.from({ length: 31 }, (_, i) => `Bird${i + 1}`)
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Bird Submissions!A1:AJ1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });

      console.log('Sheet initialized with headers');
    } catch (error) {
      console.error('Error initializing sheet:', error);
    }
  }

  /**
   * Get all submissions for a specific user in a specific region
   * @param {string} userId - Google user ID
   * @param {string} region - Region name
   * @returns {Array} Array of bird common names submitted by the user in that region
   */
  async getUserSubmissions(userId, region) {
    await this.initialize();

    try {
      const allSubmissions = await this.getAllSubmissions();

      // Filter submissions by userId and region
      const userSubmissions = allSubmissions.filter(row => {
        return row[1] === userId && row[4] === region;
      });

      // Extract bird names (columns 5 onwards) and flatten into a single array
      const submittedBirds = userSubmissions.flatMap(row => {
        return row.slice(5).filter(bird => bird && bird.trim() !== '');
      });

      // Return unique bird names
      return [...new Set(submittedBirds)];
    } catch (error) {
      console.error('Error getting user submissions:', error);
      return [];
    }
  }

  /**
   * Add a new submission to the sheet
   * @param {Object} submissionData - Submission data
   * @param {string} submissionData.userId - Google user ID
   * @param {string} submissionData.email - User email
   * @param {string} submissionData.userName - User display name
   * @param {string} submissionData.region - Region name
   * @param {Array} submissionData.birds - Array of bird common names (max 31)
   * @returns {boolean} Success status
   */
  async addSubmission(submissionData) {
    await this.initialize();

    try {
      const { userId, email, userName, region, birds } = submissionData;
      const timestamp = new Date().toISOString();

      // Create row with fixed 36 columns (Timestamp, UserId, Email, UserName, Region, Bird1...Bird31)
      const row = [
        timestamp,
        userId,
        email,
        userName,
        region,
        ...birds,
        ...Array(31 - birds.length).fill('') // Fill remaining bird columns with empty strings
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Bird Submissions!A:AJ',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row]
        }
      });

      console.log(`Submission added for user ${userName} (${email}) in region ${region}`);
      return true;
    } catch (error) {
      console.error('Error adding submission:', error);
      throw new Error(`Failed to add submission: ${error.message}`);
    }
  }

  /**
   * Get all unique users who have made submissions
   * @returns {Array} Array of unique user objects
   */
  async getAllUsers() {
    await this.initialize();

    try {
      const allSubmissions = await this.getAllSubmissions();
      const uniqueUsers = {};

      allSubmissions.forEach(row => {
        const userId = row[1];
        if (userId && !uniqueUsers[userId]) {
          uniqueUsers[userId] = {
            userId: row[1],
            email: row[2],
            userName: row[3]
          };
        }
      });

      return Object.values(uniqueUsers);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }
}

module.exports = new GoogleSheetsService();
