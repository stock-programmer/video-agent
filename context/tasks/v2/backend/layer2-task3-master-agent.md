# Backend Layer 2 Task 3: 实现 Master Agent

## 任务元数据

- **任务 ID**: `backend-v2-layer2-task3`
- **任务名称**: 实现 Master Agent
- **所属层级**: Layer 2 - Agent 核心模块
- **预计工时**: 6 小时
- **依赖任务**: B-L2-T1 (Intent Agent), B-L2-T2 (Video Agent)
- **可并行任务**: 无 (Layer 2 最终任务)

---

## 任务目标

实现 Master Agent,协调 Intent Analysis 和 Video Analysis Sub-Agents,并做出最终优化决策。

**核心功能**:
- 分析意图报告和视频分析报告
- 识别不匹配点 (NG 原因)
- 生成优化参数建议
- 记录参数变更及原因

---

## 实现文件

**文件路径**: `backend/src/services/agents/master-agent.js`

---

## 实现步骤

### Step 1: 定义 Master Agent Prompt

```javascript
// backend/src/services/agents/master-agent.js
const logger = require('../../utils/logger');
const { QwenWithTools } = require('./qwen-wrapper');
const { parseOptimizationResult } = require('../../utils/agent-helpers');

/**
 * Master Agent Decision Prompt Template
 */
const MASTER_AGENT_PROMPT = `You are the Master Decision Agent for video generation optimization.

Your task: Compare user's intent with video analysis results, identify mismatches, and propose parameter optimizations.

USER'S ORIGINAL INTENT:
{USER_INTENT}

VIDEO ANALYSIS RESULTS:
{VIDEO_ANALYSIS}

CURRENT PARAMETERS:
{CURRENT_PARAMS}

Your Analysis Steps:

1. **Identify Mismatches (NG Reasons)**:
   - Compare intent vs. actual video quality
   - List specific reasons why current video doesn't meet expectations
   - Focus on actionable issues

2. **Propose Optimized Parameters**:
   - For each identified issue, suggest parameter changes
   - Only change parameters that need adjustment
   - Be conservative: small adjustments are better than large ones

3. **Document Changes**:
   - For each changed parameter, explain why
   - Link changes to specific NG reasons

Output Format (use XML tags):

<NG_REASONS>
[
  "Motion is too fast for 'slowly walking' prompt - doesn't match calm/peaceful mood",
  "Lighting appears darker than expected for outdoor daytime scene",
  "Camera movement is too aggressive for the serene atmosphere intended"
]
</NG_REASONS>

<OPTIMIZED_PARAMS>
{
  "motion_intensity": 2,
  "lighting": "bright",
  "camera_movement": "slow_pan"
}
</OPTIMIZED_PARAMS>

<CHANGES>
[
  {
    "field": "motion_intensity",
    "old_value": 3,
    "new_value": 2,
    "reason": "Reduce motion speed to match 'slowly' in prompt and achieve calm mood"
  },
  {
    "field": "lighting",
    "old_value": "natural",
    "new_value": "bright",
    "reason": "Increase brightness to match outdoor daytime expectation"
  },
  {
    "field": "camera_movement",
    "old_value": "push_in",
    "new_value": "slow_pan",
    "reason": "Switch to gentler camera movement to support serene atmosphere"
  }
]
</CHANGES>

<CONFIDENCE>0.85</CONFIDENCE>

Important Rules:
- Only include parameters that NEED to change (don't repeat unchanged ones)
- Each change must have a clear reason linked to NG reasons
- Confidence should reflect certainty of recommendations (0-1)
- Be specific and actionable
- Prioritize changes that address high-severity issues
`;

/**
 * 构建 Master Agent 输入
 */
function buildMasterAgentInput(workspace, intentReport, videoAnalysis) {
  const { form_data } = workspace;

  // 格式化用户意图
  const userIntent = JSON.stringify({
    scene: intentReport.user_intent.scene_description,
    mood: intentReport.user_intent.desired_mood,
    key_elements: intentReport.user_intent.key_elements,
    motion_expectation: intentReport.user_intent.motion_expectation,
    energy_level: intentReport.user_intent.energy_level
  }, null, 2);

  // 格式化视频分析结果
  const videoAnalysisFormatted = JSON.stringify({
    content_match_score: videoAnalysis.content_match_score,
    issues: videoAnalysis.issues,
    technical_quality: videoAnalysis.technical_quality,
    overall_assessment: videoAnalysis.overall_assessment
  }, null, 2);

  // 格式化当前参数
  const currentParams = JSON.stringify({
    camera_movement: form_data.camera_movement,
    shot_type: form_data.shot_type,
    lighting: form_data.lighting,
    motion_prompt: form_data.motion_prompt,
    motion_intensity: form_data.motion_intensity,
    duration: form_data.duration,
    aspect_ratio: form_data.aspect_ratio,
    quality_preset: form_data.quality_preset
  }, null, 2);

  return MASTER_AGENT_PROMPT
    .replace('{USER_INTENT}', userIntent)
    .replace('{VIDEO_ANALYSIS}', videoAnalysisFormatted)
    .replace('{CURRENT_PARAMS}', currentParams);
}
```

### Step 2: 实现执行函数

```javascript
/**
 * 执行 Master Agent 决策
 * @param {object} workspace - MongoDB workspace document
 * @param {object} intentReport - 意图报告
 * @param {object} videoAnalysis - 视频分析报告
 * @returns {Promise<object>} 优化结果
 */
async function executeMasterAgentDecision(workspace, intentReport, videoAnalysis) {
  const workspaceId = workspace._id.toString();

  logger.info('Starting Master Agent decision', {
    workspaceId,
    intentConfidence: intentReport.confidence,
    videoMatchScore: videoAnalysis.content_match_score,
    videoIssueCount: videoAnalysis.issues?.length || 0
  });

  try {
    // 1. 构建决策 Prompt
    const prompt = buildMasterAgentInput(workspace, intentReport, videoAnalysis);

    logger.debug('Master Agent prompt built', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 300)
    });

    // 2. 创建 Qwen 模型
    const qwenModel = new QwenWithTools({
      model: 'qwen-plus',
      temperature: 0.2, // Lower temperature for more consistent decisions
      alibabaApiKey: process.env.DASHSCOPE_API_KEY
    });

    logger.debug('Qwen model created for Master Agent', {
      model: 'qwen-plus',
      temperature: 0.2
    });

    // 3. 调用 LLM
    const startTime = Date.now();

    logger.info('Calling Qwen LLM for Master Agent decision', { workspaceId });

    const response = await qwenModel.invoke([
      { role: 'user', content: prompt }
    ]);

    const duration = Date.now() - startTime;

    logger.info('Master Agent LLM response received', {
      workspaceId,
      duration,
      responseLength: response.content?.length || 0
    });

    logger.debug('Master Agent response preview', {
      content: response.content?.substring(0, 500)
    });

    // 4. 解析结果
    const optimizationResult = parseOptimizationResult(response.content);

    if (!optimizationResult) {
      throw new Error('Failed to parse optimization result from LLM response');
    }

    logger.info('Master Agent decision completed', {
      workspaceId,
      ngReasonCount: optimizationResult.ng_reasons?.length || 0,
      changeCount: optimizationResult.changes?.length || 0,
      confidence: optimizationResult.confidence,
      duration
    });

    // 5. 记录决策详情
    if (optimizationResult.ng_reasons && optimizationResult.ng_reasons.length > 0) {
      logger.info('NG reasons identified', {
        workspaceId,
        reasons: optimizationResult.ng_reasons
      });
    }

    if (optimizationResult.changes && optimizationResult.changes.length > 0) {
      logger.info('Parameter changes proposed', {
        workspaceId,
        changedFields: optimizationResult.changes.map(c => c.field)
      });

      optimizationResult.changes.forEach((change, index) => {
        logger.debug(`Change ${index + 1}`, {
          field: change.field,
          oldValue: change.old_value,
          newValue: change.new_value,
          reason: change.reason.substring(0, 100)
        });
      });
    }

    // 6. 验证优化结果
    validateOptimizationResult(optimizationResult, workspace.form_data);

    return optimizationResult;

  } catch (error) {
    logger.error('Master Agent decision failed', {
      workspaceId,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Master Agent decision failed: ${error.message}`);
  }
}

/**
 * 验证优化结果
 */
function validateOptimizationResult(result, currentFormData) {
  // 验证必要字段
  if (!Array.isArray(result.ng_reasons) || result.ng_reasons.length === 0) {
    throw new Error('ng_reasons must be a non-empty array');
  }

  if (!result.optimized_params || typeof result.optimized_params !== 'object') {
    throw new Error('optimized_params must be an object');
  }

  if (!Array.isArray(result.changes) || result.changes.length === 0) {
    throw new Error('changes must be a non-empty array');
  }

  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    throw new Error('confidence must be a number between 0 and 1');
  }

  // 验证每个 change
  for (const change of result.changes) {
    if (!change.field || !change.reason) {
      throw new Error('Each change must have field and reason');
    }

    if (change.old_value === undefined || change.new_value === undefined) {
      throw new Error('Each change must have old_value and new_value');
    }

    // 验证 field 存在于 currentFormData
    if (!(change.field in currentFormData)) {
      logger.warn('Change field not in current form_data', {
        field: change.field,
        availableFields: Object.keys(currentFormData)
      });
    }

    // 验证 old_value 匹配当前值
    if (currentFormData[change.field] !== change.old_value) {
      logger.warn('old_value mismatch', {
        field: change.field,
        expectedOld: currentFormData[change.field],
        reportedOld: change.old_value
      });
    }
  }

  // 验证 optimized_params 只包含被修改的字段
  const changedFields = result.changes.map(c => c.field);
  for (const field in result.optimized_params) {
    if (!changedFields.includes(field)) {
      logger.warn('optimized_params contains unchanged field', {
        field,
        changedFields
      });
    }
  }

  logger.debug('Optimization result validation passed');
}

module.exports = {
  executeMasterAgentDecision,
  buildMasterAgentInput
};
```

### Step 3: 单元测试

```javascript
// backend/src/services/agents/__tests__/master-agent.test.js
const { executeMasterAgentDecision, buildMasterAgentInput } = require('../master-agent');
const { QwenWithTools } = require('../qwen-wrapper');

jest.mock('../qwen-wrapper');
jest.mock('../../../utils/logger');

describe('Master Agent', () => {
  const mockWorkspace = {
    _id: 'test-id',
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

    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue(mockResponse);

    const result = await executeMasterAgentDecision(
      mockWorkspace,
      mockIntentReport,
      mockVideoAnalysis
    );

    expect(result.ng_reasons).toHaveLength(2);
    expect(result.changes).toHaveLength(2);
    expect(result.optimized_params.motion_intensity).toBe(2);
    expect(result.confidence).toBe(0.85);
    expect(QwenWithTools.prototype.invoke).toHaveBeenCalledTimes(1);
  });

  it('should throw error if parsing fails', async () => {
    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue({
      content: 'Invalid response without XML tags'
    });

    await expect(
      executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis)
    ).rejects.toThrow('Failed to parse');
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

    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue(invalidResponse);

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

    QwenWithTools.prototype.invoke = jest.fn().mockResolvedValue(mockResponse);

    await executeMasterAgentDecision(mockWorkspace, mockIntentReport, mockVideoAnalysis);

    expect(QwenWithTools).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.2
      })
    );
  });
});
```

---

## 验收标准

- [ ] Prompt 模板完整,包含意图、视频分析、当前参数对比
- [ ] 能成功调用 Qwen LLM 并获取响应
- [ ] 正确解析所有 XML 标签 (NG_REASONS, OPTIMIZED_PARAMS, CHANGES, CONFIDENCE)
- [ ] 验证优化结果的完整性和正确性
- [ ] 验证 old_value 与当前参数一致
- [ ] 完整的日志记录 (请求、响应、决策详情、耗时)
- [ ] 使用较低 temperature (0.2) 保证决策一致性
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd backend
npm test -- master-agent.test.js
```

---

## 参考文档

- `context/tasks/v2/v2-agent-system-design.md` - Master Agent 部分
- `context/tasks/v2/v2-backend-architecture.md` - Agent 核心模块
- `context/third-part/job-assistant-qwen.js` - Multi-agent 实现参考
