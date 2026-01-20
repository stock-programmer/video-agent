import {
  parseIntentReport,
  parseVideoAnalysis,
  parseOptimizationResult,
  buildAgentContext,
  buildIntentAnalysisPrompt,
  buildVideoAnalysisPrompt,
  validateOptimizationResult
} from '../agent-helpers.js';

describe('Agent Helpers', () => {
  // ============================================================
  // 测试输出解析函数
  // ============================================================

  describe('parseIntentReport', () => {
    it('should parse valid intent report', () => {
      const text = `<INTENT_REPORT>
      {
        "user_intent": {
          "scene_description": "test",
          "desired_mood": "calm",
          "key_elements": ["water", "sky"],
          "motion_expectation": "slow pan"
        },
        "confidence": 0.85
      }
      </INTENT_REPORT>`;

      const result = parseIntentReport(text);

      expect(result).not.toBeNull();
      expect(result.confidence).toBe(0.85);
      expect(result.user_intent.scene_description).toBe('test');
      expect(result.user_intent.desired_mood).toBe('calm');
    });

    it('should return null if no tag found', () => {
      const result = parseIntentReport('No tags here');
      expect(result).toBeNull();
    });

    it('should return null if JSON is invalid', () => {
      const text = '<INTENT_REPORT>invalid json</INTENT_REPORT>';
      const result = parseIntentReport(text);
      expect(result).toBeNull();
    });

    it('should handle extra whitespace', () => {
      const text = `
        <INTENT_REPORT>
          {
            "user_intent": {
              "scene_description": "test"
            },
            "confidence": 0.9
          }
        </INTENT_REPORT>
      `;
      const result = parseIntentReport(text);
      expect(result).not.toBeNull();
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('parseVideoAnalysis', () => {
    it('should parse valid video analysis', () => {
      const text = `<VIDEO_ANALYSIS>
      {
        "content_match_score": 7.5,
        "issues": ["lighting too dark", "motion too fast"],
        "technical_quality": {
          "resolution": "1080p",
          "fps": 30
        }
      }
      </VIDEO_ANALYSIS>`;

      const result = parseVideoAnalysis(text);

      expect(result).not.toBeNull();
      expect(result.content_match_score).toBe(7.5);
      expect(result.issues).toHaveLength(2);
      expect(result.technical_quality.resolution).toBe('1080p');
    });

    it('should return null if no tag found', () => {
      const result = parseVideoAnalysis('No tags here');
      expect(result).toBeNull();
    });

    it('should return null if JSON is invalid', () => {
      const text = '<VIDEO_ANALYSIS>invalid json</VIDEO_ANALYSIS>';
      const result = parseVideoAnalysis(text);
      expect(result).toBeNull();
    });
  });

  describe('parseOptimizationResult', () => {
    it('should parse complete optimization result', () => {
      const text = `
      <NG_REASONS>
      - Reason 1
      - Reason 2
      - Reason 3
      </NG_REASONS>

      <OPTIMIZED_PARAMS>
      {"motion_intensity": 2, "duration": 10}
      </OPTIMIZED_PARAMS>

      <CHANGES>
      [
        {"field": "motion_intensity", "old_value": 3, "new_value": 2, "reason": "test reason 1"},
        {"field": "duration", "old_value": 5, "new_value": 10, "reason": "test reason 2"}
      ]
      </CHANGES>
      `;

      const result = parseOptimizationResult(text);

      expect(result.ng_reasons).toHaveLength(3);
      expect(result.ng_reasons[0]).toBe('Reason 1');
      expect(result.optimized_params.motion_intensity).toBe(2);
      expect(result.optimized_params.duration).toBe(10);
      expect(result.changes).toHaveLength(2);
      expect(result.confidence).toBe(0.8);
    });

    it('should handle missing NG_REASONS tag', () => {
      const text = `
      <OPTIMIZED_PARAMS>
      {"motion_intensity": 2}
      </OPTIMIZED_PARAMS>

      <CHANGES>
      [{"field": "motion_intensity", "old_value": 3, "new_value": 2, "reason": "test"}]
      </CHANGES>
      `;

      const result = parseOptimizationResult(text);

      expect(result.ng_reasons).toHaveLength(0);
      expect(result.optimized_params.motion_intensity).toBe(2);
    });

    it('should handle invalid JSON in OPTIMIZED_PARAMS', () => {
      const text = `
      <NG_REASONS>
      - Reason 1
      </NG_REASONS>

      <OPTIMIZED_PARAMS>
      invalid json
      </OPTIMIZED_PARAMS>

      <CHANGES>
      [{"field": "test"}]
      </CHANGES>
      `;

      const result = parseOptimizationResult(text);

      expect(result.ng_reasons).toHaveLength(1);
      expect(result.optimized_params).toEqual({});
    });

    it('should handle invalid JSON in CHANGES', () => {
      const text = `
      <NG_REASONS>
      - Reason 1
      </NG_REASONS>

      <OPTIMIZED_PARAMS>
      {"motion_intensity": 2}
      </OPTIMIZED_PARAMS>

      <CHANGES>
      invalid json
      </CHANGES>
      `;

      const result = parseOptimizationResult(text);

      expect(result.changes).toEqual([]);
    });

    it('should filter out non-list items in NG_REASONS', () => {
      const text = `
      <NG_REASONS>
      - Reason 1
      Some text without dash
      - Reason 2
      </NG_REASONS>

      <OPTIMIZED_PARAMS>
      {}
      </OPTIMIZED_PARAMS>

      <CHANGES>
      []
      </CHANGES>
      `;

      const result = parseOptimizationResult(text);

      expect(result.ng_reasons).toHaveLength(2);
      expect(result.ng_reasons).toEqual(['Reason 1', 'Reason 2']);
    });
  });

  // ============================================================
  // 测试上下文构建函数
  // ============================================================

  describe('buildAgentContext', () => {
    it('should build valid context string', () => {
      const workspace = {
        _id: '12345',
        image_url: 'http://example.com/image.jpg',
        form_data: {
          camera_movement: 'pan',
          shot_type: 'wide',
          lighting: 'natural',
          motion_prompt: 'slow movement',
          duration: 10,
          aspect_ratio: '16:9',
          motion_intensity: 3,
          quality_preset: 'high'
        },
        video: {
          url: 'http://example.com/video.mp4'
        }
      };

      const context = buildAgentContext(workspace);

      expect(context).toContain('http://example.com/image.jpg');
      expect(context).toContain('pan');
      expect(context).toContain('wide');
      expect(context).toContain('natural');
      expect(context).toContain('slow movement');
      expect(context).toContain('10s');
      expect(context).toContain('16:9');
      expect(context).toContain('3');
      expect(context).toContain('high');
      expect(context).toContain('http://example.com/video.mp4');
    });

    it('should handle missing form_data fields with defaults', () => {
      const workspace = {
        _id: '12345',
        image_url: 'http://example.com/image.jpg',
        form_data: {},
        video: {
          url: 'http://example.com/video.mp4'
        }
      };

      const context = buildAgentContext(workspace);

      expect(context).toContain('N/A');
      expect(context).toContain('5s');
      expect(context).toContain('16:9');
      expect(context).toContain('3');
      expect(context).toContain('standard');
    });
  });

  describe('buildIntentAnalysisPrompt', () => {
    it('should build valid intent analysis prompt', () => {
      const workspace = {
        form_data: {}
      };

      const prompt = buildIntentAnalysisPrompt(workspace);

      expect(prompt).toContain('TRUE INTENT');
      expect(prompt).toContain('scene_description');
      expect(prompt).toContain('desired_mood');
      expect(prompt).toContain('key_elements');
      expect(prompt).toContain('motion_expectation');
      expect(prompt).toContain('<INTENT_REPORT>');
    });
  });

  describe('buildVideoAnalysisPrompt', () => {
    it('should build valid video analysis prompt', () => {
      const workspace = {
        video: {
          url: 'http://example.com/video.mp4'
        }
      };

      const confirmedIntent = {
        user_intent: {
          scene_description: 'test scene',
          desired_mood: 'calm'
        }
      };

      const prompt = buildVideoAnalysisPrompt(workspace, confirmedIntent);

      expect(prompt).toContain('http://example.com/video.mp4');
      expect(prompt).toContain('test scene');
      expect(prompt).toContain('calm');
      expect(prompt).toContain('content_match_score');
      expect(prompt).toContain('<VIDEO_ANALYSIS>');
    });
  });

  // ============================================================
  // 测试数据验证函数
  // ============================================================

  describe('validateOptimizationResult', () => {
    it('should pass valid result', () => {
      const result = {
        ng_reasons: ['Reason 1', 'Reason 2'],
        changes: [{ field: 'test' }],
        confidence: 0.8
      };

      expect(() => validateOptimizationResult(result)).not.toThrow();
    });

    it('should throw on missing ng_reasons', () => {
      const result = {
        ng_reasons: [],
        changes: [{ field: 'test' }],
        confidence: 0.8
      };

      expect(() => validateOptimizationResult(result)).toThrow('ng_reasons is required');
    });

    it('should throw on missing changes', () => {
      const result = {
        ng_reasons: ['Reason 1'],
        changes: [],
        confidence: 0.8
      };

      expect(() => validateOptimizationResult(result)).toThrow('changes is required');
    });

    it('should throw on invalid confidence (too high)', () => {
      const result = {
        ng_reasons: ['Reason 1'],
        changes: [{ field: 'test' }],
        confidence: 1.5
      };

      expect(() => validateOptimizationResult(result)).toThrow('confidence must be between 0 and 1');
    });

    it('should throw on invalid confidence (negative)', () => {
      const result = {
        ng_reasons: ['Reason 1'],
        changes: [{ field: 'test' }],
        confidence: -0.1
      };

      expect(() => validateOptimizationResult(result)).toThrow('confidence must be between 0 and 1');
    });

    it('should throw on multiple validation errors', () => {
      const result = {
        ng_reasons: [],
        changes: [],
        confidence: 1.5
      };

      expect(() => validateOptimizationResult(result)).toThrow();
    });

    it('should accept confidence at boundaries', () => {
      const result1 = {
        ng_reasons: ['Reason 1'],
        changes: [{ field: 'test' }],
        confidence: 0
      };

      const result2 = {
        ng_reasons: ['Reason 1'],
        changes: [{ field: 'test' }],
        confidence: 1
      };

      expect(() => validateOptimizationResult(result1)).not.toThrow();
      expect(() => validateOptimizationResult(result2)).not.toThrow();
    });
  });
});
