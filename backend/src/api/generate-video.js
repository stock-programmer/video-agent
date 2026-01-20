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
 *     // v1.0 字段
 *     camera_movement?: string,
 *     shot_type?: string,
 *     lighting?: string,
 *     motion_prompt?: string,
 *     // v1.1 字段
 *     duration?: number,          // 5, 10, 15
 *     aspect_ratio?: string,      // '16:9', '9:16', '1:1', '4:3'
 *     motion_intensity?: number,  // 1-5
 *     quality_preset?: string     // 'draft', 'standard', 'high'
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

    // ===== v1.1: 参数验证 =====
    // Duration验证 (基于Task 1.1 API验证结果: 仅支持5/10/15秒)
    if (form_data.duration !== undefined) {
      if (![5, 10, 15].includes(form_data.duration)) {
        return res.status(400).json({
          error: '无效的duration参数',
          details: 'duration必须是5、10或15秒之一'
        });
      }
    }

    // Aspect Ratio验证
    if (form_data.aspect_ratio !== undefined) {
      if (!['16:9', '9:16', '1:1', '4:3'].includes(form_data.aspect_ratio)) {
        return res.status(400).json({
          error: '无效的aspect_ratio参数',
          details: 'aspect_ratio必须是16:9、9:16、1:1或4:3之一'
        });
      }
    }

    // Motion Intensity验证
    if (form_data.motion_intensity !== undefined) {
      if (form_data.motion_intensity < 1 || form_data.motion_intensity > 5) {
        return res.status(400).json({
          error: '无效的motion_intensity参数',
          details: 'motion_intensity必须在1-5之间'
        });
      }
    }

    // Quality Preset验证
    if (form_data.quality_preset !== undefined) {
      if (!['draft', 'standard', 'high'].includes(form_data.quality_preset)) {
        return res.status(400).json({
          error: '无效的quality_preset参数',
          details: 'quality_preset必须是draft、standard或high之一'
        });
      }
    }

    // 调用视频生成服务
    const result = await generate(workspace_id, form_data);

    logger.info(`视频生成任务创建成功: workspace=${workspace_id}, taskId=${result.task_id}`, {
      duration: form_data.duration,
      aspect_ratio: form_data.aspect_ratio,
      motion_intensity: form_data.motion_intensity,
      quality_preset: form_data.quality_preset
    });

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
