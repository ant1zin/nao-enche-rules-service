const express = require('express');
const router = express.Router();

// Get all rule templates
router.get('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    
    const category = req.query.category;
    const isPublic = req.query.public !== 'false'; // Default to true
    
    const templates = await rulesService.getRuleTemplates(category, isPublic);
    
    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
      filters: { category, public: isPublic }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a specific rule template
router.get('/:templateId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { templateId } = req.params;
    
    // Get all templates and find the specific one
    const templates = await rulesService.getRuleTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Rule template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: template
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new rule template (admin only)
router.post('/', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const templateData = req.body;
    
    // Check if user has admin privileges
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const userId = req.headers['x-user-id'] || 'system';
    
    // For now, we'll use a simple approach since createRuleTemplate isn't implemented yet
    // You can extend the RulesService to include this method
    res.status(501).json({
      success: false,
      error: 'Create rule template not implemented yet'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a rule from a template
router.post('/:templateId/create-rule', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { templateId } = req.params;
    const customizations = req.body;
    const userId = req.body.user_id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
        message: 'Please provide user_id in request body or x-user-id header'
      });
    }
    
    const rule = await rulesService.createRuleFromTemplate(templateId, userId, customizations);
    
    res.status(201).json({
      success: true,
      data: rule,
      message: 'Rule created from template successfully'
    });

  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get templates by category
router.get('/category/:category', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { category } = req.params;
    
    const templates = await rulesService.getRuleTemplates(category);
    
    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
      category
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get public templates only
router.get('/public/all', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    
    const templates = await rulesService.getRuleTemplates(null, true);
    
    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
      visibility: 'public'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get private templates for a user
router.get('/private/:userId', async (req, res) => {
  try {
    const rulesService = req.app.locals.rulesService;
    const { userId } = req.params;
    
    // Check if requesting user has access to these templates
    const requestingUserId = req.headers['x-user-id'];
    if (requestingUserId !== userId && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // For now, we'll use a simple approach since getPrivateTemplates isn't implemented yet
    // You can extend the RulesService to include this method
    res.status(501).json({
      success: false,
      error: 'Get private templates not implemented yet'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
