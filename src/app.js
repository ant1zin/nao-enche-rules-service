const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/logger');
const { metricsMiddleware } = require('./middleware/metrics');
const RulesService = require('./services/RulesService');
const DatabaseService = require('./services/DatabaseService');

class RulesServiceApp {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3008;
    
    // Initialize services
    this.databaseService = new DatabaseService();
    this.rulesService = new RulesService(this.databaseService);
    
    // Make services available to routes
    this.app.locals.rulesService = this.rulesService;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging and metrics
    this.app.use(requestLogger);
    this.app.use(metricsMiddleware);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'rules-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  setupRoutes() {
    // Import route modules
    const healthRoutes = require('./routes/health');
    const rulesRoutes = require('./routes/rules');
    const privacyRoutes = require('./routes/privacy');
    const threatRoutes = require('./routes/threats');
    const patternRoutes = require('./routes/patterns');

    // Use routes
    this.app.use('/health', healthRoutes);
    this.app.use('/api/v1/rules', rulesRoutes);
    this.app.use('/api/v1/privacy', privacyRoutes);
    this.app.use('/api/v1/threats', threatRoutes);
    this.app.use('/api/v1/patterns', patternRoutes);

    // Default route
    this.app.get('/', (req, res) => {
      res.json({
        service: 'NÃO ENCHE Rules Service',
        version: '1.0.0',
        description: 'Privacy Rules Management Service',
        endpoints: {
          health: '/health',
          rules: '/api/v1/rules',
          privacy: '/api/v1/privacy',
          threats: '/api/v1/threats',
          patterns: '/api/v1/patterns'
        }
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Initialize database connection
      await this.databaseService.connect();
      
      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 Rules Service running on port ${this.port}`);
        logger.info(`📊 Health check: http://localhost:${this.port}/health`);
        logger.info(`📚 API docs: http://localhost:${this.port}/`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('❌ Failed to start Rules Service:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('🔄 Shutting down Rules Service...');
    
    if (this.server) {
      this.server.close(() => {
        logger.info('✅ HTTP server closed');
      });
    }

    if (this.databaseService) {
      await this.databaseService.disconnect();
      logger.info('✅ Database connection closed');
    }

    process.exit(0);
  }
}

// Start the application
const app = new RulesServiceApp();
app.start().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});

module.exports = app;
