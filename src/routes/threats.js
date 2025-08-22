const express = require('express');
const router = express.Router();

// Get all threat patterns
router.get('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    
    const filters = {
      pattern_type: req.query.pattern_type,
      risk_level: req.query.risk_level
    };

    const patterns = await rulesService.getThreatPatterns(filters);
    
    res.status(200).json({
      success: true,
      data: patterns,
      count: patterns.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a specific threat pattern
router.get('/:patternId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { patternId } = req.params;
    
    // Get all patterns and find the specific one
    const patterns = await rulesService.getThreatPatterns();
    const pattern = patterns.find(p => p.id === patternId);
    
    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Threat pattern not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pattern
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new threat pattern (admin only)
router.post('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const patternData = req.body;
    
    // Check if user has admin privileges (you can implement your own auth logic)
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const userId = req.headers['x-user-id'] || 'system';
    
    const pattern = await rulesService.createThreatPattern(patternData, userId);
    
    res.status(201).json({
      success: true,
      data: pattern,
      message: 'Threat pattern created successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a threat pattern (admin only)
router.put('/:patternId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { patternId } = req.params;
    const updates = req.body;
    
    // Check if user has admin privileges
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    // For now, we'll use a simple approach since updateThreatPattern isn't implemented yet
    // You can extend the RulesService to include this method
    res.status(501).json({
      success: false,
      error: 'Update threat pattern not implemented yet'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a threat pattern (admin only)
router.delete('/:patternId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { patternId } = req.params;
    
    // Check if user has admin privileges
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    // For now, we'll use a simple approach since deleteThreatPattern isn't implemented yet
    // You can extend the RulesService to include this method
    res.status(501).json({
      success: false,
      error: 'Delete threat pattern not implemented yet'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get threat patterns by risk level
router.get('/risk/:riskLevel', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { riskLevel } = req.params;
    
    const patterns = await rulesService.getThreatPatterns({ risk_level: riskLevel });
    
    res.status(200).json({
      success: true,
      data: patterns,
      count: patterns.length,
      risk_level: riskLevel
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get threat patterns by type
router.get('/type/:patternType', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { patternType } = req.params;
    
    const patterns = await rulesService.getThreatPatterns({ pattern_type: patternType });
    
    res.status(200).json({
      success: true,
      data: patterns,
      count: patterns.length,
      pattern_type: patternType
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
