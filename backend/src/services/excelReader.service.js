const XLSX = require('xlsx');
const path = require('path');

class ExcelReaderService {
  constructor() {
    this.birdData = null;
    this.databasePath = process.env.BIRD_DATABASE_PATH || path.join(__dirname, '../../../Bird Species Database.xlsx');
  }

  /**
   * Load and parse the bird database from Excel file
   * @returns {Object} Parsed bird data with regions and birds
   */
  loadBirdDatabase() {
    try {
      console.log(`Loading bird database from: ${this.databasePath}`);

      const workbook = XLSX.readFile(this.databasePath);
      const sheetNames = workbook.SheetNames;

      const regions = [];
      const birds = {};

      sheetNames.forEach((sheetName) => {
        regions.push(sheetName);

        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        birds[sheetName] = rawData.map((row, index) => ({
          id: `${sheetName.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
          alphabeticalName: row['Alphabetical Name'] || '',
          fullName: (row['Full  Name '] || row['Full Name'] || '').trim(),
          scientificName: row['Scientific Name'] || '',
          region: sheetName
        }));

        console.log(`Loaded ${birds[sheetName].length} birds for region: ${sheetName}`);
      });

      this.birdData = { regions, birds };
      console.log(`Successfully loaded ${regions.length} regions`);

      return this.birdData;
    } catch (error) {
      console.error('Error loading bird database:', error);
      throw new Error(`Failed to load bird database: ${error.message}`);
    }
  }

  /**
   * Refresh the bird database by re-reading the Excel file
   * @returns {Object} Updated bird data
   */
  refreshDatabase() {
    console.log('Refreshing bird database...');
    return this.loadBirdDatabase();
  }

  /**
   * Get all available regions
   * @returns {Array} List of region names
   */
  getRegions() {
    if (!this.birdData) {
      this.loadBirdDatabase();
    }
    return this.birdData.regions;
  }

  /**
   * Get all birds for a specific region
   * @param {string} region - Region name
   * @returns {Array} List of birds in the region
   */
  getBirdsByRegion(region) {
    if (!this.birdData) {
      this.loadBirdDatabase();
    }

    if (!this.birdData.birds[region]) {
      throw new Error(`Region "${region}" not found`);
    }

    return this.birdData.birds[region];
  }

  /**
   * Get all bird data
   * @returns {Object} Complete bird data
   */
  getAllData() {
    if (!this.birdData) {
      this.loadBirdDatabase();
    }
    return this.birdData;
  }
}

module.exports = new ExcelReaderService();
