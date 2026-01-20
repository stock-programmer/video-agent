/**
 * Custom Error Types for v2.0 Multi-Agent System
 *
 * Provides structured error classes with HTTP status codes,
 * error codes, and additional context for debugging.
 *
 * All errors extend AppError base class for consistent handling.
 */

/**
 * Base Application Error
 * @class AppError
 * @extends Error
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code for client identification
   * @param {object} details - Additional error details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguish operational vs programming errors

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for API response
   * @returns {object}
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Validation Error (400)
 * Used for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource, identifier, details = {}) {
    const message = `${resource} not found: ${identifier}`;
    super(message, 404, 'NOT_FOUND', { resource, identifier, ...details });
  }
}

/**
 * External API Error (502)
 * Used when third-party API calls fail
 */
export class ExternalAPIError extends AppError {
  constructor(provider, operation, originalError, details = {}) {
    const message = `External API error (${provider}): ${operation} failed`;
    super(message, 502, 'EXTERNAL_API_ERROR', {
      provider,
      operation,
      originalError: originalError?.message || String(originalError),
      ...details
    });
    this.originalError = originalError;
  }
}

/**
 * Agent Execution Error (500)
 * Used when agent execution fails (Intent, Video, Master agents)
 */
export class AgentExecutionError extends AppError {
  constructor(agentType, stage, originalError, details = {}) {
    const message = `Agent execution failed (${agentType}): ${stage}`;
    super(message, 500, 'AGENT_EXECUTION_ERROR', {
      agentType,
      stage,
      originalError: originalError?.message || String(originalError),
      ...details
    });
    this.originalError = originalError;
  }
}

/**
 * Timeout Error (408)
 * Used when operations exceed time limits
 */
export class TimeoutError extends AppError {
  constructor(operation, timeoutMs, details = {}) {
    const message = `Operation timeout: ${operation} exceeded ${timeoutMs}ms`;
    super(message, 408, 'TIMEOUT_ERROR', {
      operation,
      timeoutMs,
      ...details
    });
  }
}

/**
 * Human Loop Error (400)
 * Used when Human-in-the-Loop confirmation fails or times out
 */
export class HumanLoopError extends AppError {
  constructor(reason, workspaceId, details = {}) {
    const message = `Human-in-the-Loop error: ${reason}`;
    super(message, 400, 'HUMAN_LOOP_ERROR', {
      reason,
      workspaceId,
      ...details
    });
  }
}

/**
 * Check if error is an operational error (expected/handled)
 * @param {Error} error
 * @returns {boolean}
 */
export function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
