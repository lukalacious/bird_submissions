const excelReader = require('./excelReader.service');
const googleSheets = require('./googleSheets.service');

class SubmissionService {
  /**
   * Get birds for a user in a specific region with disabled flags
   * @param {string} userId - Google user ID
   * @param {string} region - Region name
   * @returns {Array} Birds with isDisabled flags
   */
  async getBirdsForUser(userId, region) {
    try {
      // Get all birds for the region from Excel
      const birds = excelReader.getBirdsByRegion(region);

      // Get user's submission history for this region
      const submittedBirds = await googleSheets.getUserSubmissions(userId, region);

      // Mark previously submitted birds as disabled
      const birdsWithStatus = birds.map(bird => ({
        ...bird,
        isDisabled: submittedBirds.includes(bird.fullName)
      }));

      return birdsWithStatus;
    } catch (error) {
      console.error('Error getting birds for user:', error);
      throw error;
    }
  }

  /**
   * Validate a submission
   * @param {Array} birds - Array of bird common names
   * @param {Array} submittedBirds - Previously submitted birds
   * @returns {Object} Validation result
   */
  validateSubmission(birds, submittedBirds = []) {
    const errors = [];

    // Check if birds array is empty
    if (!birds || birds.length === 0) {
      errors.push('No birds selected');
    }

    // Check maximum limit
    if (birds.length > 31) {
      errors.push('Cannot submit more than 31 birds');
    }

    // Check for duplicates in current submission
    const uniqueBirds = new Set(birds);
    if (uniqueBirds.size !== birds.length) {
      errors.push('Duplicate birds in submission');
    }

    // Check if any birds were previously submitted
    const alreadySubmitted = birds.filter(bird => submittedBirds.includes(bird));
    if (alreadySubmitted.length > 0) {
      errors.push(`The following birds were already submitted: ${alreadySubmitted.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Submit birds for a user
   * @param {Object} submissionData - Submission data
   * @param {string} submissionData.userId - Google user ID
   * @param {string} submissionData.userName - User display name
   * @param {string} submissionData.email - User email
   * @param {string} submissionData.region - Region name
   * @param {Array} submissionData.birds - Array of bird common names
   * @returns {Object} Submission result
   */
  async submitBirds(submissionData) {
    try {
      const { userId, userName, email, region, birds } = submissionData;

      // Validate input
      if (!userId || !userName || !email || !region || !birds) {
        throw new Error('Missing required fields');
      }

      // Get user's previous submissions
      const submittedBirds = await googleSheets.getUserSubmissions(userId, region);

      // Validate submission
      const validation = this.validateSubmission(birds, submittedBirds);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Verify all birds exist in the region
      const regionBirds = excelReader.getBirdsByRegion(region);
      const regionBirdNames = regionBirds.map(b => b.fullName);
      const invalidBirds = birds.filter(bird => !regionBirdNames.includes(bird));

      if (invalidBirds.length > 0) {
        return {
          success: false,
          errors: [`Invalid birds for region ${region}: ${invalidBirds.join(', ')}`]
        };
      }

      // Add submission to Google Sheets
      await googleSheets.addSubmission({
        userId,
        email,
        userName,
        region,
        birds
      });

      return {
        success: true,
        submissionCount: birds.length,
        message: `Successfully submitted ${birds.length} birds`
      };
    } catch (error) {
      console.error('Error submitting birds:', error);
      throw error;
    }
  }

  /**
   * Get user's submission statistics
   * @param {string} userId - Google user ID
   * @param {string} region - Region name
   * @returns {Object} User statistics
   */
  async getUserStats(userId, region) {
    try {
      const submittedBirds = await googleSheets.getUserSubmissions(userId, region);
      const totalBirds = excelReader.getBirdsByRegion(region).length;

      return {
        submittedCount: submittedBirds.length,
        totalBirds,
        remainingBirds: totalBirds - submittedBirds.length,
        percentageComplete: ((submittedBirds.length / totalBirds) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new SubmissionService();
