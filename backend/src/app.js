const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const initializeGoogleOAuth = require('./config/google-oauth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const regionsRoutes = require('./routes/regions.routes');
const birdsRoutes = require('./routes/birds.routes');
const submissionsRoutes = require('./routes/submissions.routes');

// Initialize Express app
const app = express();

// Initialize Google OAuth
initializeGoogleOAuth();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bird Submission API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/birds', birdsRoutes);
app.use('/api/submissions', submissionsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
