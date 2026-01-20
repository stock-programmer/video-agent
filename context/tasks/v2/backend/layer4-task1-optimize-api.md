# Backend Layer 4 Task 1: 实现 Optimize Prompt API

## 任务元数据

- **任务 ID**: `backend-v2-layer4-task1`
- **任务名称**: 实现 Optimize Prompt API
- **所属层级**: Layer 4 - API 和 WebSocket
- **预计工时**: 2 小时
- **依赖任务**: B-L3-T1 (Prompt Optimizer)
- **可并行任务**: B-L4-T2 (WebSocket Handler)

---

## 任务目标

实现 REST API 端点,触发提示词优化流程。

**核心功能**:
- 接收 workspace_id
- 验证输入参数
- 异步触发优化流程
- 立即返回响应 (流程通过 WebSocket 推送进度)

---

## 实现文件

**文件路径**: `backend/src/api/optimize-prompt.js`

---

## 实现步骤

### Step 1: 实现 API 端点

```javascript
// backend/src/api/optimize-prompt.js
const express = require('express');
const logger = require('../utils/logger');
const { optimizePrompt } = require('../services/prompt-optimizer');
const { Workspace } = require('../db/mongodb');

const router = express.Router();

/**
 * POST /api/optimize-prompt
 *
 * Request Body:
 * {
 *   "workspace_id": "507f1f77bcf86cd799439011"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Optimization started",
 *   "workspace_id": "507f1f77bcf86cd799439011"
 * }
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
    if (!workspace.video || workspace.video.status !== 'completed') {
      logger.warn('Workspace video not ready for optimization', {
        workspace_id,
        videoStatus: workspace.video?.status
      });
      return res.status(400).json({
        success: false,
        error: 'Video must be completed before optimization'
      });
    }

    if (!workspace.video.url) {
      logger.warn('Workspace video has no URL', { workspace_id });
      return res.status(400).json({
        success: false,
        error: 'Video URL is missing'
      });
    }

    logger.info('Workspace validation passed', {
      workspace_id,
      hasImage: !!workspace.image_url,
      videoStatus: workspace.video.status
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
      apiDuration
    });

    // 6. 异步执行优化流程 (不等待完成)
    optimizePrompt(workspace_id, wsBroadcast)
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

module.exports = router;
```

### Step 2: 集成到 Express App

```javascript
// backend/src/app.js (新增部分)

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');

// ========== 现有导入 ==========
const uploadImageRouter = require('./api/upload-image');
const getWorkspacesRouter = require('./api/get-workspaces');
const generateVideoRouter = require('./api/generate-video');
const aiSuggestRouter = require('./api/ai-suggest');

// ========== v2.0 新增导入 ==========
const optimizePromptRouter = require('./api/optimize-prompt');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ========== 现有路由 ==========
app.use('/api/upload', uploadImageRouter);
app.use('/api', getWorkspacesRouter);
app.use('/api/generate', generateVideoRouter);
app.use('/api/ai', aiSuggestRouter);

// ========== v2.0 新增路由 ==========
app.use('/api', optimizePromptRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url
  });
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
```

### Step 3: 单元测试

```javascript
// backend/src/api/__tests__/optimize-prompt.test.js
const request = require('supertest');
const express = require('express');
const optimizePromptRouter = require('../optimize-prompt');
const { optimizePrompt } = require('../../services/prompt-optimizer');
const { Workspace } = require('../../db/mongodb');

jest.mock('../../services/prompt-optimizer');
jest.mock('../../db/mongodb');
jest.mock('../../utils/logger');

describe('POST /api/optimize-prompt', () => {
  let app;
  let mockWsBroadcast;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockWsBroadcast = jest.fn();
    app.set('wsBroadcast', mockWsBroadcast);

    app.use('/api', optimizePromptRouter);

    jest.clearAllMocks();
  });

  const mockWorkspace = {
    _id: 'test-id',
    image_url: 'http://localhost/test.jpg',
    video: {
      status: 'completed',
      url: 'http://localhost/test-video.mp4'
    },
    form_data: { motion_intensity: 3 }
  };

  it('should start optimization successfully', async () => {
    Workspace.findById = jest.fn().mockResolvedValue(mockWorkspace);
    optimizePrompt.mockResolvedValue({
      success: true,
      intentReport: {},
      videoAnalysis: {},
      optimizationResult: {}
    });

    const response = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: 'test-id' })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Optimization started',
      workspace_id: 'test-id'
    });

    // 等待异步调用
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(Workspace.findById).toHaveBeenCalledWith('test-id');
    expect(optimizePrompt).toHaveBeenCalledWith('test-id', mockWsBroadcast);
  });

  it('should return 400 if workspace_id missing', async () => {
    const response = await request(app)
      .post('/api/optimize-prompt')
      .send({})
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: 'workspace_id is required'
    });
  });

  it('should return 404 if workspace not found', async () => {
    Workspace.findById = jest.fn().mockResolvedValue(null);

    const response = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: 'invalid-id' })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  it('should return 400 if video not completed', async () => {
    Workspace.findById = jest.fn().mockResolvedValue({
      ...mockWorkspace,
      video: { status: 'pending' }
    });

    const response = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: 'test-id' })
      .expect(400);

    expect(response.body.error).toContain('must be completed');
  });

  it('should return 400 if video URL missing', async () => {
    Workspace.findById = jest.fn().mockResolvedValue({
      ...mockWorkspace,
      video: { status: 'completed', url: null }
    });

    const response = await request(app)
      .post('/api/optimize-prompt')
      .send({ workspace_id: 'test-id' })
      .expect(400);

    expect(response.body.error).toContain('URL is missing');
  });

  it('should return 500 if WebSocket not initialized', async () => {
    Workspace.findById = jest.fn().mockResolvedValue(mockWorkspace);

    const appNoWs = express();
    appNoWs.use(express.json());
    appNoWs.use('/api', optimizePromptRouter);

    const response = await request(appNoWs)
      .post('/api/optimize-prompt')
      .send({ workspace_id: 'test-id' })
      .expect(500);

    expect(response.body.error).toContain('WebSocket');
  });
});
```

---

## 验收标准

- [ ] API 端点正确注册到 Express app
- [ ] 验证所有输入参数 (workspace_id, video status, video URL)
- [ ] 立即返回 200 响应 (不等待优化完成)
- [ ] 异步触发 `optimizePrompt` 流程
- [ ] 所有错误情况返回适当的 HTTP 状态码
- [ ] 完整的请求/响应日志
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd backend
npm test -- optimize-prompt.test.js
```

---

## 参考文档

- `context/tasks/v2/v2-api-design.md` - API 设计
- `context/tasks/v2/v2-backend-architecture.md` - API 层设计
