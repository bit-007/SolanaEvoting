// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./api/routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Mount API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'E-Voting Server is running',
    endpoints: {
      health: '/health',
      status: '/api/status',
      elections: '/api/elections',
      vote: '/api/vote',
      results: '/api/results/:electionId'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    network: process.env.SOLANA_NETWORK || 'devnet'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Start the election expiration checker
const { startExpirationChecker } = require('./api/controllers');
startExpirationChecker();


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Solana network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  console.log(`Visit http://localhost:${PORT}/health to check status`);
});