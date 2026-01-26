import logger from '../../utils/logger.js';
import { QwenWithTools } from './qwen-wrapper.js';
import { parseIntentReport } from '../../utils/agent-helpers.js';
import { AgentExecutionError, ValidationError } from '../../utils/error-types.js';

/**
 * Intent Analysis Sub-Agent
 *
 * 分析用户输入参数并推断真实意图
 *
 * 核心功能：
 * - 构建意图分析 Prompt
 * - 调用 Qwen LLM 执行推理
 * - 解析意图报告 (JSON 格式)
 * - 完整的请求/响应日志
 */

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
 * @param {object} workspace - MongoDB workspace document
 * @returns {string} 完整的 prompt
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

/**
 * 验证意图报告
 * @param {object} report - 意图报告对象
 * @throws {ValidationError} 如果验证失败
 */
function validateIntentReport(report) {
  const required = ['scene_description', 'desired_mood', 'motion_expectation'];

  for (const field of required) {
    if (!report.user_intent || !report.user_intent[field]) {
      throw new ValidationError(`Missing required field in intent report: ${field}`, {
        field,
        report
      });
    }
  }

  if (typeof report.confidence !== 'number' || report.confidence < 0 || report.confidence > 1) {
    throw new ValidationError('Invalid confidence value (must be 0-1)', {
      confidence: report.confidence
    });
  }

  logger.debug('Intent report validation passed');
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
        agent: 'intent_analysis',
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
 * 执行意图分析
 * @param {object} workspace - MongoDB workspace document
 * @param {function} wsBroadcast - WebSocket广播函数 (可选)
 * @returns {Promise<object>} 意图报告
 */
async function executeIntentAnalysis(workspace, wsBroadcast) {
  const workspaceId = workspace._id.toString();

  logger.info('Starting intent analysis', {
    workspaceId,
    hasImage: !!workspace.image_url,
    hasMotionPrompt: !!workspace.form_data?.motion_prompt
  });

  try {
    // ===== Phase 1: 构建 Prompt =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'visual_analysis',
      title: '视觉分析',
      description: '正在分析图片内容：场景、主体、构图、情绪...',
      status: 'running'
    });

    const prompt = buildIntentAnalysisInput(workspace);

    logger.debug('Intent analysis prompt built', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200)
    });

    // ===== Phase 2: 参数解读 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'parameter_interpretation',
      title: '参数解读',
      description: '分析用户选择的运镜、景别、光线等参数含义...',
      status: 'running'
    });

    // ===== Phase 3: 运动意图推断 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'motion_inference',
      title: '运动意图推断',
      description: '推断用户期望的运动风格和节奏...',
      status: 'running'
    });

    // ===== Phase 4: 情绪推断 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'mood_inference',
      title: '情绪推断',
      description: '分析用户所需的情感基调和氛围...',
      status: 'running'
    });

    // ===== Phase 5: 矛盾检查 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'contradiction_check',
      title: '矛盾检查',
      description: '检查参数与图片内容的一致性...',
      status: 'running'
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

    // ===== Phase 6: LLM 推理 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'llm_inference',
      title: 'LLM 推理',
      description: '调用 Qwen 模型进行意图分析推理...',
      status: 'running'
    });

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

    // ===== Phase 7: 解析结果 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'parse_result',
      title: '解析结果',
      description: '解析 LLM 返回的意图分析报告...',
      status: 'running'
    });

    const intentReport = parseIntentReport(response.content);

    if (!intentReport) {
      throw new AgentExecutionError(
        'intent',
        'parsing',
        new Error('Failed to parse intent report from LLM response'),
        { workspaceId, responsePreview: response.content?.substring(0, 200) }
      );
    }

    logger.info('Intent analysis completed successfully', {
      workspaceId,
      confidence: intentReport.confidence,
      hasIntent: !!intentReport.user_intent,
      duration
    });

    // 5. 验证必要字段
    validateIntentReport(intentReport);

    // ===== Phase 8: 完成 =====
    broadcastStep(workspaceId, wsBroadcast, {
      phase: 'visual_analysis',
      title: '视觉分析',
      description: '图片分析完成',
      status: 'completed',
      result: {
        scene: intentReport.user_intent?.scene_description,
        mood: intentReport.user_intent?.desired_mood,
        confidence: intentReport.confidence
      }
    });

    return intentReport;

  } catch (error) {
    logger.error('Intent analysis failed', {
      workspaceId,
      error: error.message,
      stack: error.stack
    });

    // 如果已经是我们自定义的错误，直接抛出
    if (error instanceof ValidationError || error instanceof AgentExecutionError) {
      throw error;
    }

    // 否则包装为 AgentExecutionError
    throw new AgentExecutionError(
      'intent',
      'analysis',
      error,
      { workspaceId }
    );
  }
}

export {
  executeIntentAnalysis,
  buildIntentAnalysisInput,
  validateIntentReport,
  INTENT_ANALYSIS_PROMPT
};
