# 后端任务 3.3 - Qwen视频生成服务

## 层级
第3层

## 依赖
- backend-dev-plan-1.2-verify-third-party-apis.md
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.3-logger-setup.md
- backend-dev-plan-2.4-database-setup.md

## 并行任务
- backend-dev-plan-3.1-express-server.md
- backend-dev-plan-3.2-websocket-server.md
- backend-dev-plan-3.4-llm-service-gemini.md

## 任务目标
实现 Qwen (通义千问) 图生视频服务,包含异步任务提交、轮询和状态推送

## 参考文档
- `context/backend-architecture-modules.md`
- Qwen API 文档: https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2867393
- 视频生成文档: https://help.aliyun.com/zh/dashscope/developer-reference/video-generation

## 执行步骤

### 1. 创建 src/services/video-qwen.js

```javascript
import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';
import { Workspace } from '../db/mongodb.js';
import { broadcast } from '../websocket/server.js';

const API_BASE = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * Qwen 图生视频服务
 * 使用阿里云 DashScope 平台的通义千问视频生成能力
 */

// 生成视频
export async function generate(workspaceId, formData) {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('工作空间不存在');

    logger.info(`开始生成视频: workspace=${workspaceId}`);

    // 调用 Qwen 视频生成 API
    const response = await axios.post(
      `${API_BASE}/services/aigc/video-generation/generation`,
      {
        model: config.qwen.videoModel || 'qwen-vl-plus',
        input: {
          image_url: workspace.image_url,
          prompt: buildPrompt(formData)
        },
        parameters: {
          duration: 5  // 视频时长（秒）
        }
      },
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
    logger.error('视频生成失败:', error);

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
      logger.error('轮询失败:', error);

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

// 处理生成完成
async function handleCompleted(workspaceId, videoUrl) {
  logger.info(`视频生成完成: workspaceId=${workspaceId}, videoUrl=${videoUrl}`);

  await Workspace.findByIdAndUpdate(workspaceId, {
    'video.status': 'completed',
    'video.url': videoUrl,
    'video.error': null,
    updated_at: new Date()
  });

  broadcast({
    type: 'video.status_update',
    workspace_id: workspaceId,
    status: 'completed',
    url: videoUrl
  });
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
```

### 2. 更新配置文件 src/config.js

确保配置文件包含 Qwen 相关配置：

```javascript
// Qwen 视频生成配置
qwen: {
  videoModel: process.env.QWEN_VIDEO_MODEL || 'qwen-vl-plus',
  baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1'
},

// API Keys
apiKeys: {
  dashscope: process.env.DASHSCOPE_API_KEY,
  google: process.env.GOOGLE_API_KEY
},

// 视频生成配置
video: {
  pollInterval: parseInt(process.env.VIDEO_POLL_INTERVAL) || 5000,
  timeout: parseInt(process.env.VIDEO_TIMEOUT) || 600000
}
```

### 3. 测试服务

创建 `test-video-service.js`:

```javascript
import { generate } from './src/services/video-qwen.js';
import { connectDB } from './src/db/mongodb.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    console.log('连接数据库...');
    await connectDB();

    console.log('测试视频生成服务...');

    // 模拟工作空间数据（需要先创建一个测试工作空间）
    const result = await generate('test-workspace-id', {
      camera_movement: 'push_forward',
      shot_type: 'medium_shot',
      lighting: 'natural',
      motion_prompt: '画面中的人物缓慢行走'
    });

    console.log('✅ 任务提交成功!');
    console.log('任务ID:', result.task_id);
    console.log('正在轮询任务状态，请等待...');

    // 注意：实际视频生成需要1-5分钟，轮询会自动处理
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

test();
```

运行测试:
```bash
node test-video-service.js
```

## 验收标准
- [ ] `src/services/video-qwen.js` 已创建
- [ ] `generate()` 方法调用成功
- [ ] 能够正确提交视频生成任务并获取 task_id
- [ ] 任务状态正确更新到数据库
- [ ] WebSocket 正确推送状态更新
- [ ] 轮询逻辑正常工作（支持 PENDING/RUNNING/SUCCEEDED/FAILED 状态）
- [ ] 超时机制正常（默认10分钟）
- [ ] 错误处理完善（网络错误、认证错误、超时等）
- [ ] 日志记录完整（info、debug、error 级别）
- [ ] Prompt 构建符合中文描述习惯

## 常见问题

### Q1: 为什么使用异步模式？
Qwen 视频生成是一个耗时操作（通常1-5分钟），必须使用异步模式。通过 `X-DashScope-Async: enable` header 启用。

### Q2: 轮询间隔如何设置？
默认5秒一次。太频繁会增加API调用成本，太慢会降低用户体验。可通过环境变量 `VIDEO_POLL_INTERVAL` 调整。

### Q3: 任务状态有哪些？
- `PENDING`: 任务已提交，等待处理
- `RUNNING`: 正在生成视频
- `SUCCEEDED`: 生成成功
- `FAILED`: 生成失败

### Q4: 如何处理网络异常？
轮询函数会捕获网络错误并继续重试，除非遇到认证错误（401/403）才会停止。

## 下一步
- backend-dev-plan-4.3-api-generate-video.md（实现视频生成 API 端点）
- backend-dev-plan-6.1-integration-testing.md（集成测试）
