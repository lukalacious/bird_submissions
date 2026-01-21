const express = require('express');
const router = express.Router();
const regionsController = require('../controllers/regions.controller');

// Public routes
router.get('/', regionsController.getRegions);

// Admin route (consider adding admin auth middleware)
router.post('/refresh', regionsController.refreshDatabase);

module.exports = router;
