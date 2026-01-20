import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockAnalyzeVideoWithQwenVL = jest.fn();
const mockParseVideoAnalysis = jest.fn();

// Mock modules
jest.unstable_mockModule(new URL('../../../utils/logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

jest.unstable_mockModule(new URL('../../qwen-vl.js', import.meta.url).href, () => ({
  analyzeVideoWithQwenVL: mockAnalyzeVideoWithQwenVL
}));

jest.unstable_mockModule(new URL('../../../utils/agent-helpers.js', import.meta.url).href, () => ({
  parseVideoAnalysis: mockParseVideoAnalysis
}));

// Import after mocking
const {
  executeVideoAnalysis,
  buildVideoAnalysisInput,
  validateVideoAnalysisReport,
  VIDEO_ANALYSIS_PROMPT
} = await import('../video-agent.js');

describe('Video Analysis Agent', () => {
  const mockWorkspace = {
    _id: { toString: () => 'test-workspace-id' },
    image_url: 'http://localhost:3000/uploads/test.jpg',
    video: {
      url: 'http://localhost:3000/videos/test.mp4',
      status: 'completed'
    },
    form_data: {
      camera_movement: 'push_in',
      shot_type: 'medium',
      lighting: 'natural',
      motion_prompt: 'person walking slowly in the park',
      motion_intensity: 3,
      duration: 10,
      aspect_ratio: '16:9',
      quality_preset: 'standard'
    }
  };

  const mockIntentReport = {
    user_intent: {
      scene_description: 'A person walking in a park with trees and grass',
      desired_mood: 'Calm, peaceful, leisurely',
      key_elements: ['person', 'park', 'trees'],
      motion_expectation: 'Slow, gentle walking motion',
      energy_level: 'low-to-medium'
    },
    confidence: 0.85
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeVideoWithQwenVL.mockClear();
    mockParseVideoAnalysis.mockClear();
  });

  describe('VIDEO_ANALYSIS_PROMPT', () => {
    it('should contain all necessary instructions', () => {
      expect(VIDEO_ANALYSIS_PROMPT).toContain('Video Quality Analysis Specialist');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('Content Match Check');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('Motion Quality');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('Technical Quality');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('Parameter Alignment');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('Issue Identification');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('<VIDEO_ANALYSIS>');
    });

    it('should have placeholders for user intent and params', () => {
      expect(VIDEO_ANALYSIS_PROMPT).toContain('{USER_INTENT}');
      expect(VIDEO_ANALYSIS_PROMPT).toContain('{GENERATION_PARAMS}');
    });
  });

  describe('buildVideoAnalysisInput', () => {
    it('should build complete prompt with all parameters', () => {
      const prompt = buildVideoAnalysisInput(mockWorkspace, mockIntentReport);

      // Check user intent
      expect(prompt).toContain('A person walking in a park with trees and grass');
      expect(prompt).toContain('Calm, peaceful, leisurely');
      expect(prompt).toContain('person, park, trees');
      expect(prompt).toContain('Slow, gentle walking motion');
      expect(prompt).toContain('low-to-medium');

      // Check generation params
      expect(prompt).toContain('Camera Movement: push_in');
      expect(prompt).toContain('Shot Type: medium');
      expect(prompt).toContain('Lighting: natural');
      expect(prompt).toContain('Motion Prompt: "person walking slowly in the park"');
      expect(prompt).toContain('Motion Intensity: 3');
      expect(prompt).toContain('Duration: 10s');
      expect(prompt).toContain('Quality: standard');
    });

    it('should handle missing form_data fields with defaults', () => {
      const minimalWorkspace = {
        ...mockWorkspace,
        form_data: {}
      };

      const prompt = buildVideoAnalysisInput(minimalWorkspace, mockIntentReport);

      expect(prompt).toContain('Camera Movement: N/A');
      expect(prompt).toContain('Motion Prompt: "N/A"');
      expect(prompt).toContain('Motion Intensity: 3');
      expect(prompt).toContain('Duration: 5s');
    });

    it('should not contain placeholders', () => {
      const prompt = buildVideoAnalysisInput(mockWorkspace, mockIntentReport);
      expect(prompt).not.toContain('{USER_INTENT}');
      expect(prompt).not.toContain('{GENERATION_PARAMS}');
    });
  });

  describe('validateVideoAnalysisReport', () => {
    it('should pass valid video analysis report', () => {
      const validReport = {
        content_match_score: 0.75,
        issues: [
          {
            category: 'motion_quality',
            description: 'Motion is too fast',
            severity: 'high',
            affected_parameter: 'motion_intensity'
          }
        ],
        technical_quality: {
          resolution: '1280x720',
          clarity_score: 0.85,
          fluency_score: 0.70,
          artifacts: 'Minor artifacts'
        },
        strengths: ['Good camera work'],
        overall_assessment: 'Video quality is good but needs adjustments'
      };

      expect(() => validateVideoAnalysisReport(validReport)).not.toThrow();
    });

    it('should throw error if content_match_score is invalid', () => {
      const invalidReport = {
        content_match_score: 1.5, // Invalid: > 1
        issues: [],
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('Invalid content_match_score');
    });

    it('should throw error if content_match_score is negative', () => {
      const invalidReport = {
        content_match_score: -0.1,
        issues: [],
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('Invalid content_match_score');
    });

    it('should throw error if issues is not an array', () => {
      const invalidReport = {
        content_match_score: 0.75,
        issues: 'not an array',
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('issues must be an array');
    });

    it('should throw error if issue is missing required fields', () => {
      const invalidReport = {
        content_match_score: 0.75,
        issues: [
          {
            category: 'motion_quality'
            // Missing description and severity
          }
        ],
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('Each issue must have category, description, and severity');
    });

    it('should throw error if severity is invalid', () => {
      const invalidReport = {
        content_match_score: 0.75,
        issues: [
          {
            category: 'motion_quality',
            description: 'Test',
            severity: 'critical' // Invalid severity
          }
        ],
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('Invalid severity');
    });

    it('should accept valid severity values', () => {
      ['high', 'medium', 'low'].forEach(severity => {
        const validReport = {
          content_match_score: 0.75,
          issues: [
            {
              category: 'test',
              description: 'Test',
              severity: severity
            }
          ],
          technical_quality: {
            clarity_score: 0.8,
            fluency_score: 0.7
          },
          overall_assessment: 'Test assessment'
        };

        expect(() => validateVideoAnalysisReport(validReport)).not.toThrow();
      });
    });

    it('should throw error if technical_quality is missing', () => {
      const invalidReport = {
        content_match_score: 0.75,
        issues: [],
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('technical_quality must include');
    });

    it('should throw error if clarity_score is missing', () => {
      const invalidReport = {
        content_match_score: 0.75,
        issues: [],
        technical_quality: {
          fluency_score: 0.7
        },
        overall_assessment: 'Test assessment'
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('technical_quality must include clarity_score');
    });

    it('should throw error if overall_assessment is too short', () => {
      const invalidReport = {
        content_match_score: 0.75,
        issues: [],
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Test' // Too short
      };

      expect(() => validateVideoAnalysisReport(invalidReport)).toThrow('overall_assessment must be a meaningful string');
    });

    it('should accept empty issues array', () => {
      const validReport = {
        content_match_score: 0.95,
        issues: [], // No issues is valid
        technical_quality: {
          clarity_score: 0.9,
          fluency_score: 0.9
        },
        overall_assessment: 'Video quality is excellent'
      };

      expect(() => validateVideoAnalysisReport(validReport)).not.toThrow();
    });
  });

  describe('executeVideoAnalysis', () => {
    it('should execute video analysis successfully', async () => {
      const mockVLResponse = `<VIDEO_ANALYSIS>
      {
        "content_match_score": 0.75,
        "issues": [
          {
            "category": "motion_quality",
            "description": "Motion is too fast and doesn't match the slow walking expectation",
            "severity": "high",
            "affected_parameter": "motion_intensity"
          }
        ],
        "technical_quality": {
          "resolution": "1280x720",
          "clarity_score": 0.85,
          "fluency_score": 0.70,
          "artifacts": "Minor compression artifacts"
        },
        "strengths": ["Good camera work", "Clear subject visibility"],
        "overall_assessment": "Video has good technical quality but motion speed doesn't match user's intention"
      }
      </VIDEO_ANALYSIS>`;

      const mockParsedReport = {
        content_match_score: 0.75,
        issues: [
          {
            category: 'motion_quality',
            description: "Motion is too fast and doesn't match the slow walking expectation",
            severity: 'high',
            affected_parameter: 'motion_intensity'
          }
        ],
        technical_quality: {
          resolution: '1280x720',
          clarity_score: 0.85,
          fluency_score: 0.70,
          artifacts: 'Minor compression artifacts'
        },
        strengths: ['Good camera work', 'Clear subject visibility'],
        overall_assessment: "Video has good technical quality but motion speed doesn't match user's intention"
      };

      mockAnalyzeVideoWithQwenVL.mockResolvedValue(mockVLResponse);
      mockParseVideoAnalysis.mockReturnValue(mockParsedReport);

      const result = await executeVideoAnalysis(mockWorkspace, mockIntentReport);

      expect(mockAnalyzeVideoWithQwenVL).toHaveBeenCalledWith(
        mockWorkspace.video.url,
        expect.any(String)
      );
      expect(result.content_match_score).toBe(0.75);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
    });

    it('should throw error if no video URL', async () => {
      const workspaceNoVideo = {
        ...mockWorkspace,
        video: { status: 'pending' }
      };

      await expect(
        executeVideoAnalysis(workspaceNoVideo, mockIntentReport)
      ).rejects.toThrow('No video URL available');
    });

    it('should throw error if no intent report', async () => {
      await expect(
        executeVideoAnalysis(mockWorkspace, null)
      ).rejects.toThrow('Intent report is required');
    });

    it('should throw error if intent report missing user_intent', async () => {
      const invalidIntent = { confidence: 0.8 };

      await expect(
        executeVideoAnalysis(mockWorkspace, invalidIntent)
      ).rejects.toThrow('Intent report is required');
    });

    it('should throw error if parsing fails', async () => {
      mockAnalyzeVideoWithQwenVL.mockResolvedValue('Invalid response');
      mockParseVideoAnalysis.mockReturnValue(null);

      await expect(
        executeVideoAnalysis(mockWorkspace, mockIntentReport)
      ).rejects.toThrow('Agent execution failed (video): parsing');
    });

    it('should handle Qwen VL service errors gracefully', async () => {
      const error = new Error('Qwen VL service unavailable');
      mockAnalyzeVideoWithQwenVL.mockRejectedValue(error);

      await expect(
        executeVideoAnalysis(mockWorkspace, mockIntentReport)
      ).rejects.toThrow('Agent execution failed (video): analysis');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Video analysis failed',
        expect.objectContaining({
          workspaceId: 'test-workspace-id',
          error: 'Qwen VL service unavailable'
        })
      );
    });

    it('should log all key steps', async () => {
      const mockReport = {
        content_match_score: 0.9,
        issues: [],
        technical_quality: {
          clarity_score: 0.9,
          fluency_score: 0.9
        },
        overall_assessment: 'Excellent video quality'
      };

      mockAnalyzeVideoWithQwenVL.mockResolvedValue('<VIDEO_ANALYSIS>{}</VIDEO_ANALYSIS>');
      mockParseVideoAnalysis.mockReturnValue(mockReport);

      await executeVideoAnalysis(mockWorkspace, mockIntentReport);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting video analysis',
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Video analysis prompt built',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calling Qwen VL for video analysis',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Qwen VL analysis completed',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Video analysis report parsed successfully',
        expect.any(Object)
      );
    });

    it('should log issues with different severity levels', async () => {
      const mockReport = {
        content_match_score: 0.6,
        issues: [
          { category: 'test1', description: 'High severity issue', severity: 'high', affected_parameter: 'param1' },
          { category: 'test2', description: 'Medium severity issue', severity: 'medium', affected_parameter: 'param2' },
          { category: 'test3', description: 'Low severity issue', severity: 'low', affected_parameter: 'param3' }
        ],
        technical_quality: {
          clarity_score: 0.8,
          fluency_score: 0.7
        },
        overall_assessment: 'Multiple issues found'
      };

      mockAnalyzeVideoWithQwenVL.mockResolvedValue('<VIDEO_ANALYSIS>{}</VIDEO_ANALYSIS>');
      mockParseVideoAnalysis.mockReturnValue(mockReport);

      await executeVideoAnalysis(mockWorkspace, mockIntentReport);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Video quality issues identified',
        expect.objectContaining({
          highSeverityCount: 1,
          mediumSeverityCount: 1,
          lowSeverityCount: 1
        })
      );
    });

    it('should log when no issues found', async () => {
      const mockReport = {
        content_match_score: 0.95,
        issues: [],
        technical_quality: {
          clarity_score: 0.95,
          fluency_score: 0.95
        },
        overall_assessment: 'Perfect video quality'
      };

      mockAnalyzeVideoWithQwenVL.mockResolvedValue('<VIDEO_ANALYSIS>{}</VIDEO_ANALYSIS>');
      mockParseVideoAnalysis.mockReturnValue(mockReport);

      await executeVideoAnalysis(mockWorkspace, mockIntentReport);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'No significant video quality issues found',
        expect.objectContaining({ workspaceId: 'test-workspace-id' })
      );
    });
  });
});
