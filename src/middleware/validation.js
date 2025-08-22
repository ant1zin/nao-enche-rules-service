const Joi = require('joi');

// Validation schemas
const ruleSchema = Joi.object({
  rule_type: Joi.string().required().valid('keyword_filter', 'url_filter', 'content_filter', 'custom'),
  rule_name: Joi.string().required().min(1).max(255),
  rule_description: Joi.string().optional().max(1000),
  rule_config: Joi.object().required(),
  priority: Joi.number().integer().min(1).max(10).default(1),
  user_id: Joi.string().required()
});

const ruleUpdateSchema = Joi.object({
  rule_name: Joi.string().optional().min(1).max(255),
  rule_description: Joi.string().optional().max(1000),
  rule_config: Joi.object().optional(),
  priority: Joi.number().integer().min(1).max(10).optional(),
  is_active: Joi.boolean().optional(),
  user_id: Joi.string().required()
});

const messageEvaluationSchema = Joi.object({
  message: Joi.object({
    text: Joi.string().optional(),
    content: Joi.string().optional(),
    sender: Joi.string().optional(),
    channel: Joi.string().optional(),
    timestamp: Joi.date().optional()
  }).required(),
  user_id: Joi.string().required()
});

const threatPatternSchema = Joi.object({
  pattern_name: Joi.string().required().min(1).max(255),
  pattern_description: Joi.string().optional().max(1000),
  pattern_type: Joi.string().required().valid('spam', 'phishing', 'malware', 'custom'),
  pattern_config: Joi.object().required(),
  risk_level: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
});

// Validation middleware functions
const validateRule = (req, res, next) => {
  const { error, value } = ruleSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.validatedData = value;
  next();
};

const validateRuleUpdate = (req, res, next) => {
  const { error, value } = ruleUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.validatedData = value;
  next();
};

const validateMessageEvaluation = (req, res, next) => {
  const { error, value } = messageEvaluationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.validatedData = value;
  next();
};

const validateThreatPattern = (req, res, next) => {
  const { error, value } = threatPatternSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.validatedData = value;
  next();
};

// Query parameter validation
const validateQueryParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details.map(detail => detail.message)
      });
    }
    
    req.validatedQuery = value;
    next();
  };
};

// URL parameter validation
const validateUrlParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL parameters',
        details: error.details.map(detail => detail.message)
      });
    }
    
    req.validatedParams = value;
    next();
  };
};

// Common validation schemas
const userIdParamSchema = Joi.object({
  userId: Joi.string().required()
});

const ruleIdParamSchema = Joi.object({
  ruleId: Joi.string().required()
});

const filtersQuerySchema = Joi.object({
  rule_type: Joi.string().optional(),
  is_active: Joi.string().valid('true', 'false').optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

module.exports = {
  validateRule,
  validateRuleUpdate,
  validateMessageEvaluation,
  validateThreatPattern,
  validateQueryParams,
  validateUrlParams,
  userIdParamSchema,
  ruleIdParamSchema,
  filtersQuerySchema
};
