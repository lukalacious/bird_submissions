const express = require('express');
const router = express.Router();
const birdsController = require('../controllers/birds.controller');
const { authenticateToken } = require('../middleware/auth');

// Protected routes - require authentication
router.get('/', authenticateToken, birdsController.getBirdsByRegion);
router.get('/stats', authenticateToken, birdsController.getUserStats);

module.exports = router;
