# v2.0 API 设计文档

## 文档概述

本文档定义 v2.0 新增的 REST API 端点,包括请求/响应格式、错误处理、验证规则。

---

## 新增 API 端点

### POST /api/optimize-prompt

**功能**: 触发工作空间的提示词优化流程

**URL**: `/api/optimize-prompt`

**Method**: `POST`

**Content-Type**: `application/json`

---

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `workspace_id` | string | 是 | 工作空间 MongoDB ObjectId |

**Request Example**:
```json
{
  "workspace_id": "507f1f77bcf86cd799439011"
}
```

**Validation Rules**:
1. `workspace_id` 必须是合法的 MongoDB ObjectId 格式 (24位十六进制字符串)
2. 工作空间必须存在于数据库中
3. 工作空间的 `video.status` 必须为 `'completed'` (已生成视频)

**Validation Errors**:
```javascript
// 400 Bad Request - workspace_id 缺失
{
  "error": "workspace_id is required"
}

// 400 Bad Request - workspace_id 格式错误
{
  "error": "Invalid workspace_id format"
}

// 404 Not Found - 工作空间不存在
{
  "error": "Workspace not found"
}

// 400 Bad Request - 视频未生成
{
  "error": "Cannot optimize: video not generated yet",
  "current_status": "pending" | "generating" | "failed"
}
```

---

#### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "message": "Optimization started, progress will be streamed via WebSocket"
}
```

**说明**:
- API 立即返回,不等待优化完成
- 优化进度通过 WebSocket 流式推送到前端
- 响应时间: < 500ms (仅启动流程,不执行 Agent)

---

#### Error Responses

**400 Bad Request**:
```json
{
  "error": "Error message describing the validation failure"
}
```

**404 Not Found**:
```json
{
  "error": "Workspace not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error message"
}
```

**503 Service Unavailable** (可选):
```json
{
  "error": "Too many optimization tasks running, please try again later",
  "retry_after": 60  // seconds
}
```

---

## 实现代码

### API Handler

```javascript
// backend/src/api/optimize-prompt.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Workspace } = require('../db/mongodb');
const { startOptimizationFlow } = require('../services/prompt-optimizer');
const logger = require('../utils/logger');

/**
 * POST /api/optimize-prompt
 * 触发工作空间提示词优化
 */
router.post('/optimize-prompt', async (req, res) => {
  try {
    const { workspace_id } = req.body;

    // 1. 验证 workspace_id 存在
    if (!workspace_id) {
      return res.status(400).json({
        error: 'workspace_id is required'
      });
    }

    // 2. 验证 workspace_id 格式
    if (!mongoose.Types.ObjectId.isValid(workspace_id)) {
      return res.status(400).json({
        error: 'Invalid workspace_id format'
      });
    }

    // 3. 查询工作空间
    const workspace = await Workspace.findById(workspace_id);
    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found'
      });
    }

    // 4. 验证视频生成状态
    if (workspace.video.status !== 'completed') {
      return res.status(400).json({
        error: 'Cannot optimize: video not generated yet',
        current_status: workspace.video.status
      });
    }

    // 5. (可选) 检查并发限制
    // const activeCount = getActiveOptimizationCount();
    // if (activeCount >= MAX_CONCURRENT_OPTIMIZATIONS) {
    //   return res.status(503).json({
    //     error: 'Too many optimization tasks running, please try again later',
    //     retry_after: 60
    //   });
    // }

    // 6. 异步启动优化流程 (不阻塞响应)
    logger.info(`Starting optimization for workspace ${workspace_id}`);

    startOptimizationFlow(workspace_id, workspace)
      .catch(error => {
        logger.error(`Optimization failed for ${workspace_id}:`, error);
        // 错误会通过 WebSocket 发送到前端
      });

    // 7. 立即返回成功
    res.json({
      success: true,
      message: 'Optimization started, progress will be streamed via WebSocket'
    });

  } catch (error) {
    logger.error('Optimize prompt API error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
```

### 集成到 Express App

```javascript
// backend/src/app.js
const express = require('express');
const optimizePromptRouter = require('./api/optimize-prompt');

const app = express();

// ... 现有中间件 ...

// v1.x API
app.use('/api', require('./api/upload-image'));
app.use('/api', require('./api/get-workspaces'));
app.use('/api', require('./api/generate-video'));
app.use('/api', require('./api/ai-suggest'));

// v2.0 API
app.use('/api', optimizePromptRouter);

module.exports = app;
```

---

## 前端集成

### API Client

```typescript
// frontend/src/services/api.ts

/**
 * 触发提示词优化
 * @param workspaceId - 工作空间ID
 * @returns Promise<{ success: boolean, message: string }>
 */
export async function triggerOptimization(workspaceId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch('/api/optimize-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ workspace_id: workspaceId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Optimization request failed');
  }

  return response.json();
}
```

### 使用示例

```typescript
// frontend/src/components/v2/OptimizeButton.tsx
import { triggerOptimization } from '@/services/api';

const handleClick = async () => {
  setIsLoading(true);

  try {
    const result = await triggerOptimization(workspaceId);
    console.log(result.message);

    // 启动前端优化状态
    startOptimization(workspaceId);

    // 滚动到 AI 输出区
    scrollToAIOutputArea();

  } catch (error) {
    console.error('Optimization failed:', error);
    alert(`优化失败: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 测试

### Unit Tests

```javascript
// backend/src/api/__tests__/optimize-prompt.test.js
const request = require('supertest');
const app = require('../app');
const { Workspace } = require('../db/mongodb');

describe('POST /api/optimize-prompt', () => {
  beforeEach(async () => {
    // 清空测试数据库
    await Workspace.deleteMany({});
  });

  it('should return 400 if workspace_id is missing', async () => {
    const res = await request(app)
      .post('/api/optimize-prompt')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('workspace_id is required');
  });

  it('should return 400 if workspace_id format is invalid', async () => {
    const res = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: 'invalid-id' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid workspace_id format');
  });

  it('should return 404 if workspace not found', async () => {
    const res = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Workspace not found');
  });

  it('should return 400 if video not completed', async () => {
    // 创建测试工作空间 (视频未完成)
    const workspace = await Workspace.create({
      order_index: 0,
      image_path: '/uploads/test.jpg',
      form_data: {},
      video: { status: 'generating' }
    });

    const res = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: workspace._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('video not generated yet');
    expect(res.body.current_status).toBe('generating');
  });

  it('should return 200 and start optimization if valid', async () => {
    // 创建测试工作空间 (视频已完成)
    const workspace = await Workspace.create({
      order_index: 0,
      image_path: '/uploads/test.jpg',
      image_url: '/uploads/test.jpg',
      form_data: {
        motion_intensity: 3,
        camera_movement: 'push_in'
      },
      video: {
        status: 'completed',
        url: '/uploads/test-video.mp4'
      }
    });

    const res = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: workspace._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Optimization started');
  });
});
```

### Integration Tests

```javascript
// backend/src/__tests__/integration/optimization-api.test.js
describe('Optimization API Integration', () => {
  it('should trigger optimization and stream progress via WebSocket', async (done) => {
    // 1. 创建测试工作空间
    const workspace = await createTestWorkspace();

    // 2. 建立 WebSocket 连接
    const ws = new WebSocket('ws://localhost:3001');

    const receivedMessages = [];

    ws.on('message', (data) => {
      receivedMessages.push(JSON.parse(data));

      // 检查是否收到最终结果
      const lastMsg = receivedMessages[receivedMessages.length - 1];
      if (lastMsg.type === 'optimization_result') {
        expect(receivedMessages).toContainEqual(
          expect.objectContaining({ type: 'agent_start' })
        );
        expect(receivedMessages).toContainEqual(
          expect.objectContaining({ type: 'intent_report' })
        );
        done();
      }
    });

    // 3. 触发优化 API
    await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: workspace._id.toString() });

    // 4. 等待 WebSocket 消息 (超时 30 秒)
  }, 30000);
});
```

---

## 性能考虑

### 并发限制

**问题**: 多个用户同时触发优化可能导致资源耗尽

**方案**: 全局并发限制 (可选)

```javascript
// backend/src/api/optimize-prompt.js
let activeOptimizations = 0;
const MAX_CONCURRENT = 3;

router.post('/optimize-prompt', async (req, res) => {
  // ... 验证逻辑 ...

  // 检查并发数
  if (activeOptimizations >= MAX_CONCURRENT) {
    return res.status(503).json({
      error: 'Too many optimization tasks running, please try again later',
      retry_after: 60
    });
  }

  activeOptimizations++;

  startOptimizationFlow(workspace_id, workspace)
    .catch(error => logger.error('Optimization failed:', error))
    .finally(() => {
      activeOptimizations--;
    });

  res.json({ success: true, message: '...' });
});
```

### 幂等性

**问题**: 用户重复点击优化按钮

**方案 1**: 前端防抖 (简单,推荐)

```typescript
// OptimizeButton.tsx
const [isOptimizing, setIsOptimizing] = useState(false);

const handleClick = async () => {
  if (isOptimizing) return;  // 防止重复点击
  // ...
};
```

**方案 2**: 后端任务去重 (复杂)

使用 Redis 存储正在执行的任务 ID,拒绝重复请求。

---

## 安全性

### 输入验证

✅ **已实现**:
- workspace_id 格式验证 (MongoDB ObjectId)
- 工作空间存在性验证
- 视频生成状态验证

### 授权 (未实现 - MVP 单用户)

**未来**: 多用户版本需添加:
- 验证用户是否拥有该工作空间
- JWT token 验证
- Rate limiting (API 调用频率限制)

---

## 监控与日志

### 日志记录

```javascript
// API 入口
logger.info(`Optimization request for workspace ${workspace_id}`);

// 启动成功
logger.info(`Optimization started for ${workspace_id}`);

// 错误
logger.error(`Optimization failed for ${workspace_id}:`, error);
```

### 监控指标 (可选)

- 优化请求数 (QPS)
- 优化成功率
- 平均优化时长
- Agent 执行失败率

**实现**: 集成 Prometheus + Grafana (生产环境)

---

## API 版本管理

### v2.0 向后兼容

- 新增端点 `/api/optimize-prompt`,不影响 v1.x API
- 所有 v1.x 端点保持不变

### 未来版本 (v2.1+)

**可能的扩展**:
- `GET /api/optimization-history/:workspace_id` - 查询优化历史
- `POST /api/batch-optimize` - 批量优化多个工作空间
- `DELETE /api/cancel-optimization/:workspace_id` - 取消正在进行的优化

---

## 下一步

阅读相关文档:
- **数据库变更**: `v2-database-schema.md`
- **开发计划**: `v2-development-plan.md`
