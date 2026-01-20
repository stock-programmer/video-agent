// backend/src/services/prompt-optimizer.js
import logger from '../utils/logger.js';
import { executeIntentAnalysis } from './agents/intent-agent.js';
import { executeVideoAnalysis } from './agents/video-agent.js';
import { executeMasterAgentDecision } from './agents/master-agent.js';
import { Workspace } from '../db/mongodb.js';

/**
 * Prompt Optimizer 主流程
 *
 * 协调整个 Agent 系统的执行,包括分阶段执行、WebSocket 推送、数据库保存
 *
 * 核心功能：
 * - 分阶段执行 Agent (Intent → Human-in-the-Loop → Video → Master)
 * - WebSocket 实时进度推送
 * - Human-in-the-Loop 异步等待
 * - 优化结果保存到 MongoDB
 * - 完整的错误处理和日志
 */

/**
 * Human-in-the-Loop Promise Resolver
 * 存储待确认的 Promise resolve 函数
 */
const pendingConfirmations = new Map();

/**
 * 验证 Workspace 前置条件
 * @param {object} workspace - MongoDB workspace document
 * @param {string} mode - 优化模式：'full' 或 'intent_only'
 * @throws {Error} 如果验证失败
 */
function validateWorkspace(workspace, mode = 'full') {
  if (!workspace.image_url) {
    throw new Error('Workspace must have an image_url');
  }

  if (!workspace.form_data) {
    throw new Error('Workspace must have form_data');
  }

  // 完整模式需要检查视频
  if (mode === 'full') {
    if (!workspace.video || workspace.video.status !== 'completed') {
      throw new Error('Workspace must have a completed video for full optimization');
    }

    // 检查是否有可用的视频 URL (优先使用 remote_url)
    const videoUrl = workspace.video.remote_url || workspace.video.url;
    if (!videoUrl) {
      throw new Error('Workspace video must have a URL (either remote_url or url)');
    }
  }

  // 意图分析模式需要检查 motion_prompt
  if (mode === 'intent_only') {
    if (!workspace.form_data.motion_prompt || !workspace.form_data.motion_prompt.trim()) {
      throw new Error('Workspace must have motion_prompt for intent-only optimization');
    }
  }

  logger.debug('Workspace validation passed', {
    workspaceId: workspace._id.toString(),
    mode,
    hasImage: !!workspace.image_url,
    videoStatus: workspace.video?.status || 'none'
  });
}

/**
 * Human-in-the-Loop: 等待用户确认
 * @param {string} workspaceId - Workspace ID
 * @param {number} timeout - 超时时间 (毫秒)
 * @returns {Promise<boolean>} 用户是否确认
 */
function waitForHumanConfirmation(workspaceId, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingConfirmations.delete(workspaceId);
      logger.warn('Human confirmation timeout', { workspaceId, timeout });
      resolve(false); // 超时返回 false
    }, timeout);

    // 存储 resolve 函数
    pendingConfirmations.set(workspaceId, {
      resolve: (confirmed) => {
        clearTimeout(timeoutId);
        pendingConfirmations.delete(workspaceId);
        resolve(confirmed);
      },
      timeoutId
    });

    logger.debug('Waiting for human confirmation', {
      workspaceId,
      timeout
    });
  });
}

/**
 * 处理用户确认 (从 WebSocket 调用)
 * @param {string} workspaceId - Workspace ID
 * @param {boolean} confirmed - 用户是否确认
 * @returns {boolean} 是否成功处理确认
 */
function handleHumanConfirmation(workspaceId, confirmed) {
  logger.info('Human confirmation received', { workspaceId, confirmed });

  const pending = pendingConfirmations.get(workspaceId);

  if (!pending) {
    logger.warn('No pending confirmation found', { workspaceId });
    return false;
  }

  pending.resolve(confirmed);
  return true;
}

/**
 * 保存优化结果到数据库
 * @param {string} workspaceId - Workspace ID
 * @param {object} intentReport - 意图分析报告
 * @param {object} videoAnalysis - 视频分析报告
 * @param {object} optimizationResult - 优化结果
 * @returns {Promise<object>} 保存的记录
 */
async function saveOptimizationResult(
  workspaceId,
  intentReport,
  videoAnalysis,
  optimizationResult
) {
  logger.info('Saving optimization result to database', { workspaceId });

  const optimizationRecord = {
    timestamp: new Date(),
    intent_report: intentReport,
    video_analysis: videoAnalysis,
    optimization_result: optimizationResult
  };

  const workspace = await Workspace.findByIdAndUpdate(
    workspaceId,
    {
      $push: {
        optimization_history: optimizationRecord
      }
    },
    { new: true }
  );

  if (!workspace) {
    throw new Error(`Failed to save optimization result: workspace ${workspaceId} not found`);
  }

  logger.info('Optimization result saved successfully', {
    workspaceId,
    historyLength: workspace.optimization_history?.length || 0
  });

  return optimizationRecord;
}

/**
 * 主流程: 执行提示词优化
 * @param {string} workspaceId - MongoDB workspace ID
 * @param {function} wsBroadcast - WebSocket broadcast function
 * @param {object} options - 优化选项
 * @param {string} options.mode - 优化模式：'full'（完整流程）或 'intent_only'（仅意图分析）
 * @returns {Promise<object>} 优化结果
 */
async function optimizePrompt(workspaceId, wsBroadcast, options = {}) {
  const { mode = 'full' } = options;

  logger.info('Starting prompt optimization', { workspaceId, mode });

  const startTime = Date.now();

  try {
    // 1. 获取 workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // 验证前置条件
    validateWorkspace(workspace, mode);

    // ==================== Phase 1: Intent Analysis ====================
    logger.info('Phase 1: Intent Analysis started', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'agent_start',
      agent: 'intent_analysis',
      message: '开始分析用户意图...'
    });

    const intentReport = await executeIntentAnalysis(workspace);

    logger.info('Intent analysis completed', {
      workspaceId,
      confidence: intentReport.confidence
    });

    wsBroadcast(workspaceId, {
      type: 'agent_complete',
      agent: 'intent_analysis',
      message: '用户意图分析完成'
    });

    wsBroadcast(workspaceId, {
      type: 'intent_report',
      data: intentReport
    });

    // ==================== Phase 2: Human-in-the-Loop ====================
    logger.info('Phase 2: Waiting for human confirmation', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'human_loop_pending',
      message: '请确认意图分析是否正确'
    });

    // 等待用户确认 (异步)
    const userConfirmed = await waitForHumanConfirmation(workspaceId, 300000); // 5分钟超时

    if (!userConfirmed) {
      logger.warn('User rejected intent or timeout', { workspaceId });
      throw new Error('User did not confirm intent analysis');
    }

    logger.info('Human confirmation received', { workspaceId });

    // ==================== 意图分析模式：到此结束 ====================
    if (mode === 'intent_only') {
      logger.info('Intent-only mode: skipping video analysis', { workspaceId });

      // 推送意图分析完成消息
      wsBroadcast(workspaceId, {
        type: 'optimization_complete',
        mode: 'intent_only',
        message: '意图分析已完成，请生成视频后可进行完整优化'
      });

      const totalDuration = Date.now() - startTime;

      logger.info('Intent-only optimization completed', {
        workspaceId,
        totalDuration
      });

      return {
        success: true,
        mode: 'intent_only',
        intentReport
      };
    }

    // ==================== Phase 3: Video Analysis ====================
    logger.info('Phase 3: Video Analysis started', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'agent_start',
      agent: 'video_analysis',
      message: '开始分析视频质量...'
    });

    // 刷新 workspace (可能有视频 URL 更新)
    const refreshedWorkspace = await Workspace.findById(workspaceId);

    const videoAnalysis = await executeVideoAnalysis(refreshedWorkspace, intentReport);

    logger.info('Video analysis completed', {
      workspaceId,
      contentMatchScore: videoAnalysis.content_match_score,
      issueCount: videoAnalysis.issues?.length || 0
    });

    wsBroadcast(workspaceId, {
      type: 'agent_complete',
      agent: 'video_analysis',
      message: '视频质量分析完成'
    });

    wsBroadcast(workspaceId, {
      type: 'video_analysis',
      data: videoAnalysis
    });

    // ==================== Phase 4: Master Agent Decision ====================
    logger.info('Phase 4: Master Agent decision started', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'agent_start',
      agent: 'master_agent',
      message: '正在生成优化建议...'
    });

    const optimizationResult = await executeMasterAgentDecision(
      refreshedWorkspace,
      intentReport,
      videoAnalysis
    );

    logger.info('Master Agent decision completed', {
      workspaceId,
      changeCount: optimizationResult.changes?.length || 0,
      confidence: optimizationResult.confidence
    });

    wsBroadcast(workspaceId, {
      type: 'agent_complete',
      agent: 'master_agent',
      message: '优化建议生成完成'
    });

    // ==================== Phase 5: Save to Database ====================
    logger.info('Phase 5: Saving optimization result to database', { workspaceId });

    const savedResult = await saveOptimizationResult(
      workspaceId,
      intentReport,
      videoAnalysis,
      optimizationResult
    );

    logger.info('Optimization result saved', {
      workspaceId,
      timestamp: savedResult.timestamp
    });

    // 推送最终结果
    wsBroadcast(workspaceId, {
      type: 'optimization_result',
      data: {
        ng_reasons: optimizationResult.ng_reasons,
        optimized_params: optimizationResult.optimized_params,
        changes: optimizationResult.changes,
        confidence: optimizationResult.confidence
      }
    });

    const totalDuration = Date.now() - startTime;

    logger.info('Prompt optimization completed successfully', {
      workspaceId,
      totalDuration
    });

    return {
      success: true,
      intentReport,
      videoAnalysis,
      optimizationResult
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;

    logger.error('Prompt optimization failed', {
      workspaceId,
      error: error.message,
      stack: error.stack,
      totalDuration
    });

    wsBroadcast(workspaceId, {
      type: 'optimization_error',
      error: error.message
    });

    throw error;
  }
}

export {
  optimizePrompt,
  waitForHumanConfirmation,
  handleHumanConfirmation,
  saveOptimizationResult,
  validateWorkspace,
  pendingConfirmations
};
