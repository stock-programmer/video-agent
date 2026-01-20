// backend/src/api/optimize-prompt.js
import express from 'express';
import logger from '../utils/logger.js';
import { optimizePrompt } from '../services/prompt-optimizer.js';
import { Workspace } from '../db/mongodb.js';

const router = express.Router();

/**
 * POST /api/optimize-prompt
 *
 * 触发提示词优化流程
 *
 * Request Body:
 * {
 *   "workspace_id": "507f1f77bcf86cd799439011"
 * }
 *
 * Response (immediate, 200 OK):
 * {
 *   "success": true,
 *   "message": "Optimization started",
 *   "workspace_id": "507f1f77bcf86cd799439011"
 * }
 *
 * 优化流程通过 WebSocket 推送进度和结果
 */
router.post('/optimize-prompt', async (req, res) => {
  const startTime = Date.now();
  const { workspace_id } = req.body;

  logger.info('API /optimize-prompt called', {
    workspace_id,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  try {
    // 1. 验证输入
    if (!workspace_id) {
      logger.warn('Missing workspace_id in request', { body: req.body });
      return res.status(400).json({
        success: false,
        error: 'workspace_id is required'
      });
    }

    // 2. 验证 workspace 存在
    const workspace = await Workspace.findById(workspace_id);

    if (!workspace) {
      logger.warn('Workspace not found', { workspace_id });
      return res.status(404).json({
        success: false,
        error: `Workspace not found: ${workspace_id}`
      });
    }

    // 3. 验证 workspace 状态
    // 支持两种模式：
    // 模式A：视频已生成 - 执行完整优化流程（意图分析 + 视频分析）
    // 模式B：视频未生成 - 只执行意图分析（需要填写 motion_prompt）

    const hasVideo = workspace.video && workspace.video.status === 'completed' && workspace.video.url;
    const hasMotionPrompt = workspace.form_data?.motion_prompt && workspace.form_data.motion_prompt.trim();

    if (!hasVideo && !hasMotionPrompt) {
      logger.warn('Cannot optimize: no video and no motion_prompt', {
        workspace_id,
        videoStatus: workspace.video?.status,
        hasMotionPrompt
      });
      return res.status(400).json({
        success: false,
        error: 'Please provide motion_prompt or generate video first'
      });
    }

    const mode = hasVideo ? 'full' : 'intent_only';

    logger.info('Workspace validation passed', {
      workspace_id,
      mode,
      hasImage: !!workspace.image_url,
      videoStatus: workspace.video?.status
    });

    // 4. 获取 WebSocket broadcast 函数
    const wsBroadcast = req.app.get('wsBroadcast');

    if (!wsBroadcast) {
      logger.error('WebSocket broadcast function not available');
      return res.status(500).json({
        success: false,
        error: 'WebSocket not initialized'
      });
    }

    // 5. 立即返回响应 (优化流程异步执行)
    res.json({
      success: true,
      message: 'Optimization started',
      workspace_id
    });

    const apiDuration = Date.now() - startTime;

    logger.info('API response sent, starting async optimization', {
      workspace_id,
      mode,
      apiDuration
    });

    // 6. 异步执行优化流程 (不等待完成)
    optimizePrompt(workspace_id, wsBroadcast, { mode })
      .then((result) => {
        logger.info('Optimization completed successfully', {
          workspace_id,
          totalDuration: Date.now() - startTime,
          changeCount: result.optimizationResult?.changes?.length || 0
        });
      })
      .catch((error) => {
        logger.error('Optimization failed', {
          workspace_id,
          error: error.message,
          stack: error.stack,
          totalDuration: Date.now() - startTime
        });

        // 错误已通过 WebSocket 推送给客户端,这里只记录日志
      });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('API /optimize-prompt error', {
      workspace_id,
      error: error.message,
      stack: error.stack,
      duration
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
