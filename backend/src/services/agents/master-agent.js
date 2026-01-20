import logger from '../../utils/logger.js';
import { QwenWithTools } from './qwen-wrapper.js';
import { parseOptimizationResult } from '../../utils/agent-helpers.js';

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
          reason: change.reason ? change.reason.substring(0, 100) : 'No reason provided'
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

export {
  executeMasterAgentDecision,
  buildMasterAgentInput
};
