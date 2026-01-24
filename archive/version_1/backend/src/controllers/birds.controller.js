const submissionService = require('../services/submission.service');

/**
 * Get birds for a specific region with user's submission status
 */
async function getBirdsByRegion(req, res, next) {
  try {
    const { region } = req.query;
    const userId = req.user.userId;

    if (!region) {
      return res.status(400).json({ error: 'Region parameter is required' });
    }

    const birds = await submissionService.getBirdsForUser(userId, region);

    res.json({ birds });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

/**
 * Get user's submission statistics for a region
 */
async function getUserStats(req, res, next) {
  try {
    const { region } = req.query;
    const userId = req.user.userId;

    if (!region) {
      return res.status(400).json({ error: 'Region parameter is required' });
    }

    const stats = await submissionService.getUserStats(userId, region);

    res.json({ stats });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBirdsByRegion,
  getUserStats
};
