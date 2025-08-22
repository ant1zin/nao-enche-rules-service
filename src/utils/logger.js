const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// JSON format for file output
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: { service: 'rules-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info'
    }),
    
    // File transports
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Separate audit log
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.headers['x-user-id'] || req.body?.user_id || req.query?.user_id
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Add audit logging function
const auditLog = (action, userId, details, ipAddress, userAgent) => {
  logger.info('Audit log', {
    action,
    userId,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

// Add security logging function
const securityLog = (event, userId, details, ipAddress, userAgent) => {
  logger.warn('Security event', {
    event,
    userId,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

// Add performance logging function
const performanceLog = (operation, duration, details = {}) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString()
  });
};

// Add error logging function
const errorLog = (error, context = {}) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Add business logic logging function
const businessLog = (action, userId, details = {}) => {
  logger.info('Business action', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Export logger and utility functions
module.exports = {
  logger,
  requestLogger,
  auditLog,
  securityLog,
  performanceLog,
  errorLog,
  businessLog
};
