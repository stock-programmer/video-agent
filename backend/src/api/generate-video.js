import { generate } from '../services/video-qwen.js';
import logger from '../utils/logger.js';

/**
 * 视频生成 API 端点
 * POST /api/generate/video
 *
 * 请求体:
 * {
 *   workspace_id: string,  // MongoDB ObjectId
 *   form_data: {
 *     camera_movement?: string,
 *     shot_type?: string,
 *     lighting?: string,
 *     motion_prompt?: string
 *   }
 * }
 *
 * 响应:
 * {
 *   task_id: string  // Qwen 任务 ID
 * }
 */
export async function generateVideo(req, res) {
  try {
    const { workspace_id, form_data } = req.body;

    // 参数验证
    if (!workspace_id || !form_data) {
      return res.status(400).json({
        error: '缺少参数',
        details: 'workspace_id 和 form_data 为必填项'
      });
    }

    // 调用视频生成服务
    const result = await generate(workspace_id, form_data);

    logger.info(`视频生成任务创建成功: workspace=${workspace_id}, taskId=${result.task_id}`);

    res.json({
      success: true,
      task_id: result.task_id
    });
  } catch (error) {
    logger.error('视频生成API失败:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
