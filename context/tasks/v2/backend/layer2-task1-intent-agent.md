# Backend Layer 2 Task 1: 实现 Intent Analysis Sub-Agent

## 任务元数据

- **任务 ID**: `backend-v2-layer2-task1`
- **任务名称**: 实现 Intent Analysis Sub-Agent
- **所属层级**: Layer 2 - Agent 核心模块
- **预计工时**: 4 小时
- **依赖任务**: B-L1-T2 (Agent Helpers), B-L1-T3 (QwenWithTools)
- **可并行任务**: B-L2-T2 (Video Analysis Agent)

---

## 任务目标

实现意图分析 Sub-Agent,分析用户输入参数并推断真实意图。

**核心功能**:
- 构建意图分析 Prompt
- 调用 Qwen LLM 执行推理
- 解析意图报告 (JSON 格式)
- 完整的请求/响应日志

---

## 实现文件

**文件路径**: `backend/src/services/agents/intent-agent.js`

---

## 实现步骤

### Step 1: 定义 Intent Analysis Prompt

```javascript
// backend/src/services/agents/intent-agent.js
const logger = require('../../utils/logger');
const { QwenWithTools } = require('./qwen-wrapper');
const { parseIntentReport } = require('../../utils/agent-helpers');

/**
 * Intent Analysis Prompt Template
 */
const INTENT_ANALYSIS_PROMPT = `You are an Intent Analysis Specialist for video generation.

Task: Based on user's input parameters, infer their TRUE INTENT.

Input Parameters:
{INPUT_PARAMS}

Analysis Steps:
1. **Visual Analysis**: What does the image show? (scene, subjects, composition, mood)
2. **Parameter Interpretation**: What do the chosen parameters suggest?
3. **Motion Intent**: What kind of movement does the user expect? (speed, style, energy)
4. **Mood Inference**: What emotional tone is desired? (calm, energetic, dramatic, etc.)
5. **Contradiction Check**: Are there conflicts between parameters and image content?

Output JSON (wrap in <INTENT_REPORT>...</INTENT_REPORT>):
{
  "user_intent": {
    "scene_description": "A person standing in a park with trees and natural lighting",
    "desired_mood": "Calm, peaceful, leisurely",
    "key_elements": ["person", "outdoor environment", "natural light", "trees"],
    "motion_expectation": "Slow, gentle walking motion without sudden movements",
    "energy_level": "low-to-medium (relaxed pace)"
  },
  "parameter_analysis": {
    "aligned": ["natural lighting matches outdoor scene", "medium shot appropriate for single person"],
    "potential_issues": ["motion_intensity=3 might be too fast for 'slowly' in prompt"]
  },
  "confidence": 0.85
}

Important:
- Do NOT analyze the generated video (that's video-analysis agent's job)
- Focus on understanding what user WANTS, not what they GOT
- Be specific and concrete in descriptions
- Confidence should reflect certainty of your intent interpretation (0-1)
`;

/**
 * 构建意图分析输入
 */
function buildIntentAnalysisInput(workspace) {
  const { form_data, image_url } = workspace;

  const params = `
Image: ${image_url}
Camera Movement: ${form_data.camera_movement || 'N/A'}
Shot Type: ${form_data.shot_type || 'N/A'}
Lighting: ${form_data.lighting || 'N/A'}
Motion Prompt: "${form_data.motion_prompt || 'N/A'}"
Duration: ${form_data.duration || 5}s
Aspect Ratio: ${form_data.aspect_ratio || '16:9'}
Motion Intensity: ${form_data.motion_intensity || 3}
Quality: ${form_data.quality_preset || 'standard'}
`;

  return INTENT_ANALYSIS_PROMPT.replace('{INPUT_PARAMS}', params.trim());
}
```

### Step 2: 实现执行函数

```javascript
/**
 * 执行意图分析
 * @param {object} workspace - MongoDB workspace document
 * @returns {Promise<object>} 意图报告
 */
async function executeIntentAnalysis(workspace) {
  const workspaceId = workspace._id.toString();

  logger.info('Starting intent analysis', {
    workspaceId,
    hasImage: !!workspace.image_url,
    hasMotionPrompt: !!workspace.form_data?.motion_prompt
  });

  try {
    // 1. 构建 Prompt
    const prompt = buildIntentAnalysisInput(workspace);

    logger.debug('Intent analysis prompt built', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200)
    });

    // 2. 创建 Qwen 模型
    const qwenModel = new QwenWithTools({
      model: 'qwen-plus',
      temperature: 0.3,
      alibabaApiKey: process.env.DASHSCOPE_API_KEY
    });

    logger.debug('Qwen model created for intent analysis', {
      model: 'qwen-plus',
      temperature: 0.3
    });

    // 3. 调用 LLM
    const startTime = Date.now();

    logger.info('Calling Qwen LLM for intent analysis', { workspaceId });

    const response = await qwenModel.invoke([
      { role: 'user', content: prompt }
    ]);

    const duration = Date.now() - startTime;

    logger.info('Qwen LLM response received', {
      workspaceId,
      duration,
      responseLength: response.content?.length || 0
    });

    logger.debug('Intent analysis response preview', {
      content: response.content?.substring(0, 500)
    });

    // 4. 解析结果
    const intentReport = parseIntentReport(response.content);

    if (!intentReport) {
      throw new Error('Failed to parse intent report from LLM response');
    }

    logger.info('Intent analysis completed successfully', {
      workspaceId,
      confidence: intentReport.confidence,
      hasIntent: !!intentReport.user_intent,
      duration
    });

    // 5. 验证必要字段
    validateIntentReport(intentReport);

    return intentReport;

  } catch (error) {
    logger.error('Intent analysis failed', {
      workspaceId,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Intent analysis failed: ${error.message}`);
  }
}

/**
 * 验证意图报告
 */
function validateIntentReport(report) {
  const required = ['scene_description', 'desired_mood', 'motion_expectation'];

  for (const field of required) {
    if (!report.user_intent || !report.user_intent[field]) {
      throw new Error(`Missing required field in intent report: ${field}`);
    }
  }

  if (typeof report.confidence !== 'number' || report.confidence < 0 || report.confidence > 1) {
    throw new Error('Invalid confidence value (must be 0-1)');
  }

  logger.debug('Intent report validation passed');
}

module.exports = {
  executeIntentAnalysis,
  buildIntentAnalysisInput
};
```

### Step 3: 单元测试

```javascript
// backend/src/services/agents/__tests__/intent-agent.test.js
const { executeIntentAnalysis, buildIntentAnalysisInput } = require('../intent-agent');
const { QwenWithTools } = require('../qwen-wrapper');

jest.mock('../qwen-wrapper');
jest.mock('../../utils/logger');

describe('Intent Analysis Agent', () => {
  const mockWorkspace = {
    _id: 'test-id',
    image_url: 'http://localhost/test.jpg',
    form_data: {
      camera_movement: 'push_in',
      motion_prompt: 'person walking slowly',
      motion_intensity: 3
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build intent analysis prompt', () => {
    const prompt = buildIntentAnalysisInput(mockWorkspace);

    expect(prompt).toContain('Image: http://localhost/test.jpg');
    expect(prompt).toContain('Motion Prompt: "person walking slowly"');
    expect(prompt).toContain('Motion Intensity: 3');
  });

  it('should execute intent analysis successfully', async () => {
    const mockResponse = {
      content: `<INTENT_REPORT>
      {
        "user_intent": {
          "scene_description": "Test scene",
          "desired_mood": "calm",
          "key_elements": ["person"],
          "motion_expectation": "slow walk"
        },
        "confidence": 0.85
      }
      </INTENT_REPORT>`
    };

    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue(mockResponse);

    const result = await executeIntentAnalysis(mockWorkspace);

    expect(result.user_intent.scene_description).toBe('Test scene');
    expect(result.confidence).toBe(0.85);
    expect(QwenWithTools.prototype.invoke).toHaveBeenCalledTimes(1);
  });

  it('should throw error if parsing fails', async () => {
    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue({
      content: 'Invalid response without tags'
    });

    await expect(executeIntentAnalysis(mockWorkspace)).rejects.toThrow('Failed to parse');
  });

  it('should validate intent report fields', async () => {
    const mockResponse = {
      content: `<INTENT_REPORT>
      {
        "user_intent": {
          "scene_description": "Test"
        },
        "confidence": 0.8
      }
      </INTENT_REPORT>`
    };

    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue(mockResponse);

    await expect(executeIntentAnalysis(mockWorkspace)).rejects.toThrow('Missing required field');
  });
});
```

---

## 验收标准

- [ ] Prompt 模板完整,包含所有必要指令
- [ ] 能成功调用 Qwen LLM 并获取响应
- [ ] 正确解析 `<INTENT_REPORT>` 标签内的 JSON
- [ ] 验证必要字段存在且类型正确
- [ ] 完整的日志记录 (请求、响应、耗时、错误)
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd backend
npm test -- intent-agent.test.js
```

---

## 参考文档

- `context/tasks/v2/v2-agent-system-design.md` - Intent Analysis 部分
- `context/tasks/v2/v2-backend-architecture.md` - Agent 核心模块
