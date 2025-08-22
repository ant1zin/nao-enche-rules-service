const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class RulesService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/rules.log' })
      ]
    });
  }

  // ===== PRIVACY RULES MANAGEMENT =====

  async createRule(ruleData, userId, ipAddress, userAgent) {
    try {
      const ruleId = uuidv4();
      const { rule_type, rule_name, rule_description, rule_config, priority } = ruleData;

      const query = `
        INSERT INTO privacy_rules (id, user_id, rule_type, rule_name, rule_description, rule_config, priority, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await this.databaseService.query(query, [
        ruleId, userId, rule_type, rule_name, rule_description, 
        JSON.stringify(rule_config), priority || 1, userId
      ]);

      // Log audit
      await this.logAudit(ruleId, 'CREATE', userId, { rule_data: ruleData }, ipAddress, userAgent);

      this.logger.info('Privacy rule created successfully', { ruleId, userId, rule_type });
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to create privacy rule:', error);
      throw error;
    }
  }

  async getRule(ruleId, userId) {
    try {
      const query = `
        SELECT * FROM privacy_rules 
        WHERE id = $1 AND user_id = $2
      `;

      const result = await this.databaseService.query(query, [ruleId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Rule not found');
      }

      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to get privacy rule:', error);
      throw error;
    }
  }

  async getUserRules(userId, filters = {}) {
    try {
      let query = `
        SELECT * FROM privacy_rules 
        WHERE user_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;

      if (filters.rule_type) {
        query += ` AND rule_type = $${paramIndex}`;
        params.push(filters.rule_type);
        paramIndex++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(filters.is_active);
        paramIndex++;
      }

      query += ` ORDER BY priority DESC, created_at DESC`;

      const result = await this.databaseService.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get user rules:', error);
      throw error;
    }
  }

  async updateRule(ruleId, updates, userId, ipAddress, userAgent) {
    try {
      const { rule_name, rule_description, rule_config, priority, is_active } = updates;
      
      const query = `
        UPDATE privacy_rules 
        SET rule_name = COALESCE($1, rule_name),
            rule_description = COALESCE($2, rule_description),
            rule_config = COALESCE($3, rule_config),
            priority = COALESCE($4, priority),
            is_active = COALESCE($5, is_active),
            updated_at = NOW(),
            updated_by = $6
        WHERE id = $7 AND user_id = $8
        RETURNING *
      `;

      const result = await this.databaseService.query(query, [
        rule_name, rule_description, 
        rule_config ? JSON.stringify(rule_config) : null,
        priority, is_active, userId, ruleId, userId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Rule not found or access denied');
      }

      // Log audit
      await this.logAudit(ruleId, 'UPDATE', userId, { updates }, ipAddress, userAgent);

      this.logger.info('Privacy rule updated successfully', { ruleId, userId });
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to update privacy rule:', error);
      throw error;
    }
  }

  async deleteRule(ruleId, userId, ipAddress, userAgent) {
    try {
      const query = `
        DELETE FROM privacy_rules 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await this.databaseService.query(query, [ruleId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Rule not found or access denied');
      }

      // Log audit
      await this.logAudit(ruleId, 'DELETE', userId, { deleted_rule: result.rows[0] }, ipAddress, userAgent);

      this.logger.info('Privacy rule deleted successfully', { ruleId, userId });
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to delete privacy rule:', error);
      throw error;
    }
  }

  // ===== THREAT PATTERNS MANAGEMENT =====

  async getThreatPatterns(filters = {}) {
    try {
      let query = `
        SELECT * FROM threat_patterns 
        WHERE is_active = true
      `;
      
      const params = [];
      let paramIndex = 1;

      if (filters.pattern_type) {
        query += ` AND pattern_type = $${paramIndex}`;
        params.push(filters.pattern_type);
        paramIndex++;
      }

      if (filters.risk_level) {
        query += ` AND risk_level = $${paramIndex}`;
        params.push(filters.risk_level);
        paramIndex++;
      }

      query += ` ORDER BY risk_level DESC, pattern_name ASC`;

      const result = await this.databaseService.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get threat patterns:', error);
      throw error;
    }
  }

  async createThreatPattern(patternData, userId) {
    try {
      const patternId = uuidv4();
      const { pattern_name, pattern_description, pattern_type, pattern_config, risk_level } = patternData;

      const query = `
        INSERT INTO threat_patterns (id, pattern_name, pattern_description, pattern_type, pattern_config, risk_level)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await this.databaseService.query(query, [
        patternId, pattern_name, pattern_description, pattern_type,
        JSON.stringify(pattern_config), risk_level || 'medium'
      ]);

      this.logger.info('Threat pattern created successfully', { patternId, pattern_type });
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to create threat pattern:', error);
      throw error;
    }
  }

  // ===== RULE TEMPLATES MANAGEMENT =====

  async getRuleTemplates(category = null, isPublic = true) {
    try {
      let query = `
        SELECT * FROM rule_templates 
        WHERE is_public = $1
      `;
      
      const params = [isPublic];

      if (category) {
        query += ` AND template_category = $2`;
        params.push(category);
      }

      query += ` ORDER BY template_category, template_name`;

      const result = await this.databaseService.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get rule templates:', error);
      throw error;
    }
  }

  async createRuleFromTemplate(templateId, userId, customizations = {}) {
    try {
      // Get template
      const templateQuery = `
        SELECT * FROM rule_templates WHERE id = $1 AND is_public = true
      `;
      
      const templateResult = await this.databaseService.query(templateQuery, [templateId]);
      
      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = templateResult.rows[0];
      
      // Merge template config with customizations
      const ruleConfig = { ...template.template_config, ...customizations };
      
      // Create rule from template
      const ruleData = {
        rule_type: template.template_config.rule_type || 'custom',
        rule_name: customizations.rule_name || template.template_name,
        rule_description: customizations.rule_description || template.template_description,
        rule_config: ruleConfig,
        priority: customizations.priority || 1
      };

      return await this.createRule(ruleData, userId);

    } catch (error) {
      this.logger.error('Failed to create rule from template:', error);
      throw error;
    }
  }

  // ===== RULE VALIDATION =====

  async validateRule(ruleConfig) {
    try {
      const errors = [];

      // Basic validation
      if (!ruleConfig.rule_type) {
        errors.push('Rule type is required');
      }

      if (!ruleConfig.rule_name) {
        errors.push('Rule name is required');
      }

      if (!ruleConfig.rule_config) {
        errors.push('Rule configuration is required');
      }

      // Specific validation based on rule type
      switch (ruleConfig.rule_type) {
        case 'keyword_filter':
          if (!ruleConfig.rule_config.keywords || !Array.isArray(ruleConfig.rule_config.keywords)) {
            errors.push('Keywords array is required for keyword_filter rule type');
          }
          break;
        
        case 'url_filter':
          if (!ruleConfig.rule_config.domains && !ruleConfig.rule_config.patterns) {
            errors.push('Domains or patterns are required for url_filter rule type');
          }
          break;
        
        case 'content_filter':
          if (!ruleConfig.rule_config.filters || !Array.isArray(ruleConfig.rule_config.filters)) {
            errors.push('Filters array is required for content_filter rule type');
          }
          break;
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      this.logger.error('Rule validation failed:', error);
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  // ===== AUDIT LOGGING =====

  async logAudit(ruleId, action, userId, changes, ipAddress, userAgent) {
    try {
      const query = `
        INSERT INTO rule_audit_log (rule_id, action, user_id, changes, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.databaseService.query(query, [
        ruleId, action, userId, JSON.stringify(changes), ipAddress, userAgent
      ]);

    } catch (error) {
      this.logger.error('Failed to log audit:', error);
      // Don't throw error here as audit logging failure shouldn't break the main operation
    }
  }

  async getAuditLog(ruleId = null, userId = null, limit = 100) {
    try {
      let query = `
        SELECT * FROM rule_audit_log 
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (ruleId) {
        query += ` AND rule_id = $${paramIndex}`;
        params.push(ruleId);
        paramIndex++;
      }

      if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.databaseService.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get audit log:', error);
      throw error;
    }
  }

  // ===== RULE EXECUTION =====

  async evaluateRules(message, userId) {
    try {
      // Get user's active rules
      const rules = await this.getUserRules(userId, { is_active: true });
      
      const results = [];
      
      for (const rule of rules) {
        try {
          const evaluation = await this.evaluateRule(rule, message);
          results.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            rule_type: rule.rule_type,
            action: evaluation.action,
            reason: evaluation.reason,
            matched: evaluation.matched
          });
        } catch (error) {
          this.logger.error(`Failed to evaluate rule ${rule.id}:`, error);
          results.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            rule_type: rule.rule_type,
            action: 'allow', // Default to allow on error
            reason: 'Rule evaluation failed',
            matched: false,
            error: error.message
          });
        }
      }

      // Determine final action based on rule priority
      const blockingRules = results.filter(r => r.action === 'block' && r.matched);
      const finalAction = blockingRules.length > 0 ? 'block' : 'allow';
      
      return {
        final_action: finalAction,
        rule_evaluations: results,
        blocking_rules: blockingRules
      };

    } catch (error) {
      this.logger.error('Failed to evaluate rules:', error);
      throw error;
    }
  }

  async evaluateRule(rule, message) {
    try {
      const config = rule.rule_config;
      
      switch (rule.rule_type) {
        case 'keyword_filter':
          return this.evaluateKeywordFilter(config, message);
        
        case 'url_filter':
          return this.evaluateUrlFilter(config, message);
        
        case 'content_filter':
          return this.evaluateContentFilter(config, message);
        
        default:
          return { action: 'allow', reason: 'Unknown rule type', matched: false };
      }

    } catch (error) {
      this.logger.error(`Rule evaluation failed for rule ${rule.id}:`, error);
      return { action: 'allow', reason: 'Evaluation error', matched: false };
    }
  }

  evaluateKeywordFilter(config, message) {
    const { keywords, max_occurrences = 1, action = 'block' } = config;
    const text = message.text || message.content || '';
    const lowerText = text.toLowerCase();
    
    let matchCount = 0;
    const matchedKeywords = [];
    
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = text.match(regex);
      if (matches) {
        matchCount += matches.length;
        matchedKeywords.push(keyword);
      }
    }
    
    const matched = matchCount >= max_occurrences;
    
    return {
      action: matched ? action : 'allow',
      reason: matched ? `Matched ${matchCount} keywords: ${matchedKeywords.join(', ')}` : 'No keyword matches',
      matched
    };
  }

  evaluateUrlFilter(config, message) {
    const { domains, patterns, action = 'block' } = config;
    const urls = this.extractUrls(message.text || message.content || '');
    
    if (urls.length === 0) {
      return { action: 'allow', reason: 'No URLs found', matched: false };
    }
    
    for (const url of urls) {
      // Check domain restrictions
      if (domains && domains.length > 0) {
        const urlDomain = this.extractDomain(url);
        if (domains.some(domain => urlDomain.includes(domain))) {
          return { action: 'allow', reason: `Domain allowed: ${urlDomain}`, matched: false };
        }
      }
      
      // Check pattern restrictions
      if (patterns && patterns.length > 0) {
        for (const pattern of patterns) {
          if (url.match(pattern)) {
            return { action: action, reason: `URL matched pattern: ${pattern}`, matched: true };
          }
        }
      }
    }
    
    return { action: 'allow', reason: 'No URL restrictions matched', matched: false };
  }

  evaluateContentFilter(config, message) {
    const { filters, action = 'block' } = config;
    const text = message.text || message.content || '';
    
    for (const filter of filters) {
      if (filter.type === 'regex' && text.match(filter.pattern)) {
        return { action: action, reason: `Content matched filter: ${filter.name}`, matched: true };
      }
      
      if (filter.type === 'length' && text.length > filter.max_length) {
        return { action: action, reason: `Content too long: ${text.length} > ${filter.max_length}`, matched: true };
      }
    }
    
    return { action: 'allow', reason: 'No content filters matched', matched: false };
  }

  extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }
}

module.exports = RulesService;
