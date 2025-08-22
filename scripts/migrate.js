#!/usr/bin/env node

/**
 * Migration script for Rules Service
 * Creates database tables and inserts initial data
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Rules Service migration...');
    
    // Create extensions
    console.log('📦 Creating extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create tables
    console.log('🗄️  Creating tables...');
    
    const createTablesQuery = `
      -- Create privacy_rules table
      CREATE TABLE IF NOT EXISTS privacy_rules (
        id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
        user_id VARCHAR(255) NOT NULL,
        rule_type VARCHAR(100) NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        rule_description TEXT,
        rule_config JSONB NOT NULL,
        priority INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(255),
        updated_by VARCHAR(255)
      );

      -- Create threat_patterns table
      CREATE TABLE IF NOT EXISTS threat_patterns (
        id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
        pattern_name VARCHAR(255) NOT NULL,
        pattern_description TEXT,
        pattern_type VARCHAR(100) NOT NULL,
        pattern_config JSONB NOT NULL,
        risk_level VARCHAR(50) DEFAULT 'medium',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create rule_templates table
      CREATE TABLE IF NOT EXISTS rule_templates (
        id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
        template_name VARCHAR(255) NOT NULL,
        template_description TEXT,
        template_category VARCHAR(100) NOT NULL,
        template_config JSONB NOT NULL,
        is_public BOOLEAN DEFAULT false,
        created_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create rule_audit_log table
      CREATE TABLE IF NOT EXISTS rule_audit_log (
        id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
        rule_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        changes JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    await client.query(createTablesQuery);
    console.log('✅ Tables created successfully');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_privacy_rules_user_id ON privacy_rules(user_id);
      CREATE INDEX IF NOT EXISTS idx_privacy_rules_rule_type ON privacy_rules(rule_type);
      CREATE INDEX IF NOT EXISTS idx_privacy_rules_is_active ON privacy_rules(is_active);
      CREATE INDEX IF NOT EXISTS idx_threat_patterns_pattern_type ON threat_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_threat_patterns_risk_level ON threat_patterns(risk_level);
      CREATE INDEX IF NOT EXISTS idx_rule_templates_category ON rule_templates(template_category);
      CREATE INDEX IF NOT EXISTS idx_rule_audit_log_rule_id ON rule_audit_log(rule_id);
      CREATE INDEX IF NOT EXISTS idx_rule_audit_log_created_at ON rule_audit_log(created_at);
    `;
    
    await client.query(createIndexesQuery);
    console.log('✅ Indexes created successfully');
    
    // Insert default threat patterns
    console.log('🛡️  Inserting default threat patterns...');
    
    const defaultPatterns = [
      {
        pattern_name: 'Spam Detection',
        pattern_description: 'Detects common spam patterns in messages',
        pattern_type: 'spam',
        pattern_config: {
          keywords: ['buy now', 'limited time', 'act fast', 'free money', 'click here', 'make money fast'],
          max_occurrences: 3,
          action: 'block'
        },
        risk_level: 'low'
      },
      {
        pattern_name: 'Phishing Attempt',
        pattern_description: 'Detects potential phishing attempts',
        pattern_type: 'phishing',
        pattern_config: {
          suspicious_urls: true,
          urgent_language: true,
          personal_info_request: true,
          action: 'block'
        },
        risk_level: 'high'
      },
      {
        pattern_name: 'Malware Link',
        pattern_description: 'Detects suspicious file downloads and links',
        pattern_type: 'malware',
        pattern_config: {
          file_extensions: ['.exe', '.bat', '.scr', '.vbs', '.com', '.pif'],
          suspicious_domains: true,
          action: 'block'
        },
        risk_level: 'high'
      },
      {
        pattern_name: 'Harassment Detection',
        pattern_description: 'Detects potential harassment or abusive content',
        pattern_type: 'harassment',
        pattern_config: {
          offensive_words: ['hate', 'kill', 'die', 'stupid', 'idiot'],
          repeated_messages: true,
          action: 'flag'
        },
        risk_level: 'medium'
      },
      {
        pattern_name: 'Personal Information',
        pattern_description: 'Detects attempts to extract personal information',
        pattern_type: 'personal_info',
        pattern_config: {
          patterns: [
            '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN pattern
            '\\b\\d{4}\\s\\d{4}\\s\\d{4}\\s\\d{4}\\b', // Credit card
            '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b' // Email
          ],
          action: 'flag'
        },
        risk_level: 'medium'
      }
    ];
    
    for (const pattern of defaultPatterns) {
      await client.query(
        `INSERT INTO threat_patterns (pattern_name, pattern_description, pattern_type, pattern_config, risk_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (pattern_name) DO NOTHING`,
        [pattern.pattern_name, pattern.pattern_description, pattern.pattern_type, 
         JSON.stringify(pattern.pattern_config), pattern.risk_level]
      );
    }
    
    console.log('✅ Default threat patterns inserted successfully');
    
    // Insert default rule templates
    console.log('📋 Inserting default rule templates...');
    
    const defaultTemplates = [
      {
        template_name: 'Basic Spam Filter',
        template_description: 'Basic template to filter common spam messages',
        template_category: 'spam_protection',
        template_config: {
          rule_type: 'keyword_filter',
          keywords: ['buy now', 'limited time', 'act fast'],
          max_occurrences: 2,
          action: 'block'
        },
        is_public: true
      },
      {
        template_name: 'URL Safety Check',
        template_description: 'Template to check URLs for safety',
        template_category: 'security',
        template_config: {
          rule_type: 'url_filter',
          domains: ['trusted-domain.com', 'safe-site.org'],
          patterns: ['https://'],
          action: 'allow'
        },
        is_public: true
      },
      {
        template_name: 'Content Length Limit',
        template_description: 'Template to limit message content length',
        template_category: 'content_control',
        template_config: {
          rule_type: 'content_filter',
          filters: [
            {
              type: 'length',
              max_length: 1000,
              name: 'Message Length Limit'
            }
          ],
          action: 'flag'
        },
        is_public: true
      }
    ];
    
    for (const template of defaultTemplates) {
      await client.query(
        `INSERT INTO rule_templates (template_name, template_description, template_category, template_config, is_public)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (template_name) DO NOTHING`,
        [template.template_name, template.template_description, template.template_category,
         JSON.stringify(template.template_config), template.is_public]
      );
    }
    
    console.log('✅ Default rule templates inserted successfully');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
