/**
 * Error Handling Middleware for Express
 *
 * Provides:
 * - Global error handler
 * - Request/response logging
 * - 404 handler
 * - Error response formatting
 */

import logger from './logger.js';
import { AppError, isOperationalError } from './error-types.js';

/**
 * Request/Response Logging Middleware
 * Logs all incoming requests and outgoing responses
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Intercept response to log when finished
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * 404 Not Found Handler
 * Must be placed after all route handlers
 */
export function notFoundHandler(req, res, next) {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    query: req.query
  });

  res.status(404).json({
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.path}`,
    code: 'ROUTE_NOT_FOUND',
    path: req.path
  });
}

/**
 * Global Error Handler
 * Catches all errors and formats response
 * Must be placed after all other middleware
 */
export function globalErrorHandler(err, req, res, next) {
  // Log error
  if (isOperationalError(err)) {
    logger.warn('Operational error', {
      error: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
      path: req.path,
      method: req.method
    });
  } else {
    logger.error('Unexpected error', {
      error: err.name || 'Error',
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {})
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: `Invalid ${err.kind}: ${err.value}`,
      code: 'INVALID_ID',
      details: { field: err.path, value: err.value }
    });
  }

  // Handle Multer errors (file upload)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'UploadError',
      message: err.message,
      code: 'FILE_UPLOAD_ERROR',
      details: { field: err.field }
    });
  }

  // Default error response (hide details in production)
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.statusCode || 500).json({
    error: err.name || 'InternalServerError',
    message: isDevelopment ? err.message : 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && err.stack && { stack: err.stack })
  });
}

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Send success response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data
  });
}

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {Error|AppError} error - Error object
 */
export function sendError(res, error) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  res.status(500).json({
    error: error.name || 'Error',
    message: error.message,
    code: 'INTERNAL_ERROR'
  });
}
