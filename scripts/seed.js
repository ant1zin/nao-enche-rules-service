#!/usr/bin/env node

/**
 * Seed script for Rules Service
 * Inserts sample data for testing and development
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting Rules Service seed...');
    
    // Sample users for testing
    const sampleUsers = [
      'user-001',
      'user-002',
      'user-003',
      'test-user',
      'demo-user'
    ];
    
    // Sample privacy rules
    console.log('🔒 Creating sample privacy rules...');
    
    const sampleRules = [
      {
        user_id: 'user-001',
        rule_type: 'keyword_filter',
        rule_name: 'Block Spam Keywords',
        rule_description: 'Blocks messages containing common spam keywords',
        rule_config: {
          keywords: ['buy now', 'limited time', 'act fast', 'free money'],
          max_occurrences: 2,
          action: 'block'
        },
        priority: 1
      },
      {
        user_id: 'user-001',
        rule_type: 'url_filter',
        rule_name: 'Allow Trusted Domains',
        rule_description: 'Only allows messages from trusted domains',
        rule_config: {
          domains: ['trusted-domain.com', 'safe-site.org', 'company.com'],
          action: 'allow'
        },
        priority: 2
      },
      {
        user_id: 'user-002',
        rule_type: 'content_filter',
        rule_name: 'Content Length Limit',
        rule_description: 'Flags messages that are too long',
        rule_config: {
          filters: [
            {
              type: 'length',
              max_length: 500,
              name: 'Message Length Limit'
            }
          ],
          action: 'flag'
        },
        priority: 1
      },
      {
        user_id: 'user-002',
        rule_type: 'keyword_filter',
        rule_name: 'Block Offensive Language',
        rule_description: 'Blocks messages with offensive language',
        rule_config: {
          keywords: ['hate', 'kill', 'die', 'stupid', 'idiot'],
          max_occurrences: 1,
          action: 'block'
        },
        priority: 3
      },
      {
        user_id: 'user-003',
        rule_type: 'url_filter',
        rule_name: 'Block Suspicious URLs',
        rule_description: 'Blocks messages with suspicious URLs',
        rule_config: {
          patterns: ['http://', 'bit.ly', 'tinyurl'],
          action: 'block'
        },
        priority: 1
      },
      {
        user_id: 'test-user',
        rule_type: 'keyword_filter',
        rule_name: 'Test Rule',
        rule_description: 'A test rule for development',
        rule_config: {
          keywords: ['test', 'debug', 'development'],
          max_occurrences: 1,
          action: 'flag'
        },
        priority: 5
      }
    ];
    
    for (const rule of sampleRules) {
      await client.query(
        `INSERT INTO privacy_rules (user_id, rule_type, rule_name, rule_description, rule_config, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [rule.user_id, rule.rule_type, rule.rule_name, rule.rule_description,
         JSON.stringify(rule.rule_config), rule.priority, rule.user_id]
      );
    }
    
    console.log('✅ Sample privacy rules created successfully');
    
    // Sample audit logs
    console.log('📝 Creating sample audit logs...');
    
    const sampleAuditLogs = [
      {
        rule_id: 'rule-001',
        action: 'CREATE',
        user_id: 'user-001',
        changes: { rule_data: sampleRules[0] },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        rule_id: 'rule-002',
        action: 'UPDATE',
        user_id: 'user-001',
        changes: { priority: 'Changed from 1 to 2' },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        rule_id: 'rule-003',
        action: 'CREATE',
        user_id: 'user-002',
        changes: { rule_data: sampleRules[2] },
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    ];
    
    for (const log of sampleAuditLogs) {
      await client.query(
        `INSERT INTO rule_audit_log (rule_id, action, user_id, changes, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [log.rule_id, log.action, log.user_id, JSON.stringify(log.changes),
         log.ip_address, log.user_agent]
      );
    }
    
    console.log('✅ Sample audit logs created successfully');
    
    // Create additional threat patterns for testing
    console.log('🛡️  Creating additional threat patterns...');
    
    const additionalPatterns = [
      {
        pattern_name: 'Social Engineering',
        pattern_description: 'Detects social engineering attempts',
        pattern_type: 'social_engineering',
        pattern_config: {
          urgency_indicators: ['immediate', 'urgent', 'now', 'quick'],
          authority_claims: ['police', 'bank', 'government', 'support'],
          action: 'flag'
        },
        risk_level: 'high'
      },
      {
        pattern_name: 'Financial Scam',
        pattern_description: 'Detects financial scam attempts',
        pattern_type: 'financial_scam',
        pattern_config: {
          money_requests: true,
          investment_opportunities: true,
          lottery_claims: true,
          action: 'block'
        },
        risk_level: 'high'
      },
      {
        pattern_name: 'Bot Detection',
        pattern_description: 'Detects potential bot activity',
        pattern_type: 'bot_detection',
        pattern_config: {
          repeated_patterns: true,
          rapid_messaging: true,
          generic_responses: true,
          action: 'flag'
        },
        risk_level: 'medium'
      }
    ];
    
    for (const pattern of additionalPatterns) {
      await client.query(
        `INSERT INTO threat_patterns (pattern_name, pattern_description, pattern_type, pattern_config, risk_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (pattern_name) DO NOTHING`,
        [pattern.pattern_name, pattern.pattern_description, pattern.pattern_type,
         JSON.stringify(pattern.pattern_config), pattern.risk_level]
      );
    }
    
    console.log('✅ Additional threat patterns created successfully');
    
    // Create additional rule templates
    console.log('📋 Creating additional rule templates...');
    
    const additionalTemplates = [
      {
        template_name: 'Financial Protection',
        template_description: 'Template to protect against financial scams',
        template_category: 'financial_security',
        template_config: {
          rule_type: 'keyword_filter',
          keywords: ['investment', 'lottery', 'inheritance', 'bank transfer'],
          max_occurrences: 1,
          action: 'block'
        },
        is_public: true
      },
      {
        template_name: 'Workplace Safety',
        template_description: 'Template for workplace communication safety',
        template_category: 'workplace',
        template_config: {
          rule_type: 'content_filter',
          filters: [
            {
              type: 'keyword',
              keywords: ['confidential', 'internal', 'secret'],
              name: 'Confidential Information'
            }
          ],
          action: 'flag'
        },
        is_public: true
      },
      {
        template_name: 'Child Safety',
        template_description: 'Template for protecting children online',
        template_category: 'child_protection',
        template_config: {
          rule_type: 'keyword_filter',
          keywords: ['meet', 'location', 'personal info', 'photos'],
          max_occurrences: 1,
          action: 'block'
        },
        is_public: true
      }
    ];
    
    for (const template of additionalTemplates) {
      await client.query(
        `INSERT INTO rule_templates (template_name, template_description, template_category, template_config, is_public)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (template_name) DO NOTHING`,
        [template.template_name, template.template_description, template.template_category,
         JSON.stringify(template.template_config), template.is_public]
      );
    }
    
    console.log('✅ Additional rule templates created successfully');
    
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📊 Sample data created:');
    console.log(`  - ${sampleRules.length} privacy rules`);
    console.log(`  - ${sampleAuditLogs.length} audit logs`);
    console.log(`  - ${additionalPatterns.length} additional threat patterns`);
    console.log(`  - ${additionalTemplates.length} additional rule templates`);
    console.log('');
    console.log('🧪 You can now test the Rules Service with this sample data');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seed };

