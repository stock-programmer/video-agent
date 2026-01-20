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
 * @param {object} workspace - MongoDB workspace document
 * @param {object} intentReport - 意图报告
 * @returns {string} 完整的 prompt
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
 * 执行视频分析
 * @param {object} workspace - MongoDB workspace document
 * @param {object} intentReport - 意图报告
 * @returns {Promise<object>} 视频分析报告
 */
async function executeVideoAnalysis(workspace, intentReport) {
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
