import winston from 'winston';
import path from 'path';

/**
 * Enhanced Logger for v2.0 Multi-Agent System
 *
 * Features:
 * - Structured JSON logging for production
 * - Human-readable console output for development
 * - Agent-specific logging methods
 * - Request/response logging helpers
 * - Automatic metadata enrichment
 */

/**
 * Safe JSON stringify that handles circular references
 * @param {any} obj - Object to stringify
 * @returns {string} JSON string
 */
function safeStringify(obj) {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    // Handle undefined
    if (value === undefined) {
      return '[undefined]';
    }

    // Handle functions
    if (typeof value === 'function') {
      return '[Function]';
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    return value;
  });
}

// Human-readable format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `[${timestamp}] ${level}: ${message}`;

    // Append metadata if present
    if (Object.keys(metadata).length > 0) {
      try {
        log += ` ${safeStringify(metadata)}`;
      } catch (error) {
        log += ` [Failed to serialize metadata: ${error.message}]`;
      }
    }

    // Append stack trace if present
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Structured JSON format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'video-maker-backend',
    version: '2.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Agent-specific log file for v2.0
    new winston.transports.File({
      filename: 'logs/agents.log',
      level: 'info',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// ============================================================
// Agent-specific Logging Methods (v2.0)
// ============================================================

/**
 * Log agent execution start
 * @param {string} agentType - Agent type (intent|video|master)
 * @param {string} workspaceId - Workspace ID
 * @param {object} metadata - Additional metadata
 */
logger.logAgentStart = function (agentType, workspaceId, metadata = {}) {
  this.info(`Agent execution started`, {
    agentType,
    workspace_id: workspaceId,
    stage: 'start',
    ...metadata
  });
};

/**
 * Log agent execution completion
 * @param {string} agentType - Agent type
 * @param {string} workspaceId - Workspace ID
 * @param {number} duration - Execution duration in ms
 * @param {object} metadata - Additional metadata
 */
logger.logAgentComplete = function (agentType, workspaceId, duration, metadata = {}) {
  this.info(`Agent execution completed`, {
    agentType,
    workspace_id: workspaceId,
    stage: 'complete',
    duration: `${duration}ms`,
    ...metadata
  });
};

/**
 * Log agent execution error
 * @param {string} agentType - Agent type
 * @param {string} workspaceId - Workspace ID
 * @param {Error} error - Error object
 * @param {object} metadata - Additional metadata
 */
logger.logAgentError = function (agentType, workspaceId, error, metadata = {}) {
  this.error(`Agent execution failed`, {
    agentType,
    workspace_id: workspaceId,
    stage: 'error',
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

/**
 * Log Human-in-the-Loop interaction
 * @param {string} event - Event type (request|confirm|reject|timeout)
 * @param {string} workspaceId - Workspace ID
 * @param {object} metadata - Additional metadata
 */
logger.logHumanLoop = function (event, workspaceId, metadata = {}) {
  this.info(`Human-in-the-Loop: ${event}`, {
    event,
    workspace_id: workspaceId,
    ...metadata
  });
};

// ============================================================
// Request/Response Logging Helpers
// ============================================================

/**
 * Log external API request
 * @param {string} provider - API provider (qwen|gemini)
 * @param {string} endpoint - API endpoint
 * @param {object} params - Request parameters (sanitized)
 */
logger.logAPIRequest = function (provider, endpoint, params = {}) {
  this.debug(`External API request`, {
    provider,
    endpoint,
    params: this.sanitizeParams(params)
  });
};

/**
 * Log external API response
 * @param {string} provider - API provider
 * @param {string} endpoint - API endpoint
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in ms
 * @param {object} metadata - Additional metadata
 */
logger.logAPIResponse = function (provider, endpoint, statusCode, duration, metadata = {}) {
  this.debug(`External API response`, {
    provider,
    endpoint,
    statusCode,
    duration: `${duration}ms`,
    ...metadata
  });
};

/**
 * Log external API error
 * @param {string} provider - API provider
 * @param {string} endpoint - API endpoint
 * @param {Error} error - Error object
 * @param {object} metadata - Additional metadata
 */
logger.logAPIError = function (provider, endpoint, error, metadata = {}) {
  this.error(`External API error`, {
    provider,
    endpoint,
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

// ============================================================
// Utility Methods
// ============================================================

/**
 * Sanitize parameters for logging (remove sensitive data)
 * @param {object} params - Parameters to sanitize
 * @returns {object} Sanitized parameters
 */
logger.sanitizeParams = function (params) {
  const sensitiveKeys = ['api_key', 'apikey', 'token', 'password', 'secret'];
  const sanitized = { ...params };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
};

export default logger;
