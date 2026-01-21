const submissionService = require('../services/submission.service');

/**
 * Submit birds for a user
 */
async function submitBirds(req, res, next) {
  try {
    const { region, birds } = req.body;
    const { userId, email, name } = req.user;

    if (!region || !birds) {
      return res.status(400).json({ error: 'Region and birds are required' });
    }

    if (!Array.isArray(birds)) {
      return res.status(400).json({ error: 'Birds must be an array' });
    }

    const result = await submissionService.submitBirds({
      userId,
      userName: name,
      email,
      region,
      birds
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.errors
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's submission history
 */
async function getSubmissionHistory(req, res, next) {
  try {
    const { region } = req.query;
    const userId = req.user.userId;

    if (!region) {
      return res.status(400).json({ error: 'Region parameter is required' });
    }

    const googleSheets = require('../services/googleSheets.service');
    const submittedBirds = await googleSheets.getUserSubmissions(userId, region);

    res.json({ submittedBirds });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitBirds,
  getSubmissionHistory
};
