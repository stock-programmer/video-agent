import { jest } from '@jest/globals';

// Import error types
const {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalAPIError,
  AgentExecutionError,
  TimeoutError,
  HumanLoopError,
  isOperationalError
} = await import('../error-types.js');

describe('Error Types', () => {
  describe('AppError', () => {
    it('should create base error with default values', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.details).toEqual({});
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_CODE', { foo: 'bar' });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ foo: 'bar' });
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 404, 'NOT_FOUND', { resource: 'workspace' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'AppError',
        message: 'Test error',
        code: 'NOT_FOUND',
        statusCode: 404,
        details: { resource: 'workspace' }
      });
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toContain('AppError');
      expect(error.stack).toContain('Test error');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct defaults', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource info', () => {
      const error = new NotFoundError('Workspace', 'workspace-123');

      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Workspace not found: workspace-123');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({
        resource: 'Workspace',
        identifier: 'workspace-123'
      });
    });

    it('should include additional details', () => {
      const error = new NotFoundError('User', 'user-456', { context: 'test' });

      expect(error.details).toEqual({
        resource: 'User',
        identifier: 'user-456',
        context: 'test'
      });
    });
  });

  describe('ExternalAPIError', () => {
    it('should create external API error', () => {
      const originalError = new Error('Connection timeout');
      const error = new ExternalAPIError('qwen', 'generateVideo', originalError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('ExternalAPIError');
      expect(error.message).toBe('External API error (qwen): generateVideo failed');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_API_ERROR');
      expect(error.details.provider).toBe('qwen');
      expect(error.details.operation).toBe('generateVideo');
      expect(error.details.originalError).toBe('Connection timeout');
      expect(error.originalError).toBe(originalError);
    });

    it('should handle non-Error original error', () => {
      const error = new ExternalAPIError('gemini', 'suggest', 'String error');

      expect(error.details.originalError).toBe('String error');
    });

    it('should include additional details', () => {
      const error = new ExternalAPIError('qwen', 'poll', new Error('Failed'), { taskId: '123' });

      expect(error.details.taskId).toBe('123');
    });
  });

  describe('AgentExecutionError', () => {
    it('should create agent execution error', () => {
      const originalError = new Error('Parse failed');
      const error = new AgentExecutionError('intent', 'parsing', originalError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('AgentExecutionError');
      expect(error.message).toBe('Agent execution failed (intent): parsing');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('AGENT_EXECUTION_ERROR');
      expect(error.details.agentType).toBe('intent');
      expect(error.details.stage).toBe('parsing');
      expect(error.details.originalError).toBe('Parse failed');
      expect(error.originalError).toBe(originalError);
    });

    it('should handle non-Error original error', () => {
      const error = new AgentExecutionError('video', 'analysis', 'Failed');

      expect(error.details.originalError).toBe('Failed');
    });

    it('should include workspace context', () => {
      const error = new AgentExecutionError(
        'master',
        'orchestration',
        new Error('Failed'),
        { workspaceId: 'ws-123' }
      );

      expect(error.details.workspaceId).toBe('ws-123');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('video generation', 30000);

      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Operation timeout: video generation exceeded 30000ms');
      expect(error.statusCode).toBe(408);
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.details.operation).toBe('video generation');
      expect(error.details.timeoutMs).toBe(30000);
    });

    it('should include additional context', () => {
      const error = new TimeoutError('API call', 5000, { endpoint: '/api/test' });

      expect(error.details.endpoint).toBe('/api/test');
    });
  });

  describe('HumanLoopError', () => {
    it('should create human loop error', () => {
      const error = new HumanLoopError('User rejected confirmation', 'ws-123');

      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('HumanLoopError');
      expect(error.message).toBe('Human-in-the-Loop error: User rejected confirmation');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('HUMAN_LOOP_ERROR');
      expect(error.details.reason).toBe('User rejected confirmation');
      expect(error.details.workspaceId).toBe('ws-123');
    });

    it('should include additional details', () => {
      const error = new HumanLoopError('Timeout', 'ws-456', { timeoutMs: 300000 });

      expect(error.details.timeoutMs).toBe(300000);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError('Test error');
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return true for ValidationError', () => {
      const error = new ValidationError('Invalid');
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return true for all custom errors', () => {
      const errors = [
        new NotFoundError('Resource', 'id'),
        new ExternalAPIError('provider', 'op', new Error()),
        new AgentExecutionError('type', 'stage', new Error()),
        new TimeoutError('op', 1000),
        new HumanLoopError('reason', 'id')
      ];

      errors.forEach(error => {
        expect(isOperationalError(error)).toBe(true);
      });
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for TypeError', () => {
      const error = new TypeError('Type error');
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isOperationalError({})).toBe(false);
      expect(isOperationalError('string')).toBe(false);
      expect(isOperationalError(null)).toBe(false);
      expect(isOperationalError(undefined)).toBe(false);
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper inheritance', () => {
      const validation = new ValidationError('Test');
      const notFound = new NotFoundError('Resource', 'id');

      expect(validation instanceof AppError).toBe(true);
      expect(validation instanceof Error).toBe(true);
      expect(notFound instanceof AppError).toBe(true);
      expect(notFound instanceof Error).toBe(true);
    });
  });
});
