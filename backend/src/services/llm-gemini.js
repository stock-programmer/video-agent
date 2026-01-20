import { GoogleGenAI } from '@google/genai';
import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Google Gemini 3 LLM Service
 * 用于 AI 协作助手功能,提供视频参数优化建议
 *
 * 使用 Gemini 3 Flash Preview (gemini-3-flash-preview) 模型
 * 支持结构化 JSON 输出和多级思考配置
 */

// 初始化 Gemini AI Client
let genAI;
let isInitialized = false;

/**
 * 初始化 Gemini AI
 * @returns {GoogleGenAI} Gemini AI 客户端实例
 */
function initializeGemini() {
  if (!isInitialized) {
    const apiKey = config.apiKeys.google;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY 未配置');
    }

    genAI = new GoogleGenAI({
      apiKey: apiKey
    });

    isInitialized = true;
    logger.info('Gemini AI 初始化成功');
  }
  return genAI;
}

/**
 * 获取 AI 建议
 * @param {Object} workspaceData - 工作空间数据
 * @param {string} userInput - 用户输入的需求
 * @returns {Promise<Object>} AI 建议对象
 */
export async function suggest(workspaceData, userInput) {
  try {
    const ai = initializeGemini();
    const prompt = buildPrompt(workspaceData, userInput);

    logger.info('请求 Gemini AI 建议', {
      userInput: userInput.substring(0, 100),
      workspaceId: workspaceData._id
    });

    // 使用 Gemini 3 Flash Preview 模型
    const response = await ai.models.generateContent({
      model: config.gemini.model === 'gemini-pro' ? 'gemini-3-flash-preview' : config.gemini.model,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: 'medium'  // 平衡思考深度和响应速度
        },
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            camera_movement: {
              type: 'string',
              description: '推荐的运镜方式 (如: push_forward, pull_back, pan_left, pan_right, zoom_in, zoom_out, static)'
            },
            shot_type: {
              type: 'string',
              description: '推荐的镜头类型 (如: close_up, medium_shot, wide_shot, extreme_close_up, full_shot)'
            },
            lighting: {
              type: 'string',
              description: '推荐的光线设置 (如: natural, soft, hard, backlight, golden_hour)'
            },
            motion_prompt: {
              type: 'string',
              description: '主体运动描述 (中文)'
            },
            explanation: {
              type: 'string',
              description: '为什么这样建议 (中文)'
            }
          },
          required: ['camera_movement', 'shot_type', 'lighting', 'motion_prompt', 'explanation']
        }
      }
    });

    logger.info('Gemini AI 建议获取成功');

    // 解析返回的建议
    const suggestion = parseAISuggestion(response.text);
    logger.debug('AI 建议内容', { suggestion });

    return suggestion;
  } catch (error) {
    logger.error('Gemini AI 建议获取失败', {
      error: error.message,
      stack: error.stack
    });

    // 处理特定错误
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
      throw new Error('Google API Key 无效,请检查配置');
    } else if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
      throw new Error('API 配额已用尽,请稍后再试');
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      throw new Error('API 权限不足,请检查 API Key 权限');
    } else if (error.message?.includes('model not found')) {
      throw new Error('模型不可用,请检查 GEMINI_MODEL 配置');
    }

    throw error;
  }
}

/**
 * 构建 AI Prompt
 * @param {Object} workspaceData - 工作空间数据
 * @param {string} userInput - 用户输入
 * @returns {string} 构建好的 prompt
 */
function buildPrompt(workspaceData, userInput) {
  const currentParams = {
    image: workspaceData.image_url || '未上传',
    cameraMovement: workspaceData.form_data?.camera_movement || '未设置',
    shotType: workspaceData.form_data?.shot_type || '未设置',
    lighting: workspaceData.form_data?.lighting || '未设置',
    motionPrompt: workspaceData.form_data?.motion_prompt || '未设置',
    hasVideo: !!workspaceData.video?.url
  };

  return `你是一个专业的视频制作助手,帮助用户优化图生视频的参数配置。

【当前视频参数】
- 图片: ${currentParams.image}
- 运镜方式: ${currentParams.cameraMovement}
- 景别: ${currentParams.shotType}
- 光线: ${currentParams.lighting}
- 主体运动: ${currentParams.motionPrompt}
${currentParams.hasVideo ? `- 已生成视频: ${workspaceData.video.url}` : '- 尚未生成视频'}

【用户需求】
${userInput}

【请提供建议】
请分析用户的需求,基于当前参数给出优化建议。

注意:
1. camera_movement 必须使用英文下划线格式,可选值: push_forward, pull_back, pan_left, pan_right, zoom_in, zoom_out, static, tilt_up, tilt_down, orbit_left, orbit_right
2. shot_type 必须使用英文下划线格式,可选值: close_up, medium_shot, wide_shot, extreme_close_up, full_shot, over_shoulder
3. lighting 必须使用英文下划线格式,可选值: natural, soft, hard, backlight, golden_hour, blue_hour, rim_light, dramatic
4. motion_prompt 使用中文详细描述画面中的动作和变化
5. explanation 使用中文解释为什么这样建议

返回的 JSON 格式已由系统定义,请确保每个字段都有值。`;
}

/**
 * 解析 AI 返回的建议
 * @param {string} content - AI 返回的文本内容
 * @returns {Object} 结构化建议对象
 */
function parseAISuggestion(content) {
  try {
    // Gemini 3 with responseJsonSchema 会直接返回 JSON
    const parsed = JSON.parse(content);

    // 验证必需字段
    const requiredFields = [
      'camera_movement',
      'shot_type',
      'lighting',
      'motion_prompt',
      'explanation'
    ];

    const missingFields = requiredFields.filter(field => !parsed[field]);
    if (missingFields.length > 0) {
      logger.warn('AI 返回缺少字段:', missingFields);
    }

    // 返回结构化建议
    return {
      camera_movement: parsed.camera_movement || null,
      shot_type: parsed.shot_type || null,
      lighting: parsed.lighting || null,
      motion_prompt: parsed.motion_prompt || null,
      explanation: parsed.explanation || '建议已生成'
    };
  } catch (error) {
    logger.error('AI 返回格式解析失败', {
      error: error.message,
      contentLength: content?.length || 0
    });
    logger.debug('原始内容:', content);

    // 如果解析失败,尝试提取 JSON 部分
    try {
      // 移除可能的 markdown 代码块标记
      let jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // 尝试找到 JSON 对象
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          camera_movement: parsed.camera_movement || null,
          shot_type: parsed.shot_type || null,
          lighting: parsed.lighting || null,
          motion_prompt: parsed.motion_prompt || null,
          explanation: parsed.explanation || content
        };
      }
    } catch (e) {
      logger.error('备用解析也失败:', e);
    }

    // 返回原文作为 explanation
    return {
      camera_movement: null,
      shot_type: null,
      lighting: null,
      motion_prompt: null,
      explanation: content
    };
  }
}

/**
 * 获取快速建议 (基于场景预设)
 * @param {string} sceneType - 场景类型 (dramatic, peaceful, dynamic)
 * @returns {Promise<Object>} 预设建议对象
 */
export async function quickSuggest(sceneType) {
  const presets = {
    dramatic: {
      camera_movement: 'zoom_in',
      shot_type: 'close_up',
      lighting: 'dramatic',
      motion_prompt: '情绪激烈的动作,快速变化,充满张力',
      explanation: '戏剧性场景适合使用特写和戏剧性光线,配合放大镜头增强情绪张力'
    },
    peaceful: {
      camera_movement: 'static',
      shot_type: 'wide_shot',
      lighting: 'soft',
      motion_prompt: '缓慢柔和的动作,宁静祥和,平稳流畅',
      explanation: '平静场景适合使用远景和柔光,静止镜头营造安宁氛围'
    },
    dynamic: {
      camera_movement: 'push_forward',
      shot_type: 'medium_shot',
      lighting: 'natural',
      motion_prompt: '活力四射的运动,充满能量,节奏明快',
      explanation: '动感场景适合推进镜头和中景,自然光线展现真实感'
    },
    cinematic: {
      camera_movement: 'orbit_right',
      shot_type: 'full_shot',
      lighting: 'golden_hour',
      motion_prompt: '电影感的优雅运动,富有美感,层次丰富',
      explanation: '电影感场景适合环绕镜头和黄金时刻光线,全景展现主体'
    },
    mysterious: {
      camera_movement: 'tilt_up',
      shot_type: 'medium_shot',
      lighting: 'backlight',
      motion_prompt: '神秘缓慢的揭示,若隐若现,引人好奇',
      explanation: '神秘场景适合仰拍和背光,中景展现悬念感'
    }
  };

  const preset = presets[sceneType];
  if (preset) {
    logger.info(`返回预设建议: ${sceneType}`);
    return preset;
  }

  throw new Error(`未知场景类型: ${sceneType},可用类型: ${Object.keys(presets).join(', ')}`);
}
