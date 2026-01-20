import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockQwenInvoke = jest.fn();

class MockQwenWithTools {
  constructor(config) {
    this.model = config.model;
    this.temperature = config.temperature;
    this.alibabaApiKey = config.alibabaApiKey;
  }

  async invoke(input, options) {
    return mockQwenInvoke(input, options);
  }
}

// Mock modules - use paths relative to the test file
jest.unstable_mockModule(new URL('../../../utils/logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

jest.unstable_mockModule(new URL('../qwen-wrapper.js', import.meta.url).href, () => ({
  QwenWithTools: MockQwenWithTools
}));

// Import after mocking
const {
  executeIntentAnalysis,
  buildIntentAnalysisInput,
  validateIntentReport,
  INTENT_ANALYSIS_PROMPT
} = await import('../intent-agent.js');

describe('Intent Analysis Agent', () => {
  const mockWorkspace = {
    _id: { toString: () => 'test-workspace-id' },
    image_url: 'http://localhost:3000/uploads/test.jpg',
    form_data: {
      camera_movement: 'push_in',
      shot_type: 'medium',
      lighting: 'natural',
      motion_prompt: 'person walking slowly in the park',
      duration: 10,
      aspect_ratio: '16:9',
      motion_intensity: 3,
      quality_preset: 'standard'
    },
    video: {
      url: 'http://localhost:3000/videos/test.mp4'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQwenInvoke.mockClear();
  });

  describe('INTENT_ANALYSIS_PROMPT', () => {
    it('should contain all necessary instructions', () => {
      expect(INTENT_ANALYSIS_PROMPT).toContain('Intent Analysis Specialist');
      expect(INTENT_ANALYSIS_PROMPT).toContain('Visual Analysis');
      expect(INTENT_ANALYSIS_PROMPT).toContain('Parameter Interpretation');
      expect(INTENT_ANALYSIS_PROMPT).toContain('Motion Intent');
      expect(INTENT_ANALYSIS_PROMPT).toContain('Mood Inference');
      expect(INTENT_ANALYSIS_PROMPT).toContain('Contradiction Check');
      expect(INTENT_ANALYSIS_PROMPT).toContain('<INTENT_REPORT>');
    });

    it('should have placeholder for input params', () => {
      expect(INTENT_ANALYSIS_PROMPT).toContain('{INPUT_PARAMS}');
    });
  });

  describe('buildIntentAnalysisInput', () => {
    it('should build complete prompt with all parameters', () => {
      const prompt = buildIntentAnalysisInput(mockWorkspace);

      expect(prompt).toContain('Image: http://localhost:3000/uploads/test.jpg');
      expect(prompt).toContain('Camera Movement: push_in');
      expect(prompt).toContain('Shot Type: medium');
      expect(prompt).toContain('Lighting: natural');
      expect(prompt).toContain('Motion Prompt: "person walking slowly in the park"');
      expect(prompt).toContain('Duration: 10s');
      expect(prompt).toContain('Aspect Ratio: 16:9');
      expect(prompt).toContain('Motion Intensity: 3');
      expect(prompt).toContain('Quality: standard');
    });

    it('should handle missing form_data fields with defaults', () => {
      const minimalWorkspace = {
        _id: { toString: () => 'test-id' },
        image_url: 'http://localhost/test.jpg',
        form_data: {}
      };

      const prompt = buildIntentAnalysisInput(minimalWorkspace);

      expect(prompt).toContain('Camera Movement: N/A');
      expect(prompt).toContain('Motion Prompt: "N/A"');
      expect(prompt).toContain('Duration: 5s');
      expect(prompt).toContain('Aspect Ratio: 16:9');
      expect(prompt).toContain('Motion Intensity: 3');
    });

    it('should not contain {INPUT_PARAMS} placeholder', () => {
      const prompt = buildIntentAnalysisInput(mockWorkspace);
      expect(prompt).not.toContain('{INPUT_PARAMS}');
    });
  });

  describe('validateIntentReport', () => {
    it('should pass valid intent report', () => {
      const validReport = {
        user_intent: {
          scene_description: 'A person in a park',
          desired_mood: 'calm and peaceful',
          motion_expectation: 'slow walking',
          key_elements: ['person', 'park'],
          energy_level: 'low'
        },
        confidence: 0.85
      };

      expect(() => validateIntentReport(validReport)).not.toThrow();
    });

    it('should throw error if scene_description is missing', () => {
      const invalidReport = {
        user_intent: {
          desired_mood: 'calm',
          motion_expectation: 'slow'
        },
        confidence: 0.8
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Missing required field in intent report: scene_description');
    });

    it('should throw error if desired_mood is missing', () => {
      const invalidReport = {
        user_intent: {
          scene_description: 'test',
          motion_expectation: 'slow'
        },
        confidence: 0.8
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Missing required field in intent report: desired_mood');
    });

    it('should throw error if motion_expectation is missing', () => {
      const invalidReport = {
        user_intent: {
          scene_description: 'test',
          desired_mood: 'calm'
        },
        confidence: 0.8
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Missing required field in intent report: motion_expectation');
    });

    it('should throw error if user_intent is missing', () => {
      const invalidReport = {
        confidence: 0.8
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Missing required field');
    });

    it('should throw error if confidence is not a number', () => {
      const invalidReport = {
        user_intent: {
          scene_description: 'test',
          desired_mood: 'calm',
          motion_expectation: 'slow'
        },
        confidence: 'high'
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Invalid confidence value');
    });

    it('should throw error if confidence is less than 0', () => {
      const invalidReport = {
        user_intent: {
          scene_description: 'test',
          desired_mood: 'calm',
          motion_expectation: 'slow'
        },
        confidence: -0.1
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Invalid confidence value');
    });

    it('should throw error if confidence is greater than 1', () => {
      const invalidReport = {
        user_intent: {
          scene_description: 'test',
          desired_mood: 'calm',
          motion_expectation: 'slow'
        },
        confidence: 1.5
      };

      expect(() => validateIntentReport(invalidReport)).toThrow('Invalid confidence value');
    });

    it('should accept confidence at boundaries (0 and 1)', () => {
      const report1 = {
        user_intent: {
          scene_description: 'test',
          desired_mood: 'calm',
          motion_expectation: 'slow'
        },
        confidence: 0
      };

      const report2 = {
        user_intent: {
          scene_description: 'test',
          desired_mood: 'calm',
          motion_expectation: 'slow'
        },
        confidence: 1
      };

      expect(() => validateIntentReport(report1)).not.toThrow();
      expect(() => validateIntentReport(report2)).not.toThrow();
    });
  });

  describe('executeIntentAnalysis', () => {
    it('should execute intent analysis successfully', async () => {
      const mockResponse = {
        content: `<INTENT_REPORT>
        {
          "user_intent": {
            "scene_description": "A person walking in a park with trees and grass",
            "desired_mood": "Calm, peaceful, leisurely",
            "key_elements": ["person", "park", "trees", "natural light"],
            "motion_expectation": "Slow, gentle walking motion",
            "energy_level": "low-to-medium"
          },
          "parameter_analysis": {
            "aligned": ["natural lighting matches outdoor scene"],
            "potential_issues": []
          },
          "confidence": 0.85
        }
        </INTENT_REPORT>`
      };

      mockQwenInvoke.mockResolvedValue(mockResponse);

      const result = await executeIntentAnalysis(mockWorkspace);

      expect(result.user_intent.scene_description).toBe('A person walking in a park with trees and grass');
      expect(result.user_intent.desired_mood).toBe('Calm, peaceful, leisurely');
      expect(result.confidence).toBe(0.85);
      expect(mockQwenInvoke).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting intent analysis',
        expect.objectContaining({ workspaceId: 'test-workspace-id' })
      );
    });

    it('should throw error if parsing fails', async () => {
      mockQwenInvoke.mockResolvedValue({
        content: 'Invalid response without tags'
      });

      await expect(executeIntentAnalysis(mockWorkspace)).rejects.toThrow('Agent execution failed (intent): parsing');
    });

    it('should throw error if validation fails', async () => {
      const mockResponse = {
        content: `<INTENT_REPORT>
        {
          "user_intent": {
            "scene_description": "Test scene"
          },
          "confidence": 0.8
        }
        </INTENT_REPORT>`
      };

      mockQwenInvoke.mockResolvedValue(mockResponse);

      await expect(executeIntentAnalysis(mockWorkspace)).rejects.toThrow('Missing required field');
    });

    it('should handle LLM errors gracefully', async () => {
      const error = new Error('API rate limit exceeded');
      mockQwenInvoke.mockRejectedValue(error);

      await expect(executeIntentAnalysis(mockWorkspace)).rejects.toThrow('Agent execution failed (intent): analysis');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Intent analysis failed',
        expect.objectContaining({
          workspaceId: 'test-workspace-id',
          error: 'API rate limit exceeded'
        })
      );
    });

    it('should log all key steps', async () => {
      const mockResponse = {
        content: `<INTENT_REPORT>
        {
          "user_intent": {
            "scene_description": "Test",
            "desired_mood": "calm",
            "motion_expectation": "slow"
          },
          "confidence": 0.9
        }
        </INTENT_REPORT>`
      };

      mockQwenInvoke.mockResolvedValue(mockResponse);

      await executeIntentAnalysis(mockWorkspace);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting intent analysis',
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Intent analysis prompt built',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calling Qwen LLM for intent analysis',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Qwen LLM response received',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Intent analysis completed successfully',
        expect.any(Object)
      );
    });

    it('should pass correct parameters to Qwen model', async () => {
      const mockResponse = {
        content: `<INTENT_REPORT>
        {
          "user_intent": {
            "scene_description": "Test",
            "desired_mood": "calm",
            "motion_expectation": "slow"
          },
          "confidence": 0.9
        }
        </INTENT_REPORT>`
      };

      mockQwenInvoke.mockResolvedValue(mockResponse);

      await executeIntentAnalysis(mockWorkspace);

      expect(mockQwenInvoke).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Intent Analysis Specialist')
          })
        ]),
        undefined
      );
    });
  });
});
