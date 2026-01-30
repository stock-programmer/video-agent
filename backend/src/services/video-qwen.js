import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';
import { Workspace } from '../db/mongodb.js';
import { broadcast } from '../websocket/server.js';
import { uploadVideo, getAccessUrl } from '../utils/oss.js';

const API_BASE = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * Qwen 图生视频服务
 * 使用阿里云 DashScope 平台的通义千问视频生成能力
 */

// ===== v1.1: 辅助函数 =====

/**
 * 将quality_preset映射到Qwen API的resolution参数
 * 基于Task 1.1 API验证结果：API支持720P/1080P
 */
function mapQualityToResolution(quality_preset) {
  const mapping = {
    'draft': '720P',      // 快速预览
    'standard': '1080P',  // 推荐
    'high': '1080P'       // 与standard相同（API限制）
  };
  return mapping[quality_preset] || '1080P';
}

/**
 * 根据motion_intensity为prompt添加运动强度关键词
 * 基于Task 1.1 API验证结果：API不支持motion_intensity参数，需通过prompt增强实现
 */
function enhancePromptWithIntensity(prompt, motion_intensity) {
  // 默认值为3（中等强度），不修改prompt
  if (motion_intensity === 3 || !motion_intensity) {
    return prompt;
  }

  const intensityKeywords = {
    1: 'very slowly, with subtle and minimal movement',
    2: 'slowly and gently',
    3: '',  // 默认，不添加
    4: 'quickly with dynamic motion',
    5: 'very fast, with high energy and rapid movements'
  };

  const keyword = intensityKeywords[motion_intensity];
  if (!keyword) return prompt;

  // 将关键词附加到prompt末尾
  return `${prompt}, ${keyword}`;
}

// 生成视频
export async function generate(workspaceId, formData) {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('工作空间不存在');

    logger.debug(`Workspace 数据: ${JSON.stringify(workspace, null, 2)}`);

    // 验证图片是否已上传
    if (!workspace.image_url) {
      throw new Error('请先上传图片后再生成视频');
    }

    // 如果使用私有bucket,需要重新生成签名URL供Qwen API访问
    // 签名URL会过期,数据库中保存的URL可能已失效
    let imageUrlForQwen = workspace.image_url;
    if (config.oss.usePrivateBucket && workspace.image_path) {
      const objectName = config.oss.imagePath + workspace.image_path;
      // 为Qwen API生成24小时有效期的签名URL(视频生成通常在几分钟内完成)
      imageUrlForQwen = await getAccessUrl(objectName, 86400); // 24小时
      logger.info(`为Qwen API重新生成签名URL: expires=24h, url=${imageUrlForQwen}`);
    }

    logger.info(`开始生成视频: workspace=${workspaceId}`);

    // ===== v1.1: 提取新参数（带默认值） =====
    const duration = formData.duration || 5;  // 默认5秒（API最小值）
    const quality_preset = formData.quality_preset || 'standard';
    const motion_intensity = formData.motion_intensity || 3;
    // aspect_ratio由输入图片决定，API不支持直接设置

    // ===== v1.1: 映射参数 =====
    const resolution = mapQualityToResolution(quality_preset);

    // 构建prompt（包含motion_intensity增强）
    const basePrompt = buildPrompt(formData);
    const enhancedPrompt = enhancePromptWithIntensity(basePrompt, motion_intensity);

    logger.debug(`v1.1参数: duration=${duration}, quality_preset=${quality_preset}, resolution=${resolution}, motion_intensity=${motion_intensity}`);
    logger.debug(`原始prompt: ${basePrompt}`);
    logger.debug(`增强后prompt: ${enhancedPrompt}`);

    // 构建请求体
    const requestBody = {
      model: config.qwen.videoModel || 'wan2.6-i2v',
      input: {
        prompt: enhancedPrompt,
        img_url: imageUrlForQwen  // 使用重新生成的签名URL(私有bucket)或原URL(公开bucket)
      },
      parameters: {
        resolution: resolution,  // v1.1: 基于quality_preset映射
        duration: duration,      // v1.1: 5/10/15秒
        prompt_extend: true,
        watermark: false
      }
    };

    logger.debug(`请求体: ${JSON.stringify(requestBody, null, 2)}`);
    logger.debug(`图片URL: ${workspace.image_url}`);

    // 调用 Qwen 视频生成 API
    const response = await axios.post(
      `${API_BASE}/services/aigc/video-generation/video-synthesis`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKeys.dashscope}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'  // 启用异步模式
        }
      }
    );

    const taskId = response.data.output?.task_id;
    if (!taskId) {
      throw new Error('未获取到任务ID: ' + JSON.stringify(response.data));
    }

    logger.info(`视频生成任务创建成功: taskId=${taskId}`);

    // 更新数据库状态
    await Workspace.findByIdAndUpdate(workspaceId, {
      'video.status': 'generating',
      'video.task_id': taskId,
      updated_at: new Date()
    });

    // WebSocket 推送状态更新
    broadcast({
      type: 'video.status_update',
      workspace_id: workspaceId,
      status: 'generating',
      task_id: taskId
    });

    // 启动轮询
    startPolling(workspaceId, taskId);

    return { task_id: taskId };
  } catch (error) {
    logger.error(`视频生成失败: ${error.message}`);

    // 记录详细的错误信息
    if (error.response) {
      logger.error(`API响应状态: ${error.response.status}`);
      logger.error(`API响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
      logger.error(`API响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
    }

    // 更新数据库为失败状态
    await Workspace.findByIdAndUpdate(workspaceId, {
      'video.status': 'failed',
      'video.error': error.message,
      updated_at: new Date()
    });

    // WebSocket 推送失败状态
    broadcast({
      type: 'video.status_update',
      workspace_id: workspaceId,
      status: 'failed',
      error: error.message
    });

    throw error;
  }
}

// 构建视频生成 prompt
function buildPrompt(formData) {
  const parts = [];

  // 运镜方式
  if (formData.camera_movement) {
    const movements = {
      'push_forward': '镜头向前推进',
      'pull_back': '镜头向后拉远',
      'pan_left': '镜头向左平移',
      'pan_right': '镜头向右平移',
      'tilt_up': '镜头向上仰',
      'tilt_down': '镜头向下俯',
      'zoom_in': '镜头放大',
      'zoom_out': '镜头缩小',
      'static': '镜头静止'
    };
    parts.push(movements[formData.camera_movement] || formData.camera_movement);
  }

  // 景别
  if (formData.shot_type) {
    const shotTypes = {
      'close_up': '特写镜头',
      'medium_shot': '中景镜头',
      'wide_shot': '远景镜头',
      'extreme_close_up': '大特写',
      'full_shot': '全景镜头'
    };
    parts.push(shotTypes[formData.shot_type] || formData.shot_type);
  }

  // 光线
  if (formData.lighting) {
    const lightings = {
      'natural': '自然光线',
      'soft': '柔和光线',
      'hard': '硬光线',
      'backlight': '逆光',
      'golden_hour': '黄金时段光线'
    };
    parts.push(lightings[formData.lighting] || `${formData.lighting}光线`);
  }

  // 主体运动描述
  if (formData.motion_prompt) {
    parts.push(formData.motion_prompt);
  }

  const prompt = parts.join('，');
  logger.debug(`生成的 prompt: ${prompt}`);

  return prompt;
}

// 轮询任务状态
function startPolling(workspaceId, taskId) {
  const startTime = Date.now();
  const timeout = config.video.timeout || 600000; // 默认10分钟
  const interval = config.video.pollInterval || 5000; // 默认5秒

  const poll = async () => {
    try {
      // 检查超时
      if (Date.now() - startTime > timeout) {
        logger.warn(`视频生成超时: taskId=${taskId}, workspaceId=${workspaceId}`);
        await handleFailed(workspaceId, '生成超时，请重试');
        return;
      }

      // 查询任务状态
      const response = await axios.get(
        `${API_BASE}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKeys.dashscope}`
          }
        }
      );

      const taskStatus = response.data.output?.task_status;
      logger.debug(`轮询状态: taskId=${taskId}, status=${taskStatus}`);

      if (taskStatus === 'SUCCEEDED') {
        // 任务成功完成
        const videoUrl = response.data.output?.video_url;
        if (videoUrl) {
          await handleCompleted(workspaceId, videoUrl);
        } else {
          logger.error('任务成功但未获取到视频URL');
          await handleFailed(workspaceId, '视频生成完成但未获取到URL');
        }
      } else if (taskStatus === 'FAILED') {
        // 任务失败
        const errorMsg = response.data.output?.message || '生成失败';
        await handleFailed(workspaceId, errorMsg);
      } else if (taskStatus === 'PENDING' || taskStatus === 'RUNNING') {
        // 任务进行中，继续轮询
        setTimeout(poll, interval);
      } else {
        // 未知状态
        logger.warn(`未知任务状态: ${taskStatus}`);
        setTimeout(poll, interval);
      }
    } catch (error) {
      logger.error('轮询失败', {
        error: error.message,
        status: error.response?.status,
        workspaceId
      });

      // 如果是认证错误或其他严重错误，停止轮询
      if (error.response?.status === 401 || error.response?.status === 403) {
        await handleFailed(workspaceId, 'API认证失败，请检查配置');
      } else {
        // 网络错误等，继续轮询
        setTimeout(poll, interval);
      }
    }
  };

  // 首次轮询延迟一个 interval 后开始
  setTimeout(poll, interval);
}

// 处理生成完成 - 将视频下载后上传到 OSS
async function handleCompleted(workspaceId, videoUrl) {
  logger.info(`视频生成完成: workspaceId=${workspaceId}, videoUrl=${videoUrl}`);

  try {
    // 下载视频 Buffer
    logger.info(`开始下载视频到内存: ${videoUrl}`);
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer',
      timeout: 120000  // 2分钟超时
    });

    const videoBuffer = Buffer.from(response.data);
    logger.info(`视频下载完成: size=${videoBuffer.length} bytes`);

    // 生成唯一文件名
    const timestamp = Date.now();
    const filename = `${workspaceId}_${timestamp}.mp4`;

    // 上传到 OSS
    const ossVideoUrl = await uploadVideo(videoBuffer, filename);

    logger.info(`视频上传到 OSS 成功: filename=${filename}, url=${ossVideoUrl}`);

    // 更新数据库, 保存 OSS URL
    await Workspace.findByIdAndUpdate(workspaceId, {
      'video.status': 'completed',
      'video.url': ossVideoUrl,          // OSS 公开 URL
      'video.remote_url': videoUrl,      // 保存原始 Qwen CDN URL 以备用
      'video.path': filename,            // 仅存储文件名
      'video.error': null,
      updated_at: new Date()
    });

    broadcast({
      type: 'video.status_update',
      workspace_id: workspaceId,
      status: 'completed',
      url: ossVideoUrl  // 前端使用 OSS URL
    });
  } catch (downloadOrUploadError) {
    logger.error(`视频下载或上传到 OSS 失败: ${downloadOrUploadError.message}`);

    // 下载/上传失败时仍然保存远程 URL 作为备用
    await Workspace.findByIdAndUpdate(workspaceId, {
      'video.status': 'completed',
      'video.url': videoUrl,  // 使用远程 URL 作为备用
      'video.error': `视频生成成功但上传到 OSS 失败: ${downloadOrUploadError.message}`,
      updated_at: new Date()
    });

    broadcast({
      type: 'video.status_update',
      workspace_id: workspaceId,
      status: 'completed',
      url: videoUrl,
      warning: '视频已生成但未能上传到 OSS, 使用的是临时链接'
    });
  }
}

// 处理生成失败
async function handleFailed(workspaceId, error) {
  logger.error(`视频生成失败: workspaceId=${workspaceId}, error=${error}`);

  await Workspace.findByIdAndUpdate(workspaceId, {
    'video.status': 'failed',
    'video.error': error,
    updated_at: new Date()
  });

  broadcast({
    type: 'video.status_update',
    workspace_id: workspaceId,
    status: 'failed',
    error
  });
}
