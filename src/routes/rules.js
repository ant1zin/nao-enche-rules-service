const express = require('express');
const router = express.Router();

// Get all rules for a user
router.get('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const userId = req.query.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in query params or x-user-id header'
      });
    }

    const filters = {
      rule_type: req.query.rule_type,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const rules = await rulesService.getUserRules(userId, filters);
    
    res.status(200).json({
      success: true,
      data: rules,
      count: rules.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a specific rule
router.get('/:ruleId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { ruleId } = req.params;
    const userId = req.query.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in query params or x-user-id header'
      });
    }

    const rule = await rulesService.getRule(ruleId, userId);
    
    res.status(200).json({
      success: true,
      data: rule
    });

  } catch (error) {
    if (error.message === 'Rule not found') {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new rule
router.post('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const ruleData = req.body;
    const userId = req.body.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in request body or x-user-id header'
      });
    }

    // Validate rule data
    const validation = await rulesService.validateRule(ruleData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const rule = await rulesService.createRule(ruleData, userId, ipAddress, userAgent);
    
    res.status(201).json({
      success: true,
      data: rule,
      message: 'Rule created successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a rule
router.put('/:ruleId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { ruleId } = req.params;
    const updates = req.body;
    const userId = req.body.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in request body or x-user-id header'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const rule = await rulesService.updateRule(ruleId, updates, userId, ipAddress, userAgent);
    
    res.status(200).json({
      success: true,
      data: rule,
      message: 'Rule updated successfully'
    });

  } catch (error) {
    if (error.message === 'Rule not found or access denied') {
      return res.status(404).json({
        success: false,
        error: 'Rule not found or access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a rule
router.delete('/:ruleId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { ruleId } = req.params;
    const userId = req.query.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in query params or x-user-id header'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const rule = await rulesService.deleteRule(ruleId, userId, ipAddress, userAgent);
    
    res.status(200).json({
      success: true,
      data: rule,
      message: 'Rule deleted successfully'
    });

  } catch (error) {
    if (error.message === 'Rule not found or access denied') {
      return res.status(404).json({
        success: false,
        error: 'Rule not found or access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Evaluate rules against a message
router.post('/evaluate', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { message, user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in request body'
      });
    }

    if (!message) {
      return res.status(400).json({
        error: 'message is required',
        message: 'Please provide message in request body'
      });
    }

    const evaluation = await rulesService.evaluateRules(message, user_id);
    
    res.status(200).json({
      success: true,
      data: evaluation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get rule statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { userId } = req.params;
    
    const rules = await rulesService.getUserRules(userId);
    
    const stats = {
      total_rules: rules.length,
      active_rules: rules.filter(r => r.is_active).length,
      inactive_rules: rules.filter(r => !r.is_active).length,
      rules_by_type: rules.reduce((acc, rule) => {
        acc[rule.rule_type] = (acc[rule.rule_type] || 0) + 1;
        return acc;
      }, {}),
      rules_by_priority: rules.reduce((acc, rule) => {
        acc[rule.priority] = (acc[rule.priority] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
