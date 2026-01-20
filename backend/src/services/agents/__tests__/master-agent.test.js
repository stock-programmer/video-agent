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

// Mock modules
jest.unstable_mockModule(new URL('../../../utils/logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

jest.unstable_mockModule(new URL('../qwen-wrapper.js', import.meta.url).href, () => ({
  QwenWithTools: MockQwenWithTools
}));

// Import after mocking
const {
  executeMasterAgentDecision,
  buildMasterAgentInput
} = await import('../master-agent.js');

describe('Master Agent', () => {
  const mockWorkspace = {
    _id: { toString: () => 'test-id' },
    form_data: {
      camera_movement: 'push_in',
      shot_type: 'medium_shot',
      lighting: 'natural',
      motion_prompt: 'person walking slowly',
      motion_intensity: 3,
      duration: 5,
      aspect_ratio: '16:9',
      quality_preset: 'standard'
    }
  };

  const mockIntentReport = {
    user_intent: {
      scene_description: 'Person walking in park',
      desired_mood: 'calm and peaceful',
      key_elements: ['person', 'park', 'trees'],
      motion_expectation: 'slow, gentle walking',
      energy_level: 'low-to-medium'
    },
    confidence: 0.85
  };

  const mockVideoAnalysis = {
    content_match_score: 0.65,
    issues: [
      {
        category: 'motion_quality',
        description: 'Motion too fast',
        severity: 'high',
        affected_parameter: 'motion_intensity'
      },
      {
        category: 'lighting',
        description: 'Video too dark',
        severity: 'medium',
        affected_parameter: 'lighting'
      }
    ],
    technical_quality: {
      resolution: '1280x720',
      clarity_score: 0.85,
      fluency_score: 0.70
    },
    overall_assessment: 'Reduce motion intensity and increase brightness'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQwenInvoke.mockClear();
  });

  it('should build Master Agent prompt', () => {
    const prompt = buildMasterAgentInput(mockWorkspace, mockIntentReport, mockVideoAnalysis);

    expect(prompt).toContain('Person walking in park');
    expect(prompt).toContain('0.65');
    expect(prompt).toContain('motion_intensity');
    expect(prompt).toContain('Motion too fast');
  });

  it('should execute Master Agent decision successfully', async () => {
    const mockResponse = {
      content: `
        <NG_REASONS>
        [
          "Motion too fast for calm mood",
          "Video too dark for outdoor scene"
        ]
        </NG_REASONS>

        <OPTIMIZED_PARAMS>
        {
          "motion_intensity": 2,
          "lighting": "bright"
        }
        </OPTIMIZED_PARAMS>

        <CHANGES>
        [
          {
            "field": "motion_intensity",
            "old_value": 3,
            "new_value": 2,
            "reason": "Reduce speed for calm mood"
          },
          {
            "field": "lighting",
            "old_value": "natural",
            "new_value": "bright",
            "reason": "Increase brightness"
          }
        ]
        </CHANGES>

        <CONFIDENCE>0.85</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(mockResponse);

    const result = await executeMasterAgentDecision(
      mockWorkspace,
      mockIntentReport,
      mockVideoAnalysis
    );

    expect(result.ng_reasons).toHaveLength(2);
    expect(result.changes).toHaveLength(2);
    expect(result.optimized_params.motion_intensity).toBe(2);
    expect(result.confidence).toBe(0.85);
    expect(mockQwenInvoke).toHaveBeenCalledTimes(1);
  });

  it('should throw error if parsing fails', async () => {
    mockQwenInvoke.mockResolvedValue({
      content: 'Invalid response without XML tags'
    });

    await expect(
      executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis)
    ).rejects.toThrow('Master Agent decision failed');
  });

  it('should validate optimization result structure', async () => {
    const invalidResponse = {
      content: `
        <NG_REASONS>[]</NG_REASONS>
        <OPTIMIZED_PARAMS>{}</OPTIMIZED_PARAMS>
        <CHANGES>[]</CHANGES>
        <CONFIDENCE>0.8</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(invalidResponse);

    await expect(
      executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis)
    ).rejects.toThrow('ng_reasons must be a non-empty array');
  });

  it('should use lower temperature for consistent decisions', async () => {
    const mockResponse = {
      content: `
        <NG_REASONS>["Test reason"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"motion_intensity": 2}</OPTIMIZED_PARAMS>
        <CHANGES>[{
          "field": "motion_intensity",
          "old_value": 3,
          "new_value": 2,
          "reason": "Test"
        }]</CHANGES>
        <CONFIDENCE>0.8</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(mockResponse);

    await executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis);

    // Check that MockQwenWithTools was instantiated with correct config
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Qwen model created for Master Agent',
      expect.objectContaining({
        model: 'qwen-plus',
        temperature: 0.2
      })
    );
  });

  it('should handle missing energy_level in intent report', () => {
    const intentWithoutEnergy = {
      user_intent: {
        scene_description: 'Test scene',
        desired_mood: 'test mood',
        key_elements: ['test'],
        motion_expectation: 'test motion'
        // energy_level is missing
      },
      confidence: 0.8
    };

    const prompt = buildMasterAgentInput(mockWorkspace, intentWithoutEnergy, mockVideoAnalysis);
    expect(prompt).toContain('Test scene');
  });

  it('should warn if change field not in current form_data', async () => {
    const responseWithInvalidField = {
      content: `
        <NG_REASONS>["Test reason"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"invalid_field": "value"}</OPTIMIZED_PARAMS>
        <CHANGES>[{
          "field": "invalid_field",
          "old_value": "old",
          "new_value": "new",
          "reason": "Test"
        }]</CHANGES>
        <CONFIDENCE>0.8</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(responseWithInvalidField);

    // Should not throw error, just log warning
    const result = await executeMasterAgentDecision(
      mockWorkspace,
      mockIntentReport,
      mockVideoAnalysis
    );

    expect(result).toBeDefined();
    expect(result.changes[0].field).toBe('invalid_field');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Change field not in current form_data',
      expect.any(Object)
    );
  });

  it('should warn if old_value does not match current value', async () => {
    const responseWithMismatchedOld = {
      content: `
        <NG_REASONS>["Test reason"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"motion_intensity": 2}</OPTIMIZED_PARAMS>
        <CHANGES>[{
          "field": "motion_intensity",
          "old_value": 5,
          "new_value": 2,
          "reason": "Test"
        }]</CHANGES>
        <CONFIDENCE>0.8</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(responseWithMismatchedOld);

    // Should not throw error, just log warning
    const result = await executeMasterAgentDecision(
      mockWorkspace,
      mockIntentReport,
      mockVideoAnalysis
    );

    expect(result).toBeDefined();
    expect(result.changes[0].old_value).toBe(5); // Mismatched with actual value of 3
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'old_value mismatch',
      expect.any(Object)
    );
  });

  it('should throw error if confidence is invalid', async () => {
    const invalidConfidence = {
      content: `
        <NG_REASONS>["Test"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"motion_intensity": 2}</OPTIMIZED_PARAMS>
        <CHANGES>[{
          "field": "motion_intensity",
          "old_value": 3,
          "new_value": 2,
          "reason": "Test"
        }]</CHANGES>
        <CONFIDENCE>1.5</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(invalidConfidence);

    await expect(
      executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis)
    ).rejects.toThrow('confidence must be a number between 0 and 1');
  });

  it('should throw error if changes array is empty', async () => {
    const emptyChanges = {
      content: `
        <NG_REASONS>["Test"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"motion_intensity": 2}</OPTIMIZED_PARAMS>
        <CHANGES>[]</CHANGES>
        <CONFIDENCE>0.8</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(emptyChanges);

    await expect(
      executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis)
    ).rejects.toThrow('changes must be a non-empty array');
  });

  it('should throw error if change missing required fields', async () => {
    const incompleteChange = {
      content: `
        <NG_REASONS>["Test"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"motion_intensity": 2}</OPTIMIZED_PARAMS>
        <CHANGES>[{
          "field": "motion_intensity",
          "reason": "Test reason",
          "new_value": 2
        }]</CHANGES>
        <CONFIDENCE>0.8</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(incompleteChange);

    await expect(
      executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis)
    ).rejects.toThrow('Each change must have old_value and new_value');
  });

  it('should log detailed decision information', async () => {
    const mockResponse = {
      content: `
        <NG_REASONS>["Reason 1", "Reason 2", "Reason 3"]</NG_REASONS>
        <OPTIMIZED_PARAMS>{"motion_intensity": 2, "lighting": "bright"}</OPTIMIZED_PARAMS>
        <CHANGES>[
          {
            "field": "motion_intensity",
            "old_value": 3,
            "new_value": 2,
            "reason": "Test reason for motion"
          },
          {
            "field": "lighting",
            "old_value": "natural",
            "new_value": "bright",
            "reason": "Test reason for lighting"
          }
        ]</CHANGES>
        <CONFIDENCE>0.9</CONFIDENCE>
      `
    };

    mockQwenInvoke.mockResolvedValue(mockResponse);

    const result = await executeMasterAgentDecision(
      mockWorkspace,
      mockIntentReport,
      mockVideoAnalysis
    );

    expect(result.ng_reasons).toHaveLength(3);
    expect(result.changes).toHaveLength(2);
    expect(result.confidence).toBe(0.9);

    // Verify logging calls
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Starting Master Agent decision',
      expect.any(Object)
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Master Agent decision completed',
      expect.any(Object)
    );
  });
});
