import * as llmGemini from '../services/llm-gemini.js';
import * as llmQwen from '../services/llm-qwen.js';
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * 获取当前配置的 LLM 服务
 * 支持动态切换 LLM 提供商
 */
function getLLMService() {
  const provider = config.llm.provider;

  switch (provider) {
    case 'gemini':
      logger.debug('使用 Gemini LLM 服务');
      return llmGemini;
    case 'qwen':
      logger.debug('使用 Qwen LLM 服务');
      return llmQwen;
    default:
      logger.warn(`未知的 LLM 提供商: ${provider}, 默认使用 Gemini`);
      return llmGemini;
  }
}

/**
 * AI 协作建议 API
 *
 * POST /api/ai/suggest
 *
 * 功能:
 * - 根据用户输入和当前工作空间参数生成 AI 建议
 * - 保存 AI 协作历史到数据库
 * - 返回结构化建议供前端使用
 *
 * 请求体:
 * {
 *   workspace_id: String,      // 工作空间 ID
 *   user_input: String,        // 用户输入的需求描述
 *   context?: Object           // 可选的额外上下文
 * }
 *
 * 响应:
 * {
 *   success: true,
 *   data: {
 *     camera_movement: String,  // 运镜建议
 *     shot_type: String,        // 景别建议
 *     lighting: String,         // 光线建议
 *     motion_prompt: String,    // 运动描述建议
 *     explanation: String       // 建议说明
 *   }
 * }
 */
export async function getAISuggestion(req, res) {
  try {
    const { workspace_id, user_input, context } = req.body;

    // 参数验证
    if (!workspace_id) {
      logger.warn('AI 建议请求缺少 workspace_id');
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '缺少必需参数: workspace_id'
        }
      });
    }

    if (!user_input || user_input.trim().length === 0) {
      logger.warn('AI 建议请求缺少 user_input');
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '缺少必需参数: user_input'
        }
      });
    }

    // 查询工作空间
    logger.info('查询工作空间', { workspace_id });
    const workspace = await Workspace.findById(workspace_id);

    if (!workspace) {
      logger.warn('工作空间不存在', { workspace_id });
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKSPACE_NOT_FOUND',
          message: '工作空间不存在'
        }
      });
    }

    // 调用 LLM 服务获取建议
    logger.info('请求 AI 建议', {
      workspace_id,
      user_input: user_input.substring(0, 100),
      llm_provider: config.llm.provider
    });

    const llmService = getLLMService();
    const suggestion = await llmService.suggest(workspace, user_input);

    logger.info('AI 建议获取成功', {
      workspace_id,
      has_camera_movement: !!suggestion.camera_movement,
      has_shot_type: !!suggestion.shot_type,
      has_lighting: !!suggestion.lighting
    });

    // 保存 AI 协作历史到数据库
    workspace.ai_collaboration.push({
      user_input,
      ai_suggestion: suggestion,
      timestamp: new Date()
    });

    await workspace.save();
    logger.info('AI 协作历史已保存', { workspace_id });

    // 返回建议
    res.json({
      success: true,
      data: suggestion
    });

  } catch (error) {
    logger.error('AI 建议获取失败:', error);

    // 处理特定错误
    if (error.message?.includes('API Key') ||
        error.message?.includes('GOOGLE_API_KEY') ||
        error.message?.includes('DASHSCOPE_API_KEY')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'LLM_API_KEY_ERROR',
          message: 'AI 服务配置错误,请联系管理员'
        }
      });
    }

    if (error.message?.includes('配额') ||
        error.message?.includes('quota') ||
        error.message?.includes('频率超限')) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'LLM_QUOTA_EXHAUSTED',
          message: 'AI 服务繁忙,请稍后再试'
        }
      });
    }

    if (error.message?.includes('权限') ||
        error.message?.includes('permission') ||
        error.message?.includes('无效')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'LLM_PERMISSION_ERROR',
          message: 'AI 服务权限错误,请联系管理员'
        }
      });
    }

    // 数据库错误
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_ERROR',
          message: '数据库操作失败'
        }
      });
    }

    // 通用错误
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'AI 建议生成失败'
      }
    });
  }
}
