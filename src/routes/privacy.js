const express = require('express');
const router = express.Router();

// Get all privacy rules for a user
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

// Get privacy rules by type
router.get('/type/:ruleType', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { ruleType } = req.params;
    const userId = req.query.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in query params or x-user-id header'
      });
    }

    const filters = {
      rule_type: ruleType,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const rules = await rulesService.getUserRules(userId, filters);
    
    res.status(200).json({
      success: true,
      data: rules,
      count: rules.length,
      rule_type: ruleType
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active privacy rules only
router.get('/active', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const userId = req.query.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in query params or x-user-id header'
      });
    }

    const rules = await rulesService.getUserRules(userId, { is_active: true });
    
    res.status(200).json({
      success: true,
      data: rules,
      count: rules.length,
      status: 'active'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get privacy rules by priority
router.get('/priority/:priority', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { priority } = req.params;
    const userId = req.query.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in query params or x-user-id header'
      });
    }

    // Get all rules and filter by priority
    const allRules = await rulesService.getUserRules(userId);
    const rules = allRules.filter(rule => rule.priority === parseInt(priority));
    
    res.status(200).json({
      success: true,
      data: rules,
      count: rules.length,
      priority: parseInt(priority)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk update privacy rules
router.put('/bulk', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { rules, user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in request body'
      });
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({
        error: 'rules array is required and must not be empty',
        message: 'Please provide an array of rules to update'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const results = [];
    const errors = [];

    for (const ruleUpdate of rules) {
      try {
        const { rule_id, updates } = ruleUpdate;
        const updatedRule = await rulesService.updateRule(rule_id, updates, user_id, ipAddress, userAgent);
        results.push(updatedRule);
      } catch (error) {
        errors.push({
          rule_id: ruleUpdate.rule_id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        updated: results,
        errors: errors
      },
      message: `Updated ${results.length} rules, ${errors.length} failed`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk delete privacy rules
router.delete('/bulk', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { rule_ids, user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required',
        message: 'Please provide user_id in request body'
      });
    }

    if (!Array.isArray(rule_ids) || rule_ids.length === 0) {
      return res.status(400).json({
        error: 'rule_ids array is required and must not be empty',
        message: 'Please provide an array of rule IDs to delete'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const results = [];
    const errors = [];

    for (const ruleId of rule_ids) {
      try {
        const deletedRule = await rulesService.deleteRule(ruleId, user_id, ipAddress, userAgent);
        results.push(deletedRule);
      } catch (error) {
        errors.push({
          rule_id: ruleId,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        deleted: results,
        errors: errors
      },
      message: `Deleted ${results.length} rules, ${errors.length} failed`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get privacy rules statistics
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
      }, {}),
      average_priority: rules.length > 0 ? 
        (rules.reduce((sum, rule) => sum + rule.priority, 0) / rules.length).toFixed(2) : 0
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

// Export privacy rules
router.get('/export/:userId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { userId } = req.params;
    const format = req.query.format || 'json';
    
    const rules = await rulesService.getUserRules(userId);
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['ID', 'Name', 'Type', 'Description', 'Priority', 'Active', 'Created At', 'Updated At'];
      const csvRows = rules.map(rule => [
        rule.id,
        rule.rule_name,
        rule.rule_type,
        rule.rule_description || '',
        rule.priority,
        rule.is_active ? 'Yes' : 'No',
        rule.created_at,
        rule.updated_at
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="privacy-rules-${userId}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="privacy-rules-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        export_date: new Date().toISOString(),
        user_id: userId,
        rules: rules
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
