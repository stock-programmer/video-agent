# Backend Layer 1 Task 2: 实现 Agent 辅助工具

## 任务元数据

- **任务 ID**: `backend-v2-layer1-task2`
- **任务名称**: 实现 Agent 辅助工具函数
- **所属层级**: Layer 1 - 基础工具模块
- **预计工时**: 2 小时
- **依赖任务**: 无 (Layer 1 起始任务)
- **可并行任务**: `layer1-task1`, `layer1-task3`

---

## 任务目标

实现 Agent 系统所需的辅助工具函数,包括输出解析、上下文构建、数据验证等。

---

## 实现文件

**文件路径**: `backend/src/utils/agent-helpers.js`

---

## 实现步骤

### Step 1: 输出解析函数

```javascript
// backend/src/utils/agent-helpers.js
const logger = require('./logger');

/**
 * 从 Agent 输出中提取意图报告
 * @param {string} text - Agent 输出文本
 * @returns {object|null} 解析后的意图报告
 */
function parseIntentReport(text) {
  logger.debug('Parsing intent report', { textLength: text.length });

  const pattern = /<INTENT_REPORT>\s*(.*?)\s*<\/INTENT_REPORT>/is;
  const match = text.match(pattern);

  if (!match) {
    logger.warn('No <INTENT_REPORT> tag found in text');
    return null;
  }

  try {
    const jsonStr = match[1].trim();
    const report = JSON.parse(jsonStr);

    logger.debug('Successfully parsed intent report', {
      confidence: report.confidence
    });

    return report;
  } catch (error) {
    logger.error('Failed to parse intent report JSON', {
      error: error.message,
      matchedText: match[1].substring(0, 200)
    });
    return null;
  }
}

/**
 * 从 Agent 输出中提取视频分析
 * @param {string} text - Agent 输出文本
 * @returns {object|null}
 */
function parseVideoAnalysis(text) {
  logger.debug('Parsing video analysis', { textLength: text.length });

  const pattern = /<VIDEO_ANALYSIS>\s*(.*?)\s*<\/VIDEO_ANALYSIS>/is;
  const match = text.match(pattern);

  if (!match) {
    logger.warn('No <VIDEO_ANALYSIS> tag found');
    return null;
  }

  try {
    const jsonStr = match[1].trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Failed to parse video analysis JSON', {
      error: error.message
    });
    return null;
  }
}

/**
 * 从 Agent 输出中提取优化结果
 * @param {string} text - Agent 输出文本
 * @returns {object}
 */
function parseOptimizationResult(text) {
  logger.debug('Parsing optimization result', { textLength: text.length });

  // 提取 NG 原因
  const ngMatch = text.match(/<NG_REASONS>\s*(.*?)\s*<\/NG_REASONS>/is);
  const ng_reasons = ngMatch
    ? ngMatch[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];

  // 提取优化参数
  const paramsMatch = text.match(/<OPTIMIZED_PARAMS>\s*(.*?)\s*<\/OPTIMIZED_PARAMS>/is);
  let optimized_params = {};
  if (paramsMatch) {
    try {
      optimized_params = JSON.parse(paramsMatch[1].trim());
    } catch (e) {
      logger.error('Failed to parse optimized params', { error: e.message });
    }
  }

  // 提取变更列表
  const changesMatch = text.match(/<CHANGES>\s*(.*?)\s*<\/CHANGES>/is);
  let changes = [];
  if (changesMatch) {
    try {
      changes = JSON.parse(changesMatch[1].trim());
    } catch (e) {
      logger.error('Failed to parse changes', { error: e.message });
    }
  }

  const result = {
    ng_reasons,
    optimized_params,
    changes,
    confidence: 0.8  // 默认值
  };

  logger.info('Parsed optimization result', {
    ngReasonsCount: ng_reasons.length,
    changesCount: changes.length
  });

  return result;
}
```

### Step 2: 上下文构建函数

```javascript
/**
 * 构建 Agent 输入上下文
 * @param {object} workspace - MongoDB workspace document
 * @returns {string} 格式化的上下文字符串
 */
function buildAgentContext(workspace) {
  const { form_data, image_url, video } = workspace;

  const context = `User's video generation parameters:
- Image: ${image_url}
- Camera Movement: ${form_data.camera_movement || 'N/A'}
- Shot Type: ${form_data.shot_type || 'N/A'}
- Lighting: ${form_data.lighting || 'N/A'}
- Motion Prompt: ${form_data.motion_prompt || 'N/A'}
- Duration: ${form_data.duration || 5}s
- Aspect Ratio: ${form_data.aspect_ratio || '16:9'}
- Motion Intensity: ${form_data.motion_intensity || 3}
- Quality: ${form_data.quality_preset || 'standard'}

Generated Video: ${video.url}

Task: Analyze user intent, evaluate video quality, and suggest optimizations.`;

  logger.debug('Built agent context', {
    workspaceId: workspace._id,
    contextLength: context.length
  });

  return context;
}

/**
 * 构建意图分析 Prompt
 */
function buildIntentAnalysisPrompt(workspace) {
  // 详细 prompt 见 v2-agent-system-design.md
  return `Based on the user's input parameters, analyze their TRUE INTENT.

Output JSON format:
{
  "user_intent": {
    "scene_description": "...",
    "desired_mood": "...",
    "key_elements": ["..."],
    "motion_expectation": "..."
  },
  "confidence": 0.85
}

Wrap output in <INTENT_REPORT>...</INTENT_REPORT>`;
}

/**
 * 构建视频分析 Prompt
 */
function buildVideoAnalysisPrompt(workspace, confirmedIntent) {
  return `Analyze the generated video and compare with user intent.

Video URL: ${workspace.video.url}

User Intent:
${JSON.stringify(confirmedIntent.user_intent, null, 2)}

Output JSON format:
{
  "content_match_score": 7.5,
  "issues": [...],
  "technical_quality": {...}
}

Wrap output in <VIDEO_ANALYSIS>...</VIDEO_ANALYSIS>`;
}
```

### Step 3: 数据验证函数

```javascript
/**
 * 验证优化结果
 */
function validateOptimizationResult(result) {
  const errors = [];

  if (!result.ng_reasons || result.ng_reasons.length === 0) {
    errors.push('ng_reasons is required');
  }

  if (!result.changes || result.changes.length === 0) {
    errors.push('changes is required');
  }

  if (result.confidence < 0 || result.confidence > 1) {
    errors.push('confidence must be between 0 and 1');
  }

  if (errors.length > 0) {
    logger.error('Optimization result validation failed', { errors });
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

module.exports = {
  parseIntentReport,
  parseVideoAnalysis,
  parseOptimizationResult,
  buildAgentContext,
  buildIntentAnalysisPrompt,
  buildVideoAnalysisPrompt,
  validateOptimizationResult
};
```

### Step 4: 单元测试

```javascript
// backend/src/utils/__tests__/agent-helpers.test.js
const {
  parseIntentReport,
  parseOptimizationResult,
  validateOptimizationResult
} = require('../agent-helpers');

describe('Agent Helpers', () => {
  describe('parseIntentReport', () => {
    it('should parse valid intent report', () => {
      const text = `<INTENT_REPORT>
      {
        "user_intent": {
          "scene_description": "test",
          "desired_mood": "calm"
        },
        "confidence": 0.85
      }
      </INTENT_REPORT>`;

      const result = parseIntentReport(text);

      expect(result).not.toBeNull();
      expect(result.confidence).toBe(0.85);
    });

    it('should return null if no tag found', () => {
      const result = parseIntentReport('No tags here');
      expect(result).toBeNull();
    });
  });

  describe('parseOptimizationResult', () => {
    it('should parse complete optimization result', () => {
      const text = `
      <NG_REASONS>
      - Reason 1
      - Reason 2
      </NG_REASONS>

      <OPTIMIZED_PARAMS>
      {"motion_intensity": 2}
      </OPTIMIZED_PARAMS>

      <CHANGES>
      [{"field": "motion_intensity", "old_value": 3, "new_value": 2, "reason": "test"}]
      </CHANGES>
      `;

      const result = parseOptimizationResult(text);

      expect(result.ng_reasons).toHaveLength(2);
      expect(result.optimized_params.motion_intensity).toBe(2);
      expect(result.changes).toHaveLength(1);
    });
  });

  describe('validateOptimizationResult', () => {
    it('should pass valid result', () => {
      const result = {
        ng_reasons: ['Reason 1'],
        changes: [{ field: 'test' }],
        confidence: 0.8
      };

      expect(() => validateOptimizationResult(result)).not.toThrow();
    });

    it('should throw on invalid result', () => {
      const result = {
        ng_reasons: [],
        changes: [],
        confidence: 1.5
      };

      expect(() => validateOptimizationResult(result)).toThrow();
    });
  });
});
```

---

## 验收标准

- [ ] 所有解析函数能正确提取 XML 标签内容
- [ ] JSON 解析错误能被正确捕获和记录
- [ ] 上下文构建函数输出格式正确
- [ ] 数据验证能识别所有无效情况
- [ ] 单元测试覆盖率 ≥ 90%
- [ ] 所有函数都有日志记录

---

## 参考文档

- `context/tasks/v2/v2-agent-system-design.md` - Prompt 设计
- `context/tasks/v2/v2-backend-architecture.md` - Agent 辅助工具部分
