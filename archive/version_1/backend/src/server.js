require('dotenv').config();
const app = require('./app');
const excelReader = require('./services/excelReader.service');

const PORT = process.env.PORT || 5000;

// Load bird database on startup
try {
  console.log('Loading bird database...');
  excelReader.loadBirdDatabase();
  console.log('Bird database loaded successfully');
} catch (error) {
  console.error('Failed to load bird database:', error);
  process.exit(1);
}

// Start server
app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`Bird Submission API Server`);
  console.log(`===========================================`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`===========================================\n`);
});
