const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    
    // Check database connection
    let dbStatus = 'unknown';
    try {
      await rulesService.databaseService.query('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    res.status(200).json({
      status: 'healthy',
      service: 'rules-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'rules-service',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
