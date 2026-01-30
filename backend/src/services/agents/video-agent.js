import logger from '../../utils/logger.js';
import config from '../../config.js';
import { analyzeVideoWithQwenVL } from '../qwen-vl.js';
import { parseVideoAnalysis } from '../../utils/agent-helpers.js';
import { AgentExecutionError, ValidationError } from '../../utils/error-types.js';

/**
 * Video Analysis Sub-Agent
 *
 * 分析生成的视频质量并对比用户意图
 *
 * 核心功能：
 * - 调用 Qwen VL 服务分析视频
 * - 对比视频内容与用户意图
 * - 识别视频质量问题
 * - 生成结构化分析报告
 */

/**
 * Video Analysis Prompt Template
 */
const VIDEO_ANALYSIS_PROMPT = `你是视频质量分析专家。

任务：分析生成的视频，并将其与用户的原始意图进行比较。

用户的原始意图：
{USER_INTENT}

使用的生成参数：
{GENERATION_PARAMS}

分析步骤：
1. **内容匹配检查**：视频内容是否与预期场景匹配？
2. **运动质量**：运动是否流畅、自然，是否与预期强度匹配？
3. **技术质量**：检查分辨率、清晰度、流畅度、瑕疵
4. **参数对齐**：视觉元素是否与所选参数对齐？
5. **问题识别**：识别具体问题（类别 + 严重程度）

输出 JSON（用 <VIDEO_ANALYSIS>...</VIDEO_ANALYSIS> 包裹）：
{
  "content_match_score": 0.75,
  "issues": [
    {
      "category": "运动质量",
      "description": "运动速度过快且不平稳，与'缓慢行走'的提示词不匹配",
      "severity": "high",
      "affected_parameter": "motion_intensity"
    },
    {
      "category": "光线",
      "description": "视频看起来比户外场景预期的要暗",
      "severity": "medium",
      "affected_parameter": "lighting"
    }
  ],
  "technical_quality": {
    "resolution": "1280x720",
    "clarity_score": 0.85,
    "fluency_score": 0.70,
    "artifacts": "快速移动区域有轻微压缩瑕疵"
  },
  "strengths": [
    "镜头运动流畅且专业",
    "主体在整个视频中清晰可见"
  ],
  "overall_assessment": "视频技术质量良好，但运动速度与用户的'缓慢'意图不符。建议将 motion_intensity 从 3 降低到 2。"
}

重要提示：
- content_match_score: 0-1（视频与意图的匹配程度）
- issues: 具体问题的数组，包含严重程度（high/medium/low）
- 明确指出哪些参数需要调整
- 专注于可操作的反馈
- 所有输出内容必须使用中文
`;

/**
 * 构建视频分析输入
 * @param {object} workspace - MongoDB workspace document
 * @param {object} intentReport - 意图报告
 * @returns {string} 完整的 prompt
 */
function buildVideoAnalysisInput(workspace, intentReport) {
  const { form_data, video } = workspace;

  // 格式化用户意图
  const userIntent = `
场景: ${intentReport.user_intent.scene_description}
期望氛围: ${intentReport.user_intent.desired_mood}
关键元素: ${intentReport.user_intent.key_elements.join('、')}
预期运动: ${intentReport.user_intent.motion_expectation}
能量级别: ${intentReport.user_intent.energy_level || '未指定'}
`;

  // 格式化生成参数
  const genParams = `
运镜方式: ${form_data.camera_movement || '未指定'}
景别: ${form_data.shot_type || '未指定'}
光线: ${form_data.lighting || '未指定'}
运动描述: "${form_data.motion_prompt || '未指定'}"
运动强度: ${form_data.motion_intensity || 3}
视频时长: ${form_data.duration || 5}秒
视频质量: ${form_data.quality_preset || 'standard'}
`;

  return VIDEO_ANALYSIS_PROMPT
    .replace('{USER_INTENT}', userIntent.trim())
    .replace('{GENERATION_PARAMS}', genParams.trim());
}

/**
 * 验证视频分析报告
 * @param {object} report - 视频分析报告对象
 * @throws {ValidationError} 如果验证失败
 */
function validateVideoAnalysisReport(report) {
  // 验证 content_match_score
  if (typeof report.content_match_score !== 'number' ||
      report.content_match_score < 0 ||
      report.content_match_score > 1) {
    throw new ValidationError('Invalid content_match_score (must be 0-1)', {
      content_match_score: report.content_match_score
    });
  }

  // 验证 issues 数组
  if (!Array.isArray(report.issues)) {
    throw new ValidationError('issues must be an array', {
      issues: report.issues
    });
  }

  // 验证每个 issue 的结构
  for (const issue of report.issues) {
    if (!issue.category || !issue.description || !issue.severity) {
      throw new ValidationError('Each issue must have category, description, and severity', {
        issue
      });
    }

    if (!['high', 'medium', 'low'].includes(issue.severity)) {
      throw new ValidationError(`Invalid severity: ${issue.severity}`, {
        severity: issue.severity,
        validValues: ['high', 'medium', 'low']
      });
    }
  }

  // 验证 technical_quality
  if (!report.technical_quality ||
      typeof report.technical_quality.clarity_score !== 'number' ||
      typeof report.technical_quality.fluency_score !== 'number') {
    throw new ValidationError('technical_quality must include clarity_score and fluency_score', {
      technical_quality: report.technical_quality
    });
  }

  // 验证 overall_assessment
  if (!report.overall_assessment || report.overall_assessment.length < 10) {
    throw new ValidationError('overall_assessment must be a meaningful string', {
      length: report.overall_assessment?.length || 0
    });
  }

  logger.debug('Video analysis report validation passed');
}

/**
 * 广播分析步骤 (内部helper函数)
 * @param {string} workspaceId - Workspace ID
 * @param {function} wsBroadcast - WebSocket广播函数
 * @param {object} step - 步骤信息
 */
function broadcastStep(workspaceId, wsBroadcast, step) {
  if (wsBroadcast) {
    try {
      wsBroadcast(workspaceId, {
        type: 'agent_step',
        agent: 'video_analysis',
        step: {
          ...step,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.warn('Failed to broadcast step', { error: error.message });
    }
  }
}

/**
 * 执行视频分析
 * @param {object} workspace - MongoDB workspace document
 * @param {object} intentReport - 意图报告
 * @param {function} wsBroadcast - WebSocket广播函数 (可选)
 * @returns {Promise<object>} 视频分析报告
 */
async function executeVideoAnalysis(workspace, intentReport, wsBroadcast) {
  const workspaceId = workspace._id.toString();

  // 优先使用 remote_url (Qwen-hosted URL)，如果不存在则使用 url
  // remote_url 是 Qwen VL API 可以直接访问的公开 URL
  const videoUrl = workspace.video?.remote_url || workspace.video?.url;

  logger.info('Starting video analysis', {
    workspaceId,
    videoUrl,
    hasRemoteUrl: !!workspace.video?.remote_url,
    hasIntentReport: !!intentReport
  });

  // 验证输入
  if (!videoUrl) {
    throw new ValidationError('No video URL available for analysis', {
      workspaceId,
      video: workspace.video
    });
  }

  if (!intentReport || !intentReport.user_intent) {
    throw new ValidationError('Intent report is required for video analysis', {
      workspaceId,
      hasIntentReport: !!intentReport,
      hasUserIntent: !!intentReport?.user_intent
    });
  }

  try {
    // ===== Phase 1: 获取视频 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'fetch_video',
      title: '获取视频',
      description: '正在加载视频文件进行分析...',
      status: 'running'
    });

    // ===== Phase 2: 质量评估 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'quality_assessment',
      title: '质量评估',
      description: '评估视频的分辨率、清晰度、流畅度...',
      status: 'running'
    });

    // ===== Phase 3: 内容匹配 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'content_matching',
      title: '内容匹配',
      description: '检查视频内容与用户意图的匹配度...',
      status: 'running'
    });

    // ===== Phase 4: 运动分析 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'motion_analysis',
      title: '运动分析',
      description: '分析视频中的运动效果和镜头运动...',
      status: 'running'
    });

    // 1. 构建分析 Prompt
    const analysisPrompt = buildVideoAnalysisInput(workspace, intentReport);

    logger.debug('Video analysis prompt built', {
      promptLength: analysisPrompt.length,
      promptPreview: analysisPrompt.substring(0, 200)
    });

    // ===== Phase 5: 问题诊断 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'problem_diagnosis',
      title: '问题诊断',
      description: '调用AI模型诊断视频存在的问题...',
      status: 'running'
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
    const analysisReport = parseVideoAnalysis(vlResponse);

    if (!analysisReport) {
      throw new AgentExecutionError(
        'video',
        'parsing',
        new Error('Failed to parse video analysis report from VL response'),
        { workspaceId, videoUrl, responsePreview: vlResponse.substring(0, 200) }
      );
    }

    logger.info('Video analysis report parsed successfully', {
      workspaceId,
      contentMatchScore: analysisReport.content_match_score,
      issueCount: analysisReport.issues?.length || 0,
      duration
    });

    // 4. 验证报告结构
    validateVideoAnalysisReport(analysisReport);

    // ===== Phase 6: NG原因总结 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'ng_summary',
      title: 'NG原因总结',
      description: '总结视频不符合预期的原因...',
      status: 'running'
    });

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

    // ===== Phase 7: 完成 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'content_matching',
      title: '内容匹配',
      description: '分析完成',
      status: 'completed',
      result: {
        contentMatchScore: analysisReport.content_match_score,
        issueCount: analysisReport.issues?.length || 0,
        strengthCount: analysisReport.strengths?.length || 0
      }
    });

    return analysisReport;

  } catch (error) {
    logger.error('Video analysis failed', {
      workspaceId,
      videoUrl,
      error: error.message,
      stack: error.stack
    });

    // 如果已经是我们自定义的错误，直接抛出
    if (error instanceof ValidationError || error instanceof AgentExecutionError) {
      throw error;
    }

    // 否则包装为 AgentExecutionError
    throw new AgentExecutionError(
      'video',
      'analysis',
      error,
      { workspaceId, videoUrl }
    );
  }
}

export {
  executeVideoAnalysis,
  buildVideoAnalysisInput,
  validateVideoAnalysisReport,
  VIDEO_ANALYSIS_PROMPT
};
