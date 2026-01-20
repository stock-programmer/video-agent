import { jest } from '@jest/globals';
import winston from 'winston';

describe('Enhanced Logger', () => {
  let logger;

  beforeAll(async () => {
    // Import logger (it will create actual winston instance)
    const loggerModule = await import('../logger.js');
    logger = loggerModule.default;

    // Mock the underlying winston methods to avoid actual logging during tests
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent-specific Logging Methods', () => {
    describe('logAgentStart', () => {
      it('should log agent execution start', () => {
        logger.logAgentStart('intent', 'ws-123');

        expect(logger.info).toHaveBeenCalledWith(
          'Agent execution started',
          expect.objectContaining({
            agentType: 'intent',
            workspace_id: 'ws-123',
            stage: 'start'
          })
        );
      });

      it('should include additional metadata', () => {
        logger.logAgentStart('video', 'ws-456', { customField: 'value' });

        expect(logger.info).toHaveBeenCalledWith(
          'Agent execution started',
          expect.objectContaining({
            agentType: 'video',
            workspace_id: 'ws-456',
            stage: 'start',
            customField: 'value'
          })
        );
      });
    });

    describe('logAgentComplete', () => {
      it('should log agent execution completion', () => {
        logger.logAgentComplete('intent', 'ws-123', 1500);

        expect(logger.info).toHaveBeenCalledWith(
          'Agent execution completed',
          expect.objectContaining({
            agentType: 'intent',
            workspace_id: 'ws-123',
            stage: 'complete',
            duration: '1500ms'
          })
        );
      });

      it('should include result metadata', () => {
        logger.logAgentComplete('master', 'ws-789', 2500, { confidence: 0.9 });

        expect(logger.info).toHaveBeenCalledWith(
          'Agent execution completed',
          expect.objectContaining({
            agentType: 'master',
            workspace_id: 'ws-789',
            stage: 'complete',
            duration: '2500ms',
            confidence: 0.9
          })
        );
      });
    });

    describe('logAgentError', () => {
      it('should log agent execution error', () => {
        const error = new Error('Agent failed');
        logger.logAgentError('video', 'ws-123', error);

        expect(logger.error).toHaveBeenCalledWith(
          'Agent execution failed',
          expect.objectContaining({
            agentType: 'video',
            workspace_id: 'ws-123',
            stage: 'error',
            error: 'Agent failed',
            stack: expect.any(String)
          })
        );
      });

      it('should include error context', () => {
        const error = new Error('Parse failed');
        logger.logAgentError('intent', 'ws-456', error, { phase: 'parsing' });

        expect(logger.error).toHaveBeenCalledWith(
          'Agent execution failed',
          expect.objectContaining({
            agentType: 'intent',
            workspace_id: 'ws-456',
            stage: 'error',
            error: 'Parse failed',
            phase: 'parsing'
          })
        );
      });
    });

    describe('logHumanLoop', () => {
      it('should log human loop request', () => {
        logger.logHumanLoop('request', 'ws-123');

        expect(logger.info).toHaveBeenCalledWith(
          'Human-in-the-Loop: request',
          expect.objectContaining({
            event: 'request',
            workspace_id: 'ws-123'
          })
        );
      });

      it('should log human loop confirmation', () => {
        logger.logHumanLoop('confirm', 'ws-456', { confirmed: true });

        expect(logger.info).toHaveBeenCalledWith(
          'Human-in-the-Loop: confirm',
          expect.objectContaining({
            event: 'confirm',
            workspace_id: 'ws-456',
            confirmed: true
          })
        );
      });

      it('should log human loop rejection', () => {
        logger.logHumanLoop('reject', 'ws-789', { reason: 'User declined' });

        expect(logger.info).toHaveBeenCalledWith(
          'Human-in-the-Loop: reject',
          expect.objectContaining({
            event: 'reject',
            workspace_id: 'ws-789',
            reason: 'User declined'
          })
        );
      });

      it('should log human loop timeout', () => {
        logger.logHumanLoop('timeout', 'ws-999', { timeoutMs: 300000 });

        expect(logger.info).toHaveBeenCalledWith(
          'Human-in-the-Loop: timeout',
          expect.objectContaining({
            event: 'timeout',
            workspace_id: 'ws-999',
            timeoutMs: 300000
          })
        );
      });
    });
  });

  describe('Request/Response Logging Helpers', () => {
    describe('logAPIRequest', () => {
      it('should log external API request', () => {
        const params = { model: 'qwen-plus', temperature: 0.3 };
        logger.logAPIRequest('qwen', '/v1/chat', params);

        expect(logger.debug).toHaveBeenCalledWith(
          'External API request',
          expect.objectContaining({
            provider: 'qwen',
            endpoint: '/v1/chat',
            params: expect.any(Object)
          })
        );
      });

      it('should sanitize sensitive parameters', () => {
        const params = { api_key: 'secret-key', data: 'public' };
        logger.logAPIRequest('gemini', '/v1/generate', params);

        const call = logger.debug.mock.calls[0][1];
        expect(call.params.api_key).toBe('[REDACTED]');
        expect(call.params.data).toBe('public');
      });
    });

    describe('logAPIResponse', () => {
      it('should log external API response', () => {
        logger.logAPIResponse('qwen', '/v1/chat', 200, 1234);

        expect(logger.debug).toHaveBeenCalledWith(
          'External API response',
          expect.objectContaining({
            provider: 'qwen',
            endpoint: '/v1/chat',
            statusCode: 200,
            duration: '1234ms'
          })
        );
      });

      it('should include response metadata', () => {
        logger.logAPIResponse('gemini', '/v1/generate', 200, 567, { tokens: 150 });

        expect(logger.debug).toHaveBeenCalledWith(
          'External API response',
          expect.objectContaining({
            provider: 'gemini',
            endpoint: '/v1/generate',
            statusCode: 200,
            duration: '567ms',
            tokens: 150
          })
        );
      });
    });

    describe('logAPIError', () => {
      it('should log external API error', () => {
        const error = new Error('Connection timeout');
        logger.logAPIError('qwen', '/v1/video', error);

        expect(logger.error).toHaveBeenCalledWith(
          'External API error',
          expect.objectContaining({
            provider: 'qwen',
            endpoint: '/v1/video',
            error: 'Connection timeout',
            stack: expect.any(String)
          })
        );
      });

      it('should include error context', () => {
        const error = new Error('Rate limit exceeded');
        logger.logAPIError('gemini', '/v1/generate', error, { retryAfter: 60 });

        expect(logger.error).toHaveBeenCalledWith(
          'External API error',
          expect.objectContaining({
            provider: 'gemini',
            endpoint: '/v1/generate',
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('sanitizeParams', () => {
      it('should redact api_key', () => {
        const params = { api_key: 'secret', data: 'public' };
        const sanitized = logger.sanitizeParams(params);

        expect(sanitized.api_key).toBe('[REDACTED]');
        expect(sanitized.data).toBe('public');
      });

      it('should redact apiKey (camelCase)', () => {
        const params = { apiKey: 'secret', value: 123 };
        const sanitized = logger.sanitizeParams(params);

        expect(sanitized.apiKey).toBe('[REDACTED]');
        expect(sanitized.value).toBe(123);
      });

      it('should redact token', () => {
        const params = { token: 'jwt-token', id: 'user-123' };
        const sanitized = logger.sanitizeParams(params);

        expect(sanitized.token).toBe('[REDACTED]');
        expect(sanitized.id).toBe('user-123');
      });

      it('should redact password', () => {
        const params = { password: '12345', email: 'test@example.com' };
        const sanitized = logger.sanitizeParams(params);

        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.email).toBe('test@example.com');
      });

      it('should redact secret', () => {
        const params = { secret: 'my-secret', name: 'test' };
        const sanitized = logger.sanitizeParams(params);

        expect(sanitized.secret).toBe('[REDACTED]');
        expect(sanitized.name).toBe('test');
      });

      it('should handle nested sensitive keys', () => {
        const params = {
          auth_api_key: 'secret',
          user_token: 'jwt',
          data: 'public'
        };
        const sanitized = logger.sanitizeParams(params);

        expect(sanitized.auth_api_key).toBe('[REDACTED]');
        expect(sanitized.user_token).toBe('[REDACTED]');
        expect(sanitized.data).toBe('public');
      });

      it('should not modify original params', () => {
        const params = { api_key: 'secret', data: 'public' };
        const sanitized = logger.sanitizeParams(params);

        expect(params.api_key).toBe('secret'); // Original unchanged
        expect(sanitized.api_key).toBe('[REDACTED]');
      });

      it('should handle empty params', () => {
        const sanitized = logger.sanitizeParams({});
        expect(sanitized).toEqual({});
      });
    });
  });

  describe('Logger Configuration', () => {
    it('should have Winston logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.level).toBeDefined();
    });

    it('should have custom methods added', () => {
      expect(typeof logger.logAgentStart).toBe('function');
      expect(typeof logger.logAgentComplete).toBe('function');
      expect(typeof logger.logAgentError).toBe('function');
      expect(typeof logger.logHumanLoop).toBe('function');
      expect(typeof logger.logAPIRequest).toBe('function');
      expect(typeof logger.logAPIResponse).toBe('function');
      expect(typeof logger.logAPIError).toBe('function');
      expect(typeof logger.sanitizeParams).toBe('function');
    });

    it('should have default meta fields', () => {
      expect(logger.defaultMeta).toEqual({
        service: 'video-maker-backend',
        version: '2.0.0'
      });
    });
  });
});
