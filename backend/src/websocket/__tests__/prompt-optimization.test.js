import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock modules
jest.unstable_mockModule(new URL('../../utils/logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

// Import after mocking
const { handleHumanConfirm } = await import('../prompt-optimization.js');

// Import confirmation handling from prompt-optimizer
const {
  handleHumanConfirmation,
  waitForHumanConfirmation,
  pendingConfirmations
} = await import('../../services/prompt-optimizer.js');

describe('WebSocket Prompt Optimization Handler', () => {
  let mockWs;

  beforeEach(() => {
    mockWs = {
      id: 'test-ws-id',
      send: jest.fn()
    };

    jest.clearAllMocks();
    // 清理所有待确认
    pendingConfirmations.clear();
  });

  describe('handleHumanConfirm', () => {
    it('should handle human confirmation successfully', () => {
      // 首先注册一个待确认
      const confirmPromise = waitForHumanConfirmation('test-id');

      handleHumanConfirm(mockWs, {
        workspace_id: 'test-id',
        confirmed: true
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Received human_confirm message',
        expect.objectContaining({
          workspace_id: 'test-id',
          confirmed: true,
          wsId: 'test-ws-id'
        })
      );

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'human_confirm_ack',
          workspace_id: 'test-id',
          confirmed: true
        })
      );

      // 验证 Promise 被解析
      return expect(confirmPromise).resolves.toBe(true);
    });

    it('should handle human rejection successfully', () => {
      // 注册待确认
      const confirmPromise = waitForHumanConfirmation('test-id');

      handleHumanConfirm(mockWs, {
        workspace_id: 'test-id',
        confirmed: false
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Human confirmation received',
        expect.objectContaining({
          workspaceId: 'test-id',
          confirmed: false
        })
      );

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'human_confirm_ack',
          workspace_id: 'test-id',
          confirmed: false
        })
      );

      // 验证 Promise 被解析为 false
      return expect(confirmPromise).resolves.toBe(false);
    });

    it('should return error if workspace_id missing', () => {
      handleHumanConfirm(mockWs, {
        confirmed: true
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'human_confirm missing workspace_id',
        expect.any(Object)
      );

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('workspace_id is required')
      );
    });

    it('should return error if confirmed not boolean', () => {
      handleHumanConfirm(mockWs, {
        workspace_id: 'test-id',
        confirmed: 'yes'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'human_confirm missing confirmed boolean',
        expect.any(Object)
      );

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('must be a boolean')
      );
    });

    it('should return error if no pending confirmation', () => {
      handleHumanConfirm(mockWs, {
        workspace_id: 'test-id',
        confirmed: true
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No pending confirmation found for workspace',
        expect.objectContaining({ workspace_id: 'test-id' })
      );

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('No pending confirmation')
      );
    });

    it('should log successfully handled confirmation', () => {
      waitForHumanConfirmation('test-id');

      handleHumanConfirm(mockWs, {
        workspace_id: 'test-id',
        confirmed: true
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Human confirmation handled successfully',
        expect.objectContaining({
          workspace_id: 'test-id',
          confirmed: true
        })
      );
    });
  });

  describe('handleHumanConfirmation', () => {
    it('should return true when pending confirmation exists', () => {
      waitForHumanConfirmation('test-id');

      const result = handleHumanConfirmation('test-id', true);

      expect(result).toBe(true);
      expect(pendingConfirmations.has('test-id')).toBe(false); // Should be cleaned up
    });

    it('should return false when no pending confirmation exists', () => {
      const result = handleHumanConfirmation('non-existent-id', true);

      expect(result).toBe(false);
    });

    it('should resolve promise with user decision', async () => {
      const confirmPromise = waitForHumanConfirmation('test-id');

      // Simulate user confirmation
      handleHumanConfirmation('test-id', true);

      const result = await confirmPromise;
      expect(result).toBe(true);
    });

    it('should handle rejection properly', async () => {
      const confirmPromise = waitForHumanConfirmation('test-id');

      // Simulate user rejection
      handleHumanConfirmation('test-id', false);

      const result = await confirmPromise;
      expect(result).toBe(false);
    });
  });

  describe('waitForHumanConfirmation', () => {
    it('should register a new pending confirmation', () => {
      const confirmPromise = waitForHumanConfirmation('test-id');

      expect(confirmPromise).toBeInstanceOf(Promise);
      expect(pendingConfirmations.has('test-id')).toBe(true);
    });

    it('should timeout after 5 minutes', async () => {
      jest.useFakeTimers();

      const confirmPromise = waitForHumanConfirmation('test-id');

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Should resolve to false on timeout, not reject
      await expect(confirmPromise).resolves.toBe(false);

      jest.useRealTimers();
    });

    it('should cleanup after timeout', async () => {
      jest.useFakeTimers();

      const confirmPromise = waitForHumanConfirmation('test-id');

      expect(pendingConfirmations.has('test-id')).toBe(true);

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      await confirmPromise; // Wait for resolution (resolves to false)

      expect(pendingConfirmations.has('test-id')).toBe(false);

      jest.useRealTimers();
    });

    it('should allow multiple pending confirmations', () => {
      waitForHumanConfirmation('test-id-1');
      waitForHumanConfirmation('test-id-2');
      waitForHumanConfirmation('test-id-3');

      expect(pendingConfirmations.size).toBe(3);
      expect(pendingConfirmations.has('test-id-1')).toBe(true);
      expect(pendingConfirmations.has('test-id-2')).toBe(true);
      expect(pendingConfirmations.has('test-id-3')).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete confirmation flow', async () => {
      // 1. Register pending confirmation
      const confirmPromise = waitForHumanConfirmation('workspace-123');

      expect(pendingConfirmations.has('workspace-123')).toBe(true);

      // 2. User sends confirmation via WebSocket
      handleHumanConfirm(mockWs, {
        workspace_id: 'workspace-123',
        confirmed: true
      });

      // 3. Promise should resolve
      const result = await confirmPromise;
      expect(result).toBe(true);

      // 4. Pending confirmation should be cleaned up
      expect(pendingConfirmations.has('workspace-123')).toBe(false);

      // 5. Client should receive ack
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('human_confirm_ack')
      );
    });

    it('should handle rejection flow', async () => {
      // 1. Register
      const confirmPromise = waitForHumanConfirmation('workspace-456');

      // 2. User rejects
      handleHumanConfirm(mockWs, {
        workspace_id: 'workspace-456',
        confirmed: false
      });

      // 3. Promise resolves with false
      const result = await confirmPromise;
      expect(result).toBe(false);

      // 4. Cleanup
      expect(pendingConfirmations.has('workspace-456')).toBe(false);
    });

    it('should handle confirmation without prior registration', () => {
      // User tries to confirm without pending request
      handleHumanConfirm(mockWs, {
        workspace_id: 'unknown-workspace',
        confirmed: true
      });

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('No pending confirmation')
      );
    });
  });
});
