const excelReader = require('../services/excelReader.service');

/**
 * Get all available regions
 */
function getRegions(req, res, next) {
  try {
    const regions = excelReader.getRegions();
    res.json({ regions });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh bird database (admin endpoint)
 */
function refreshDatabase(req, res, next) {
  try {
    const data = excelReader.refreshDatabase();
    res.json({
      message: 'Database refreshed successfully',
      regions: data.regions
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRegions,
  refreshDatabase
};
