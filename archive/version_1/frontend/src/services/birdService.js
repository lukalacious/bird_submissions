import api from './api';

export const birdService = {
  /**
   * Get all available regions
   */
  async getRegions() {
    const response = await api.get('/regions');
    return response.data.regions;
  },

  /**
   * Get birds for a region with disabled flags
   */
  async getBirdsByRegion(region) {
    const response = await api.get(`/birds?region=${encodeURIComponent(region)}`);
    return response.data.birds;
  },

  /**
   * Get user's statistics for a region
   */
  async getUserStats(region) {
    const response = await api.get(`/birds/stats?region=${encodeURIComponent(region)}`);
    return response.data.stats;
  },

  /**
   * Submit birds
   */
  async submitBirds(region, birds) {
    const response = await api.post('/submissions', { region, birds });
    return response.data;
  },

  /**
   * Get submission history
   */
  async getSubmissionHistory(region) {
    const response = await api.get(`/submissions/history?region=${encodeURIComponent(region)}`);
    return response.data.submittedBirds;
  }
};
