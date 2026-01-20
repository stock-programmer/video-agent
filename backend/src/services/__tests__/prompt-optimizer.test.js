// backend/src/services/__tests__/prompt-optimizer.test.js
import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock workspace model
const mockWorkspaceInstance = {
  _id: { toString: () => 'test-workspace-id' },
  image_url: 'http://localhost:3000/uploads/test.jpg',
  video: {
    status: 'completed',
    url: 'http://localhost:3000/videos/test.mp4'
  },
  form_data: {
    camera_movement: 'push_in',
    motion_intensity: 3,
    lighting: 'natural',
    motion_prompt: 'person walking'
  },
  optimization_history: []
};

const mockWorkspace = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
};

// Mock agent functions
const mockExecuteIntentAnalysis = jest.fn();
const mockExecuteVideoAnalysis = jest.fn();
const mockExecuteMasterAgentDecision = jest.fn();

// Setup mocks
jest.unstable_mockModule(new URL('../../utils/logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

jest.unstable_mockModule(new URL('../../db/mongodb.js', import.meta.url).href, () => ({
  Workspace: mockWorkspace
}));

jest.unstable_mockModule(new URL('../agents/intent-agent.js', import.meta.url).href, () => ({
  executeIntentAnalysis: mockExecuteIntentAnalysis
}));

jest.unstable_mockModule(new URL('../agents/video-agent.js', import.meta.url).href, () => ({
  executeVideoAnalysis: mockExecuteVideoAnalysis
}));

jest.unstable_mockModule(new URL('../agents/master-agent.js', import.meta.url).href, () => ({
  executeMasterAgentDecision: mockExecuteMasterAgentDecision
}));

// Import after mocking
const {
  optimizePrompt,
  handleHumanConfirmation,
  saveOptimizationResult,
  validateWorkspace,
  pendingConfirmations
} = await import('../prompt-optimizer.js');

describe('Prompt Optimizer', () => {
  const mockIntentReport = {
    user_intent: {
      scene_description: 'A person walking in a park',
      desired_mood: 'calm and peaceful',
      key_elements: ['person', 'park', 'trees'],
      motion_expectation: 'Slow, gentle walking',
      energy_level: 'low'
    },
    parameter_analysis: {
      aligned: ['natural lighting matches outdoor scene'],
      potential_issues: ['motion_intensity=3 might be too fast']
    },
    confidence: 0.85
  };

  const mockVideoAnalysis = {
    content_match_score: 0.70,
    issues: [
      {
        category: 'motion_quality',
        description: 'Motion is too fast for intended slow walk',
        severity: 'high',
        affected_parameter: 'motion_intensity'
      },
      {
        category: 'lighting',
        description: 'Video appears darker than expected',
        severity: 'medium',
        affected_parameter: 'lighting'
      }
    ],
    technical_quality: {
      clarity_score: 0.85,
      fluency_score: 0.75,
      artifact_score: 0.90
    },
    overall_assessment: 'Reduce motion intensity and adjust lighting'
  };

  const mockOptimizationResult = {
    ng_reasons: [
      'Motion is too fast and jerky for intended slow walk',
      'Video lighting is darker than expected for outdoor scene'
    ],
    optimized_params: {
      motion_intensity: 2,
      lighting: 'bright'
    },
    changes: [
      {
        field: 'motion_intensity',
        old_value: 3,
        new_value: 2,
        reason: 'Reduce speed to match slow walking intent'
      },
      {
        field: 'lighting',
        old_value: 'natural',
        new_value: 'bright',
        reason: 'Increase brightness for outdoor scene'
      }
    ],
    confidence: 0.85
  };

  let wsBroadcastMock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Ensure real timers by default
    pendingConfirmations.clear();

    wsBroadcastMock = jest.fn();

    mockWorkspace.findById.mockResolvedValue(mockWorkspaceInstance);
    mockWorkspace.findByIdAndUpdate.mockResolvedValue({
      ...mockWorkspaceInstance,
      optimization_history: [{
        timestamp: new Date(),
        intent_report: mockIntentReport,
        video_analysis: mockVideoAnalysis,
        optimization_result: mockOptimizationResult
      }]
    });

    mockExecuteIntentAnalysis.mockResolvedValue(mockIntentReport);
    mockExecuteVideoAnalysis.mockResolvedValue(mockVideoAnalysis);
    mockExecuteMasterAgentDecision.mockResolvedValue(mockOptimizationResult);
  });

  describe('validateWorkspace', () => {
    it('should pass validation for valid workspace', () => {
      expect(() => validateWorkspace(mockWorkspaceInstance)).not.toThrow();
    });

    it('should throw error if image_url is missing', () => {
      const invalidWorkspace = { ...mockWorkspaceInstance, image_url: null };
      expect(() => validateWorkspace(invalidWorkspace)).toThrow('must have an image_url');
    });

    it('should throw error if video is missing', () => {
      const invalidWorkspace = { ...mockWorkspaceInstance, video: null };
      expect(() => validateWorkspace(invalidWorkspace)).toThrow('must have a completed video');
    });

    it('should throw error if video status is not completed', () => {
      const invalidWorkspace = {
        ...mockWorkspaceInstance,
        video: { status: 'pending', url: 'http://test.mp4' }
      };
      expect(() => validateWorkspace(invalidWorkspace)).toThrow('must have a completed video');
    });

    it('should throw error if video URL is missing', () => {
      const invalidWorkspace = {
        ...mockWorkspaceInstance,
        video: { status: 'completed', url: null }
      };
      expect(() => validateWorkspace(invalidWorkspace)).toThrow('video must have a URL');
    });

    it('should throw error if form_data is missing', () => {
      const invalidWorkspace = { ...mockWorkspaceInstance, form_data: null };
      expect(() => validateWorkspace(invalidWorkspace)).toThrow('must have form_data');
    });
  });

  describe('handleHumanConfirmation', () => {
    it('should handle confirmation when pending exists', () => {
      const mockResolve = jest.fn();
      pendingConfirmations.set('test-workspace-id', {
        resolve: mockResolve,
        timeoutId: setTimeout(() => {}, 1000)
      });

      const result = handleHumanConfirmation('test-workspace-id', true);

      expect(result).toBe(true);
      expect(mockResolve).toHaveBeenCalledWith(true);
    });

    it('should return false when no pending confirmation exists', () => {
      const result = handleHumanConfirmation('nonexistent-id', true);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No pending confirmation found',
        expect.objectContaining({ workspaceId: 'nonexistent-id' })
      );
    });

    it('should handle rejection', () => {
      const mockResolve = jest.fn();
      pendingConfirmations.set('test-workspace-id', {
        resolve: mockResolve,
        timeoutId: setTimeout(() => {}, 1000)
      });

      handleHumanConfirmation('test-workspace-id', false);

      expect(mockResolve).toHaveBeenCalledWith(false);
    });
  });

  describe('saveOptimizationResult', () => {
    it('should save optimization result to database', async () => {
      const result = await saveOptimizationResult(
        'test-workspace-id',
        mockIntentReport,
        mockVideoAnalysis,
        mockOptimizationResult
      );

      expect(mockWorkspace.findByIdAndUpdate).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({
          $push: expect.objectContaining({
            optimization_history: expect.objectContaining({
              timestamp: expect.any(Date),
              intent_report: mockIntentReport,
              video_analysis: mockVideoAnalysis,
              optimization_result: mockOptimizationResult
            })
          })
        }),
        { new: true }
      );

      expect(result.intent_report).toEqual(mockIntentReport);
      expect(result.video_analysis).toEqual(mockVideoAnalysis);
      expect(result.optimization_result).toEqual(mockOptimizationResult);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error if workspace not found', async () => {
      mockWorkspace.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        saveOptimizationResult(
          'invalid-id',
          mockIntentReport,
          mockVideoAnalysis,
          mockOptimizationResult
        )
      ).rejects.toThrow('Failed to save optimization result');
    });
  });

  describe('optimizePrompt', () => {
    it('should execute complete optimization flow', async () => {
      // Simulate user confirmation after 100ms
      setTimeout(() => {
        handleHumanConfirmation('test-workspace-id', true);
      }, 100);

      const result = await optimizePrompt('test-workspace-id', wsBroadcastMock);

      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.intentReport).toEqual(mockIntentReport);
      expect(result.videoAnalysis).toEqual(mockVideoAnalysis);
      expect(result.optimizationResult).toEqual(mockOptimizationResult);

      // Verify all agents were called
      expect(mockExecuteIntentAnalysis).toHaveBeenCalledWith(mockWorkspaceInstance);
      expect(mockExecuteVideoAnalysis).toHaveBeenCalledWith(mockWorkspaceInstance, mockIntentReport);
      expect(mockExecuteMasterAgentDecision).toHaveBeenCalledWith(
        mockWorkspaceInstance,
        mockIntentReport,
        mockVideoAnalysis
      );

      // Verify workspace operations
      expect(mockWorkspace.findById).toHaveBeenCalledWith('test-workspace-id');
      expect(mockWorkspace.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should broadcast WebSocket messages for all phases', async () => {
      setTimeout(() => {
        handleHumanConfirmation('test-workspace-id', true);
      }, 100);

      await optimizePrompt('test-workspace-id', wsBroadcastMock);

      // Verify Phase 1: Intent Analysis
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'agent_start', agent: 'intent_analysis' })
      );
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'agent_complete', agent: 'intent_analysis' })
      );
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'intent_report', data: mockIntentReport })
      );

      // Verify Phase 2: Human Loop
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'human_loop_pending' })
      );

      // Verify Phase 3: Video Analysis
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'agent_start', agent: 'video_analysis' })
      );
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'agent_complete', agent: 'video_analysis' })
      );

      // Verify Phase 4: Master Agent
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'agent_start', agent: 'master_agent' })
      );
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'agent_complete', agent: 'master_agent' })
      );

      // Verify Final Result
      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({ type: 'optimization_result' })
      );
    });

    it('should throw error if workspace not found', async () => {
      mockWorkspace.findById.mockResolvedValue(null);

      await expect(
        optimizePrompt('invalid-id', wsBroadcastMock)
      ).rejects.toThrow('Workspace not found');

      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'invalid-id',
        expect.objectContaining({ type: 'optimization_error' })
      );
    });

    it('should throw error if workspace validation fails', async () => {
      mockWorkspace.findById.mockResolvedValue({
        ...mockWorkspaceInstance,
        video: { status: 'pending' }
      });

      await expect(
        optimizePrompt('test-workspace-id', wsBroadcastMock)
      ).rejects.toThrow('must have a completed video');
    });

    it('should throw error if user rejects confirmation', async () => {
      setTimeout(() => {
        handleHumanConfirmation('test-workspace-id', false);
      }, 100);

      await expect(
        optimizePrompt('test-workspace-id', wsBroadcastMock)
      ).rejects.toThrow('User did not confirm intent analysis');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User rejected intent or timeout',
        expect.objectContaining({ workspaceId: 'test-workspace-id' })
      );
    });

    // Note: This test is skipped because fake timers with async/await are difficult in Jest
    // The timeout functionality is tested in integration tests
    it.skip('should throw error if human confirmation times out', async () => {
      jest.useFakeTimers();

      const promise = optimizePrompt('test-workspace-id', wsBroadcastMock);

      // Fast-forward time to trigger timeout
      await jest.advanceTimersByTimeAsync(300000);

      await expect(promise).rejects.toThrow('User did not confirm intent analysis');

      jest.useRealTimers();
    });

    it('should handle intent analysis failure', async () => {
      mockExecuteIntentAnalysis.mockRejectedValue(new Error('Intent analysis failed'));

      await expect(
        optimizePrompt('test-workspace-id', wsBroadcastMock)
      ).rejects.toThrow('Intent analysis failed');

      expect(wsBroadcastMock).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.objectContaining({
          type: 'optimization_error',
          error: expect.stringContaining('Intent analysis failed')
        })
      );
    });

    it('should handle video analysis failure', async () => {
      mockExecuteVideoAnalysis.mockRejectedValue(new Error('Video analysis failed'));

      setTimeout(() => {
        handleHumanConfirmation('test-workspace-id', true);
      }, 100);

      await expect(
        optimizePrompt('test-workspace-id', wsBroadcastMock)
      ).rejects.toThrow('Video analysis failed');
    });

    it('should handle master agent failure', async () => {
      mockExecuteMasterAgentDecision.mockRejectedValue(new Error('Master agent failed'));

      setTimeout(() => {
        handleHumanConfirmation('test-workspace-id', true);
      }, 100);

      await expect(
        optimizePrompt('test-workspace-id', wsBroadcastMock)
      ).rejects.toThrow('Master agent failed');
    });

    it('should log all key steps', async () => {
      setTimeout(() => {
        handleHumanConfirmation('test-workspace-id', true);
      }, 100);

      await optimizePrompt('test-workspace-id', wsBroadcastMock);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting prompt optimization',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Phase 1: Intent Analysis started',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Phase 2: Waiting for human confirmation',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Phase 3: Video Analysis started',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Phase 4: Master Agent decision started',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Phase 5: Saving optimization result to database',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Prompt optimization completed successfully',
        expect.any(Object)
      );
    });
  });
});
