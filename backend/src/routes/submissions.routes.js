const express = require('express');
const router = express.Router();
const submissionsController = require('../controllers/submissions.controller');
const { authenticateToken } = require('../middleware/auth');

// Protected routes - require authentication
router.post('/', authenticateToken, submissionsController.submitBirds);
router.get('/history', authenticateToken, submissionsController.getSubmissionHistory);

module.exports = router;
