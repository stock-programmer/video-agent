import logger from './logger.js';

/**
 * Agent 辅助工具函数
 * 用于 v2 版本的多 Agent 提示词优化系统
 * 包括输出解析、上下文构建、数据验证等功能
 */

// ============================================================
// Part 1: 输出解析函数
// ============================================================

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
 * @returns {object|null}
 */
function parseOptimizationResult(text) {
  logger.debug('Parsing optimization result', { textLength: text.length });

  // 提取 NG 原因 (支持 JSON 数组格式)
  const ngMatch = text.match(/<NG_REASONS>\s*(.*?)\s*<\/NG_REASONS>/is);
  let ng_reasons = [];
  if (ngMatch) {
    try {
      ng_reasons = JSON.parse(ngMatch[1].trim());
    } catch (e) {
      // 如果 JSON 解析失败,尝试按行解析 (- 开头的格式)
      ng_reasons = ngMatch[1].split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.replace(/^-\s*/, ''));

      if (ng_reasons.length === 0) {
        logger.error('Failed to parse NG reasons', { error: e.message });
        return null;
      }
    }
  }

  // 提取优化参数
  const paramsMatch = text.match(/<OPTIMIZED_PARAMS>\s*(.*?)\s*<\/OPTIMIZED_PARAMS>/is);
  let optimized_params = {};
  if (paramsMatch) {
    try {
      optimized_params = JSON.parse(paramsMatch[1].trim());
    } catch (e) {
      logger.error('Failed to parse optimized params', { error: e.message });
      return null;
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
      return null;
    }
  }

  // 提取置信度
  const confidenceMatch = text.match(/<CONFIDENCE>\s*(.*?)\s*<\/CONFIDENCE>/is);
  let confidence = 0.8; // 默认值
  if (confidenceMatch) {
    try {
      confidence = parseFloat(confidenceMatch[1].trim());
    } catch (e) {
      logger.warn('Failed to parse confidence, using default 0.8', { error: e.message });
    }
  }

  const result = {
    ng_reasons,
    optimized_params,
    changes,
    confidence
  };

  logger.info('Parsed optimization result', {
    ngReasonsCount: ng_reasons.length,
    changesCount: changes.length,
    confidence
  });

  return result;
}

// ============================================================
// Part 2: 上下文构建函数
// ============================================================

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

// ============================================================
// Part 3: 数据验证函数
// ============================================================

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

// 别名函数用于兼容性
const parseVideoAnalysisReport = parseVideoAnalysis;

export {
  parseIntentReport,
  parseVideoAnalysis,
  parseVideoAnalysisReport,
  parseOptimizationResult,
  buildAgentContext,
  buildIntentAnalysisPrompt,
  buildVideoAnalysisPrompt,
  validateOptimizationResult
};
