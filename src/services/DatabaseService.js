const { Pool } = require('pg');
const winston = require('winston');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/database.log' })
      ]
    });
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.logger.info('Database connected successfully');
      
      // Initialize tables if they don't exist
      await this.initializeTables();
      
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database disconnected');
    }
  }

  async initializeTables() {
    try {
      const createTablesQuery = `
        -- Create extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
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

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_privacy_rules_user_id ON privacy_rules(user_id);
        CREATE INDEX IF NOT EXISTS idx_privacy_rules_rule_type ON privacy_rules(rule_type);
        CREATE INDEX IF NOT EXISTS idx_privacy_rules_is_active ON privacy_rules(is_active);
        CREATE INDEX IF NOT EXISTS idx_threat_patterns_pattern_type ON threat_patterns(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_threat_patterns_risk_level ON threat_patterns(risk_level);
        CREATE INDEX IF NOT EXISTS idx_rule_templates_category ON rule_templates(template_category);
        CREATE INDEX IF NOT EXISTS idx_rule_audit_log_rule_id ON rule_audit_log(rule_id);
        CREATE INDEX IF NOT EXISTS idx_rule_audit_log_created_at ON rule_audit_log(created_at);
      `;

      await this.pool.query(createTablesQuery);
      this.logger.info('Database tables initialized successfully');

      // Insert default threat patterns
      await this.insertDefaultThreatPatterns();
      
    } catch (error) {
      this.logger.error('Failed to initialize tables:', error);
      throw error;
    }
  }

  async insertDefaultThreatPatterns() {
    try {
      const defaultPatterns = [
        {
          pattern_name: 'Spam Detection',
          pattern_description: 'Detects common spam patterns in messages',
          pattern_type: 'spam',
          pattern_config: {
            keywords: ['buy now', 'limited time', 'act fast', 'free money'],
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
            file_extensions: ['.exe', '.bat', '.scr', '.vbs'],
            suspicious_domains: true,
            action: 'block'
          },
          risk_level: 'high'
        }
      ];

      for (const pattern of defaultPatterns) {
        await this.pool.query(
          `INSERT INTO threat_patterns (pattern_name, pattern_description, pattern_type, pattern_config, risk_level)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (pattern_name) DO NOTHING`,
          [pattern.pattern_name, pattern.pattern_description, pattern.pattern_type, 
           JSON.stringify(pattern.pattern_config), pattern.risk_level]
        );
      }

      this.logger.info('Default threat patterns inserted successfully');
      
    } catch (error) {
      this.logger.error('Failed to insert default threat patterns:', error);
      // Don't throw error here as it's not critical
    }
  }

  async query(text, params) {
    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug('Executed query', { text, duration, rows: result.rowCount });
      
      return result;
    } catch (error) {
      this.logger.error('Query execution failed:', { text, params, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseService;
