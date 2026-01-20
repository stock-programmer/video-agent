// backend/src/api/__tests__/optimize-prompt.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockOptimizePrompt = jest.fn();

const mockWorkspace = {
  findById: jest.fn()
};

// Setup mocks
jest.unstable_mockModule(new URL('../../utils/logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

jest.unstable_mockModule(new URL('../../services/prompt-optimizer.js', import.meta.url).href, () => ({
  optimizePrompt: mockOptimizePrompt
}));

jest.unstable_mockModule(new URL('../../db/mongodb.js', import.meta.url).href, () => ({
  Workspace: mockWorkspace
}));

// Import after mocking
const optimizePromptRouter = (await import('../optimize-prompt.js')).default;

describe('POST /api/optimize-prompt', () => {
  let app;
  let mockWsBroadcast;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockWsBroadcast = jest.fn();
    app.set('wsBroadcast', mockWsBroadcast);

    app.use('/api', optimizePromptRouter);

    jest.clearAllMocks();
  });

  const mockWorkspaceInstance = {
    _id: { toString: () => 'test-workspace-id' },
    image_url: 'http://localhost:3000/uploads/test.jpg',
    video: {
      status: 'completed',
      url: 'http://localhost:3000/videos/test.mp4'
    },
    form_data: {
      motion_intensity: 3,
      lighting: 'natural'
    }
  };

  describe('Success cases', () => {
    it('should start optimization successfully', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);
      mockOptimizePrompt.mockResolvedValue({
        success: true,
        intentReport: {},
        videoAnalysis: {},
        optimizationResult: {}
      });

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Optimization started',
        workspace_id: 'test-workspace-id'
      });

      // Wait for async call to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockWorkspace.findById).toHaveBeenCalledWith('test-workspace-id');
      expect(mockOptimizePrompt).toHaveBeenCalledWith('test-workspace-id', mockWsBroadcast);
    });

    it('should log API call details', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);
      mockOptimizePrompt.mockResolvedValue({ success: true });

      await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'API /optimize-prompt called',
        expect.objectContaining({
          workspace_id: 'test-workspace-id'
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Workspace validation passed',
        expect.any(Object)
      );
    });

    it('should execute optimization asynchronously', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);

      let optimizationStarted = false;
      mockOptimizePrompt.mockImplementation(async () => {
        optimizationStarted = true;
        return { success: true };
      });

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(200);

      // Response should be immediate
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Optimization started');

      // Optimization may not have started yet
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(optimizationStarted).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should return 400 if workspace_id is missing', async () => {
      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'workspace_id is required'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Missing workspace_id in request',
        expect.any(Object)
      );
    });

    it('should return 404 if workspace not found', async () => {
      mockWorkspace.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'invalid-id' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
      expect(response.body.error).toContain('invalid-id');
    });
  });

  describe('Workspace validation', () => {
    it('should return 400 if video not completed', async () => {
      mockWorkspace.findById.mockResolvedValue({
        ...mockWorkspaceInstance,
        video: { status: 'pending', url: 'http://test.mp4' }
      });

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be completed');
    });

    it('should return 400 if video is missing', async () => {
      mockWorkspace.findById.mockResolvedValue({
        ...mockWorkspaceInstance,
        video: null
      });

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(400);

      expect(response.body.error).toContain('must be completed');
    });

    it('should return 400 if video URL is missing', async () => {
      mockWorkspace.findById.mockResolvedValue({
        ...mockWorkspaceInstance,
        video: { status: 'completed', url: null }
      });

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('URL is missing');
    });

    it('should return 400 if video URL is empty string', async () => {
      mockWorkspace.findById.mockResolvedValue({
        ...mockWorkspaceInstance,
        video: { status: 'completed', url: '' }
      });

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(400);

      expect(response.body.error).toContain('URL is missing');
    });
  });

  describe('WebSocket integration', () => {
    it('should return 500 if WebSocket not initialized', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);

      const appNoWs = express();
      appNoWs.use(express.json());
      appNoWs.use('/api', optimizePromptRouter);

      const response = await request(appNoWs)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('WebSocket');
    });

    it('should pass wsBroadcast function to optimizePrompt', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);
      mockOptimizePrompt.mockResolvedValue({ success: true });

      await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOptimizePrompt).toHaveBeenCalledWith(
        'test-workspace-id',
        mockWsBroadcast
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockWorkspace.findById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');
    });

    it('should log optimization completion', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);
      mockOptimizePrompt.mockResolvedValue({
        success: true,
        optimizationResult: {
          changes: [{ field: 'motion_intensity', new_value: 2 }]
        }
      });

      await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Optimization completed successfully',
        expect.objectContaining({
          workspace_id: 'test-workspace-id',
          changeCount: 1
        })
      );
    });

    it('should log optimization failure', async () => {
      mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);
      mockOptimizePrompt.mockRejectedValue(new Error('Optimization failed'));

      await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: 'test-workspace-id' })
        .expect(200); // Still returns 200 initially

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Optimization failed',
        expect.objectContaining({
          workspace_id: 'test-workspace-id',
          error: 'Optimization failed'
        })
      );
    });
  });
});
