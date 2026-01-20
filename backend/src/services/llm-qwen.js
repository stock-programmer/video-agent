import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Alibaba Qwen LLM Service
 * 用于 AI 协作助手功能,提供视频参数优化建议
 *
 * 使用阿里云通义千问大模型 (DashScope API)
 * 支持多种模型: qwen-plus, qwen-turbo, qwen-max
 */

const API_BASE = 'https://dashscope.aliyuncs.com/api/v1';

// 默认模型配置
const DEFAULT_MODEL = 'qwen-plus'; // 平衡性能和成本的推荐模型
const DEFAULT_TEMPERATURE = 0.7; // 适中的创造性

/**
 * 获取 AI 建议
 * @param {Object} workspaceData - 工作空间数据
 * @param {string} userInput - 用户输入的需求
 * @returns {Promise<Object>} AI 建议对象
 */
export async function suggest(workspaceData, userInput) {
  try {
    const apiKey = config.apiKeys.dashscope;
    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY 未配置');
    }

    const prompt = buildPrompt(workspaceData, userInput);

    logger.info('请求 Qwen AI 建议', {
      userInput: userInput.substring(0, 100),
      workspaceId: workspaceData._id,
      model: config.qwen.llmModel || DEFAULT_MODEL
    });

    logger.debug('完整 Prompt:', { prompt: prompt.substring(0, 500) + '...' });

    // 构建请求体
    const requestBody = {
      model: config.qwen.llmModel || DEFAULT_MODEL,
      input: {
        messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        temperature: DEFAULT_TEMPERATURE,
        top_p: 0.8,
        result_format: 'message', // 使用 message 格式便于解析
        enable_search: false, // 不需要联网搜索
        max_tokens: 1500 // 限制输出长度
      }
    };

    logger.debug('Qwen API 请求体:', {
      model: requestBody.model,
      messageCount: requestBody.input.messages.length,
      temperature: requestBody.parameters.temperature
    });

    // 调用 Qwen API
    const response = await axios.post(
      `${API_BASE}/services/aigc/text-generation/generation`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      }
    );

    logger.debug('Qwen API 响应状态:', {
      status: response.status,
      requestId: response.data.request_id
    });

    // 检查响应格式
    if (!response.data || !response.data.output) {
      logger.error('Qwen API 响应格式异常:', response.data);
      throw new Error('API 响应格式异常');
    }

    // 提取 AI 回复内容
    const output = response.data.output;
    const aiMessage = output.choices?.[0]?.message?.content || output.text;

    if (!aiMessage) {
      logger.error('Qwen API 未返回有效内容:', output);
      throw new Error('API 未返回有效内容');
    }

    logger.info('Qwen AI 建议获取成功', {
      contentLength: aiMessage.length,
      finishReason: output.choices?.[0]?.finish_reason
    });

    logger.debug('AI 原始回复:', { content: aiMessage.substring(0, 300) + '...' });

    // 解析返回的建议
    const suggestion = parseAISuggestion(aiMessage);
    logger.debug('解析后的 AI 建议:', suggestion);

    return suggestion;
  } catch (error) {
    logger.error('Qwen AI 建议获取失败', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    // 记录详细的 API 错误信息
    if (error.response) {
      logger.error('Qwen API 错误详情:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }

    // 处理特定错误
    if (error.response?.status === 401) {
      throw new Error('DashScope API Key 无效,请检查 DASHSCOPE_API_KEY 配置');
    } else if (error.response?.status === 429) {
      throw new Error('API 调用频率超限,请稍后再试');
    } else if (error.response?.status === 400) {
      const errorCode = error.response.data?.code;
      const errorMsg = error.response.data?.message || '请求参数错误';
      throw new Error(`API 请求错误: ${errorMsg} (${errorCode || 'UNKNOWN'})`);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('API 请求超时,请稍后重试');
    }

    throw error;
  }
}

/**
 * 获取系统提示词
 * @returns {string} 系统提示词
 */
function getSystemPrompt() {
  return `你是一个专业的视频制作助手,帮助用户优化图生视频的参数配置。

你的任务是根据用户的需求,分析当前视频参数,给出优化建议。

【输出格式要求】
你必须以 JSON 格式输出建议,格式如下:
\`\`\`json
{
  "camera_movement": "运镜方式(英文下划线格式)",
  "shot_type": "镜头类型(英文下划线格式)",
  "lighting": "光线设置(英文下划线格式)",
  "motion_prompt": "主体运动描述(中文)",
  "explanation": "建议理由(中文)"
}
\`\`\`

【参数可选值】
- camera_movement: push_forward, pull_back, pan_left, pan_right, zoom_in, zoom_out, static, tilt_up, tilt_down, orbit_left, orbit_right
- shot_type: close_up, medium_shot, wide_shot, extreme_close_up, full_shot, over_shoulder
- lighting: natural, soft, hard, backlight, golden_hour, blue_hour, rim_light, dramatic

【注意事项】
1. 所有英文字段必须使用下划线格式 (snake_case)
2. motion_prompt 和 explanation 使用中文
3. 必须返回所有 5 个字段
4. 建议要具体且可执行`;
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

  return `【当前视频参数】
- 图片: ${currentParams.image}
- 运镜方式: ${currentParams.cameraMovement}
- 景别: ${currentParams.shotType}
- 光线: ${currentParams.lighting}
- 主体运动: ${currentParams.motionPrompt}
${currentParams.hasVideo ? `- 已生成视频: ${workspaceData.video.url}` : '- 尚未生成视频'}

【用户需求】
${userInput}

【请提供建议】
请分析用户的需求,基于当前参数给出优化建议。务必以 JSON 格式返回,包含所有必需字段。`;
}

/**
 * 解析 AI 返回的建议
 * @param {string} content - AI 返回的文本内容
 * @returns {Object} 结构化建议对象
 */
function parseAISuggestion(content) {
  try {
    // 尝试直接解析 JSON
    let jsonStr = content.trim();

    // 移除可能的 markdown 代码块标记
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // 尝试找到 JSON 对象
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('AI 返回内容中未找到 JSON 对象');
      throw new Error('未找到 JSON 对象');
    }

    const parsed = JSON.parse(jsonMatch[0]);

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
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200)
    });

    // 尝试提取文本建议作为 explanation
    const cleanContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // 返回包含原文的默认结构
    return {
      camera_movement: null,
      shot_type: null,
      lighting: null,
      motion_prompt: null,
      explanation: cleanContent || '无法解析 AI 建议,请重试'
    };
  }
}

/**
 * 获取快速建议 (基于场景预设)
 * @param {string} sceneType - 场景类型 (dramatic, peaceful, dynamic, cinematic, mysterious)
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
