# Backend Layer 2 Task 2: 实现 Video Analysis Sub-Agent

## 任务元数据

- **任务 ID**: `backend-v2-layer2-task2`
- **任务名称**: 实现 Video Analysis Sub-Agent
- **所属层级**: Layer 2 - Agent 核心模块
- **预计工时**: 4 小时
- **依赖任务**: B-L1-T1 (Qwen VL), B-L1-T2 (Agent Helpers), B-L1-T3 (QwenWithTools)
- **可并行任务**: B-L2-T1 (Intent Analysis Agent)

---

## 任务目标

实现视频分析 Sub-Agent,分析生成的视频质量并对比用户意图。

**核心功能**:
- 调用 Qwen VL 服务分析视频
- 对比视频内容与用户意图
- 识别视频质量问题
- 生成结构化分析报告

---

## 实现文件

**文件路径**: `backend/src/services/agents/video-agent.js`

---

## 实现步骤

### Step 1: 定义 Video Analysis Prompt

```javascript
// backend/src/services/agents/video-agent.js
const logger = require('../../utils/logger');
const { analyzeVideoWithQwenVL } = require('../qwen-vl');
const { parseVideoAnalysisReport } = require('../../utils/agent-helpers');

/**
 * Video Analysis Prompt Template
 */
const VIDEO_ANALYSIS_PROMPT = `You are a Video Quality Analysis Specialist.

Task: Analyze the generated video and compare it against the user's original intent.

USER'S ORIGINAL INTENT:
{USER_INTENT}

GENERATION PARAMETERS USED:
{GENERATION_PARAMS}

Your Analysis Steps:
1. **Content Match Check**: Does the video content match the intended scene?
2. **Motion Quality**: Is the motion smooth, natural, and matches expected intensity?
3. **Technical Quality**: Check resolution, clarity, fluency, artifacts
4. **Parameter Alignment**: Do visual elements align with chosen parameters?
5. **Issue Identification**: Identify specific problems (category + severity)

Output JSON (wrap in <VIDEO_ANALYSIS>...</VIDEO_ANALYSIS>):
{
  "content_match_score": 0.75,
  "issues": [
    {
      "category": "motion_quality",
      "description": "Motion is too fast and jerky, doesn't match 'slowly walking' prompt",
      "severity": "high",
      "affected_parameter": "motion_intensity"
    },
    {
      "category": "lighting",
      "description": "Video appears darker than expected for outdoor scene",
      "severity": "medium",
      "affected_parameter": "lighting"
    }
  ],
  "technical_quality": {
    "resolution": "1280x720",
    "clarity_score": 0.85,
    "fluency_score": 0.70,
    "artifacts": "Minor compression artifacts in fast-moving areas"
  },
  "strengths": [
    "Camera movement is smooth and professional",
    "Subject is clearly visible throughout"
  ],
  "overall_assessment": "Video has good technical quality but motion speed doesn't match user's 'slowly' intention. Recommend reducing motion_intensity from 3 to 2."
}

Important:
- content_match_score: 0-1 (how well video matches intent)
- issues: Array of specific problems with severity (high/medium/low)
- Be specific about which parameters need adjustment
- Focus on actionable feedback
`;

/**
 * 构建视频分析输入
 */
function buildVideoAnalysisInput(workspace, intentReport) {
  const { form_data, video } = workspace;

  // 格式化用户意图
  const userIntent = `
Scene: ${intentReport.user_intent.scene_description}
Desired Mood: ${intentReport.user_intent.desired_mood}
Key Elements: ${intentReport.user_intent.key_elements.join(', ')}
Expected Motion: ${intentReport.user_intent.motion_expectation}
Energy Level: ${intentReport.user_intent.energy_level || 'not specified'}
`;

  // 格式化生成参数
  const genParams = `
Camera Movement: ${form_data.camera_movement || 'N/A'}
Shot Type: ${form_data.shot_type || 'N/A'}
Lighting: ${form_data.lighting || 'N/A'}
Motion Prompt: "${form_data.motion_prompt || 'N/A'}"
Motion Intensity: ${form_data.motion_intensity || 3}
Duration: ${form_data.duration || 5}s
Quality: ${form_data.quality_preset || 'standard'}
`;

  return VIDEO_ANALYSIS_PROMPT
    .replace('{USER_INTENT}', userIntent.trim())
    .replace('{GENERATION_PARAMS}', genParams.trim());
}
```

### Step 2: 实现执行函数

```javascript
/**
 * 执行视频分析
 * @param {object} workspace - MongoDB workspace document
 * @param {object} intentReport - 意图报告
 * @returns {Promise<object>} 视频分析报告
 */
async function executeVideoAnalysis(workspace, intentReport) {
  const workspaceId = workspace._id.toString();
  const videoUrl = workspace.video?.url;

  logger.info('Starting video analysis', {
    workspaceId,
    videoUrl,
    hasIntentReport: !!intentReport
  });

  // 验证输入
  if (!videoUrl) {
    throw new Error('No video URL available for analysis');
  }

  if (!intentReport || !intentReport.user_intent) {
    throw new Error('Intent report is required for video analysis');
  }

  try {
    // 1. 构建分析 Prompt
    const analysisPrompt = buildVideoAnalysisInput(workspace, intentReport);

    logger.debug('Video analysis prompt built', {
      promptLength: analysisPrompt.length,
      promptPreview: analysisPrompt.substring(0, 200)
    });

    // 2. 调用 Qwen VL 服务
    const startTime = Date.now();

    logger.info('Calling Qwen VL for video analysis', {
      workspaceId,
      videoUrl
    });

    const vlResponse = await analyzeVideoWithQwenVL(videoUrl, analysisPrompt);

    const duration = Date.now() - startTime;

    logger.info('Qwen VL analysis completed', {
      workspaceId,
      duration,
      responseLength: vlResponse.length
    });

    logger.debug('Qwen VL response preview', {
      content: vlResponse.substring(0, 500)
    });

    // 3. 解析结果
    const analysisReport = parseVideoAnalysisReport(vlResponse);

    if (!analysisReport) {
      throw new Error('Failed to parse video analysis report from VL response');
    }

    logger.info('Video analysis report parsed successfully', {
      workspaceId,
      contentMatchScore: analysisReport.content_match_score,
      issueCount: analysisReport.issues?.length || 0,
      duration
    });

    // 4. 验证报告结构
    validateVideoAnalysisReport(analysisReport);

    // 5. 记录关键发现
    if (analysisReport.issues && analysisReport.issues.length > 0) {
      logger.info('Video quality issues identified', {
        workspaceId,
        highSeverityCount: analysisReport.issues.filter(i => i.severity === 'high').length,
        mediumSeverityCount: analysisReport.issues.filter(i => i.severity === 'medium').length,
        lowSeverityCount: analysisReport.issues.filter(i => i.severity === 'low').length
      });

      analysisReport.issues.forEach((issue, index) => {
        logger.debug(`Issue ${index + 1}`, {
          category: issue.category,
          severity: issue.severity,
          description: issue.description.substring(0, 100),
          affectedParameter: issue.affected_parameter
        });
      });
    } else {
      logger.info('No significant video quality issues found', { workspaceId });
    }

    return analysisReport;

  } catch (error) {
    logger.error('Video analysis failed', {
      workspaceId,
      videoUrl,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Video analysis failed: ${error.message}`);
  }
}

/**
 * 验证视频分析报告
 */
function validateVideoAnalysisReport(report) {
  // 验证必要字段
  if (typeof report.content_match_score !== 'number' ||
      report.content_match_score < 0 ||
      report.content_match_score > 1) {
    throw new Error('Invalid content_match_score (must be 0-1)');
  }

  if (!Array.isArray(report.issues)) {
    throw new Error('issues must be an array');
  }

  // 验证 issues 结构
  for (const issue of report.issues) {
    if (!issue.category || !issue.description || !issue.severity) {
      throw new Error('Each issue must have category, description, and severity');
    }

    if (!['high', 'medium', 'low'].includes(issue.severity)) {
      throw new Error(`Invalid severity: ${issue.severity}`);
    }
  }

  // 验证 technical_quality
  if (!report.technical_quality ||
      typeof report.technical_quality.clarity_score !== 'number' ||
      typeof report.technical_quality.fluency_score !== 'number') {
    throw new Error('technical_quality must include clarity_score and fluency_score');
  }

  if (!report.overall_assessment || report.overall_assessment.length < 10) {
    throw new Error('overall_assessment must be a meaningful string');
  }

  logger.debug('Video analysis report validation passed');
}

module.exports = {
  executeVideoAnalysis,
  buildVideoAnalysisInput
};
```

### Step 3: 单元测试

```javascript
// backend/src/services/agents/__tests__/video-agent.test.js
const { executeVideoAnalysis, buildVideoAnalysisInput } = require('../video-agent');
const { analyzeVideoWithQwenVL } = require('../../qwen-vl');
const { parseVideoAnalysisReport } = require('../../../utils/agent-helpers');

jest.mock('../../qwen-vl');
jest.mock('../../../utils/agent-helpers');
jest.mock('../../../utils/logger');

describe('Video Analysis Agent', () => {
  const mockWorkspace = {
    _id: 'test-id',
    image_url: 'http://localhost/test.jpg',
    video: {
      url: 'http://localhost/test-video.mp4',
      status: 'completed'
    },
    form_data: {
      camera_movement: 'push_in',
      motion_prompt: 'person walking slowly',
      motion_intensity: 3,
      duration: 5,
      quality_preset: 'standard'
    }
  };

  const mockIntentReport = {
    user_intent: {
      scene_description: 'A person walking in a park',
      desired_mood: 'calm and peaceful',
      key_elements: ['person', 'park', 'trees'],
      motion_expectation: 'slow walking motion',
      energy_level: 'low-to-medium'
    },
    confidence: 0.85
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build video analysis prompt', () => {
    const prompt = buildVideoAnalysisInput(mockWorkspace, mockIntentReport);

    expect(prompt).toContain('A person walking in a park');
    expect(prompt).toContain('Motion Intensity: 3');
    expect(prompt).toContain('slow walking motion');
  });

  it('should execute video analysis successfully', async () => {
    const mockVLResponse = `
      <VIDEO_ANALYSIS>
      {
        "content_match_score": 0.75,
        "issues": [
          {
            "category": "motion_quality",
            "description": "Motion too fast",
            "severity": "high",
            "affected_parameter": "motion_intensity"
          }
        ],
        "technical_quality": {
          "resolution": "1280x720",
          "clarity_score": 0.85,
          "fluency_score": 0.70,
          "artifacts": "Minor artifacts"
        },
        "strengths": ["Good camera work"],
        "overall_assessment": "Reduce motion intensity"
      }
      </VIDEO_ANALYSIS>
    `;

    const mockParsedReport = {
      content_match_score: 0.75,
      issues: [
        {
          category: 'motion_quality',
          description: 'Motion too fast',
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
      overall_assessment: 'Reduce motion intensity'
    };

    analyzeVideoWithQwenVL.mockResolvedValue(mockVLResponse);
    parseVideoAnalysisReport.mockReturnValue(mockParsedReport);

    const result = await executeVideoAnalysis(mockWorkspace, mockIntentReport);

    expect(analyzeVideoWithQwenVL).toHaveBeenCalledWith(
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

  it('should validate video analysis report', async () => {
    const invalidReport = {
      content_match_score: 1.5, // Invalid: > 1
      issues: [],
      technical_quality: {
        clarity_score: 0.8,
        fluency_score: 0.7
      },
      overall_assessment: 'Test'
    };

    analyzeVideoWithQwenVL.mockResolvedValue('mock response');
    parseVideoAnalysisReport.mockReturnValue(invalidReport);

    await expect(
      executeVideoAnalysis(mockWorkspace, mockIntentReport)
    ).rejects.toThrow('Invalid content_match_score');
  });
});
```

---

## 验收标准

- [ ] Prompt 模板完整,包含用户意图和参数对比
- [ ] 能成功调用 Qwen VL 服务
- [ ] 正确解析 `<VIDEO_ANALYSIS>` 标签内的 JSON
- [ ] 验证分析报告所有必要字段
- [ ] 完整的日志记录 (请求、响应、耗时、发现的问题)
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过
- [ ] 能识别并分类视频质量问题 (high/medium/low)

---

## 测试命令

```bash
cd backend
npm test -- video-agent.test.js
```

---

## 参考文档

- `context/tasks/v2/v2-agent-system-design.md` - Video Analysis 部分
- `context/tasks/v2/backend/layer1-task1-qwen-vl-service.md` - Qwen VL 服务
- `context/tasks/v2/v2-backend-architecture.md` - Agent 核心模块
