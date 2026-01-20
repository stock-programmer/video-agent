# v2.0 后端技术架构设计

## 文档概述

本文档描述 v2.0 "一键优化提示词" 功能的后端实现架构,包括 REST API、WebSocket 通信、Agent 系统集成。

---

## 设计原则

1. **单文件模块**: 遵循 v1.x 的高内聚设计,一个文件包含完整功能
2. **非阻塞执行**: Agent 系统异步执行,通过 WebSocket 流式推送进度
3. **Human-in-the-Loop**: 支持暂停等待用户确认后继续
4. **向后兼容**: 不修改现有 API 端点和数据库字段

---

## 技术栈

### 新增依赖

```json
// backend/package.json
{
  "dependencies": {
    "langchain": "^0.2.0",                      // Agent 编排框架
    "deepagents": "^1.0.0",                     // 多 Agent 协作框架
    "@langchain/community": "^0.2.0",           // Qwen LLM 集成
    "zod": "^3.22.0"                            // Schema 验证 (deepagents 依赖)
  }
}
```

### 第三方服务

1. **Qwen LLM (通义千问)** - 用于 Master Agent 和 Sub Agents 的推理能力
   - Model: `qwen-plus` (高性能版本)
   - API: 阿里云百炼平台 DashScope
   - 环境变量: `DASHSCOPE_API_KEY` (已有)

2. **Qwen VL (视觉语言模型)** - 用于视频分析
   - Model: `qwen-vl-max` 或 `qwen-vl-plus`
   - 功能: 视频内容理解、质量评估
   - API: DashScope Multimodal Generation

---

## 目录结构

```
backend/src/
├── api/
│   └── optimize-prompt.js          # NEW v2.0: 触发优化 API
│
├── websocket/
│   └── prompt-optimization.js      # NEW v2.0: 优化流程 WebSocket handler
│
├── services/
│   ├── prompt-optimizer.js         # NEW v2.0: Agent 系统主入口
│   ├── agents/
│   │   ├── master-agent.js         # NEW v2.0: Master Agent (总导演)
│   │   ├── intent-agent.js         # NEW v2.0: Intent Analysis Sub-Agent
│   │   └── video-agent.js          # NEW v2.0: Video Analysis Sub-Agent
│   └── qwen-vl.js                  # NEW v2.0: Qwen VL 视频分析服务
│
├── db/
│   └── mongodb.js                  # MODIFY: 扩展 Workspace Schema
│
└── utils/
    └── agent-helpers.js            # NEW v2.0: Agent 工具函数
```

---

## 核心模块设计

### 1. API 端点: optimize-prompt.js

**职责**: 接收优化请求,触发 Agent 系统

**路径**: `POST /api/optimize-prompt`

**Request Body**:
```json
{
  "workspace_id": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Optimization started, progress will be streamed via WebSocket"
}
```

**实现**:
```javascript
// backend/src/api/optimize-prompt.js
const express = require('express');
const router = express.Router();
const { Workspace } = require('../db/mongodb');
const { startOptimizationFlow } = require('../services/prompt-optimizer');
const logger = require('../utils/logger');

router.post('/optimize-prompt', async (req, res) => {
  try {
    const { workspace_id } = req.body;

    // 1. 验证参数
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id is required' });
    }

    // 2. 查询工作空间
    const workspace = await Workspace.findById(workspace_id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // 3. 验证视频是否已生成
    if (workspace.video.status !== 'completed') {
      return res.status(400).json({
        error: 'Cannot optimize: video not generated yet',
        current_status: workspace.video.status
      });
    }

    // 4. 检查是否有正在进行的优化任务 (可选防重)
    // 可通过 Redis 或内存 Map 存储任务状态

    // 5. 异步启动优化流程 (不阻塞响应)
    logger.info(`Starting optimization for workspace ${workspace_id}`);
    startOptimizationFlow(workspace_id, workspace).catch(err => {
      logger.error(`Optimization failed for ${workspace_id}:`, err);
    });

    // 6. 立即返回成功
    res.json({
      success: true,
      message: 'Optimization started, progress will be streamed via WebSocket'
    });

  } catch (error) {
    logger.error('Optimize prompt API error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**集成到 app.js**:
```javascript
// backend/src/app.js
const optimizePromptRouter = require('./api/optimize-prompt');
app.use('/api', optimizePromptRouter);
```

---

### 2. WebSocket Handler: prompt-optimization.js

**职责**: 处理优化流程的实时通信

**消息类型** (Server → Client):
```javascript
// 1. Agent 启动
{ type: 'agent_start', workspace_id, agent: 'intent_analysis', timestamp }

// 2. Agent 进度
{ type: 'agent_progress', workspace_id, agent, message, timestamp }

// 3. Agent 完成
{ type: 'agent_complete', workspace_id, agent, timestamp }

// 4. 意图报告
{ type: 'intent_report', workspace_id, data: IntentReport }

// 5. 等待人工确认
{ type: 'human_loop_pending', workspace_id, message }

// 6. 视频分析结果
{ type: 'video_analysis', workspace_id, data: VideoAnalysis }

// 7. 最终结果
{ type: 'optimization_result', workspace_id, data: OptimizationResult }

// 8. 错误
{ type: 'optimization_error', workspace_id, error: string }
```

**消息类型** (Client → Server):
```javascript
// 人工确认
{ type: 'human_confirm', workspace_id, confirmed: boolean, corrections?: object }
```

**实现**:
```javascript
// backend/src/websocket/prompt-optimization.js
const logger = require('../utils/logger');

/**
 * 注册到 WebSocket 服务器
 * @param {WebSocket.Server} wss
 */
function registerPromptOptimizationHandler(wss) {
  // 存储待处理的人工确认 Promise resolvers
  const pendingConfirmations = new Map(); // key: workspace_id, value: resolve function

  // 广播消息到所有客户端
  function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }

  // 监听客户端消息
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // 处理人工确认消息
        if (data.type === 'human_confirm') {
          const { workspace_id, confirmed, corrections } = data;

          logger.info(`Received human confirmation for ${workspace_id}: ${confirmed}`);

          // 解析等待中的 Promise
          const resolver = pendingConfirmations.get(workspace_id);
          if (resolver) {
            resolver({ confirmed, corrections });
            pendingConfirmations.delete(workspace_id);
          }
        }
      } catch (error) {
        logger.error('WebSocket message parse error:', error);
      }
    });
  });

  return {
    broadcast,
    pendingConfirmations
  };
}

module.exports = { registerPromptOptimizationHandler };
```

**集成到 WebSocket 服务器**:
```javascript
// backend/src/websocket/server.js
const { registerPromptOptimizationHandler } = require('./prompt-optimization');

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  // v2.0: 注册优化流程处理器
  const optHandler = registerPromptOptimizationHandler(wss);

  // 导出给 Agent 系统使用
  global.wsOptimizationHandler = optHandler;

  // ... 现有代码 ...
}
```

---

### 3. Agent 系统主入口: prompt-optimizer.js

**职责**: 编排完整的优化流程

**流程步骤**:
1. 启动 Master Agent
2. 调用 Intent Analysis Sub-Agent
3. 等待 Human-in-the-Loop 确认
4. 调用 Video Analysis Sub-Agent
5. Master Agent 生成最终建议
6. 更新数据库

**实现**:
```javascript
// backend/src/services/prompt-optimizer.js
const { createDeepAgent } = require('deepagents');
const { ChatAlibabaTongyi } = require('@langchain/community/chat_models/alibaba_tongyi');
const { Workspace } = require('../db/mongodb');
const logger = require('../utils/logger');
const { analyzeVideoWithQwenVL } = require('./qwen-vl');

// QwenWithTools wrapper (from job-assistant-qwen.js)
class QwenWithTools extends ChatAlibabaTongyi {
  // ... 实现同 job-assistant-qwen.js ...
}

/**
 * 启动优化流程
 * @param {string} workspaceId
 * @param {object} workspace - MongoDB document
 */
async function startOptimizationFlow(workspaceId, workspace) {
  const wsHandler = global.wsOptimizationHandler;

  try {
    // 1. 发送启动消息
    wsHandler.broadcast({
      type: 'agent_start',
      workspace_id: workspaceId,
      agent: 'master',
      timestamp: new Date().toISOString()
    });

    // 2. 创建 Agent 系统
    const agent = buildPromptOptimizerAgent(workspaceId, workspace);

    // 3. 构建输入上下文
    const context = buildAgentContext(workspace);

    // 4. 执行 Agent
    const result = await agent.invoke({
      messages: [{ role: 'user', content: context }]
    });

    logger.info(`Optimization completed for ${workspaceId}`);

    // 5. 解析最终结果
    const finalResult = parseAgentOutput(result);

    // 6. 更新数据库
    await saveOptimizationResult(workspaceId, finalResult);

    // 7. 发送最终结果到前端
    wsHandler.broadcast({
      type: 'optimization_result',
      workspace_id: workspaceId,
      data: finalResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Optimization error for ${workspaceId}:`, error);

    // 发送错误消息
    wsHandler.broadcast({
      type: 'optimization_error',
      workspace_id: workspaceId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 构建 Agent 系统
 */
function buildPromptOptimizerAgent(workspaceId, workspace) {
  const qwenModel = new QwenWithTools({
    model: 'qwen-plus',
    temperature: 0.3,
    alibabaApiKey: process.env.DASHSCOPE_API_KEY
  });

  // 定义 Sub-Agents
  const subagents = [
    {
      name: 'intent-analysis',
      description: 'Analyze user intent from input parameters',
      prompt: buildIntentAnalysisPrompt(workspace)
    },
    {
      name: 'video-analysis',
      description: 'Analyze generated video quality and issues',
      prompt: buildVideoAnalysisPrompt(workspace)
    }
  ];

  // Master Agent 系统提示词
  const systemPrompt = `You are a video prompt optimization expert.

Your task:
1. First, call the "intent-analysis" sub-agent to understand user's true intent
2. Wait for human confirmation (you will receive a confirmation signal)
3. Then call the "video-analysis" sub-agent to analyze the generated video
4. Finally, compare intent vs actual video, identify NG reasons, and generate optimization suggestions

Output format:
<NG_REASONS>
- Reason 1
- Reason 2
</NG_REASONS>

<OPTIMIZED_PARAMS>
{
  "motion_intensity": 2,
  "camera_movement": "follow",
  "motion_prompt": "..."
}
</OPTIMIZED_PARAMS>

<CHANGES>
[
  {
    "field": "motion_intensity",
    "old_value": 3,
    "new_value": 2,
    "reason": "..."
  }
]
</CHANGES>`;

  return createDeepAgent({
    tools: [],  // 可添加自定义工具
    systemPrompt,
    subagents,
    model: qwenModel
  });
}

/**
 * 构建 Agent 输入上下文
 */
function buildAgentContext(workspace) {
  const { form_data, image_url, video } = workspace;

  return `User's video generation parameters:
- Image: ${image_url}
- Camera Movement: ${form_data.camera_movement}
- Shot Type: ${form_data.shot_type}
- Lighting: ${form_data.lighting}
- Motion Prompt: ${form_data.motion_prompt}
- Duration: ${form_data.duration}s
- Aspect Ratio: ${form_data.aspect_ratio}
- Motion Intensity: ${form_data.motion_intensity}
- Quality: ${form_data.quality_preset}

Generated Video: ${video.url}

Task: Analyze user intent, evaluate video quality, and suggest optimizations.`;
}

/**
 * Intent Analysis Prompt
 */
function buildIntentAnalysisPrompt(workspace) {
  return `Based on the user's input parameters (image, form fields), analyze their TRUE INTENT.

Output JSON format:
{
  "user_intent": {
    "scene_description": "...",
    "desired_mood": "...",
    "key_elements": ["..."],
    "motion_expectation": "..."
  },
  "confidence": 0.85
}

Wrap output in <INTENT_REPORT>...</INTENT_REPORT>`;
}

/**
 * Video Analysis Prompt
 */
function buildVideoAnalysisPrompt(workspace) {
  return `Analyze the generated video at ${workspace.video.url}.

Use Qwen VL to evaluate:
1. Content match with intent (1-10 score)
2. Camera movement appropriateness
3. Motion speed/intensity correctness
4. Technical quality (resolution, fluency)

Output JSON format:
{
  "content_match_score": 7.5,
  "issues": [
    { "category": "motion_mismatch", "description": "...", "severity": "high" }
  ],
  "technical_quality": { "resolution": "1080p", "clarity": 8.0, "fluency": 7.5 }
}

Wrap output in <VIDEO_ANALYSIS>...</VIDEO_ANALYSIS>`;
}

/**
 * 解析 Agent 输出
 */
function parseAgentOutput(result) {
  const finalText = result.messages[result.messages.length - 1]?.content || '';

  // 提取 NG 原因
  const ngMatch = finalText.match(/<NG_REASONS>\s*(.*?)\s*<\/NG_REASONS>/is);
  const ng_reasons = ngMatch
    ? ngMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, '').trim())
    : [];

  // 提取优化参数
  const paramsMatch = finalText.match(/<OPTIMIZED_PARAMS>\s*(.*?)\s*<\/OPTIMIZED_PARAMS>/is);
  const optimized_params = paramsMatch ? JSON.parse(paramsMatch[1]) : {};

  // 提取变更列表
  const changesMatch = finalText.match(/<CHANGES>\s*(.*?)\s*<\/CHANGES>/is);
  const changes = changesMatch ? JSON.parse(changesMatch[1]) : [];

  return {
    ng_reasons,
    optimized_params,
    changes,
    confidence: 0.8  // 可从 Agent 输出提取
  };
}

/**
 * 保存优化结果到数据库
 */
async function saveOptimizationResult(workspaceId, result) {
  const { optimized_params, ng_reasons, changes } = result;

  await Workspace.findByIdAndUpdate(workspaceId, {
    $set: {
      'form_data': {
        ...optimized_params  // 合并优化后的参数
      }
    },
    $push: {
      optimization_history: {
        timestamp: new Date(),
        ng_reasons,
        changes,
        applied: true
      }
    }
  });

  logger.info(`Saved optimization result for ${workspaceId}`);
}

module.exports = {
  startOptimizationFlow
};
```

---

### 4. Qwen VL 视频分析服务: qwen-vl.js

**职责**: 调用 Qwen VL API 分析视频内容

**实现**:
```javascript
// backend/src/services/qwen-vl.js
const axios = require('axios');
const logger = require('../utils/logger');
const fs = require('fs');

const QWEN_VL_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

/**
 * 使用 Qwen VL 分析视频
 * @param {string} videoPath - 本地视频文件路径或 URL
 * @param {string} analysisPrompt - 分析提示词
 * @returns {Promise<object>} 分析结果
 */
async function analyzeVideoWithQwenVL(videoPath, analysisPrompt) {
  try {
    logger.info(`Analyzing video with Qwen VL: ${videoPath}`);

    // 1. 如果是本地文件,需要转换为 base64 或上传到 OSS (根据 API 要求)
    // 简化版: 假设 videoPath 已经是可访问的 URL

    // 2. 构建请求
    const response = await axios.post(
      QWEN_VL_API_URL,
      {
        model: 'qwen-vl-max',  // 或 qwen-vl-plus
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { video: videoPath },  // 视频 URL
                { text: analysisPrompt }
              ]
            }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 3. 解析结果
    const content = response.data.output.choices[0].message.content;
    logger.info('Qwen VL analysis completed');

    return parseVideoAnalysisResult(content);

  } catch (error) {
    logger.error('Qwen VL analysis failed:', error.response?.data || error.message);
    throw new Error(`Video analysis failed: ${error.message}`);
  }
}

/**
 * 解析视频分析结果
 */
function parseVideoAnalysisResult(content) {
  // 尝试提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      logger.warn('Failed to parse video analysis JSON, using raw text');
    }
  }

  // Fallback: 返回原始文本
  return {
    raw_analysis: content,
    content_match_score: 7.0,  // 默认值
    issues: [],
    technical_quality: {}
  };
}

module.exports = {
  analyzeVideoWithQwenVL
};
```

**API 文档参考**:
- 需补充 Qwen VL API 文档到 `context/third-part/qwen-vl-api.txt`
- 多模态生成接口文档: https://help.aliyun.com/zh/dashscope/

---

### 5. Human-in-the-Loop 实现

**关键挑战**: Agent 执行过程中需要暂停等待用户确认

**解决方案**: 在 Agent prompt 中插入等待逻辑

**实现方式 1: 分阶段执行** (推荐)

```javascript
// 在 prompt-optimizer.js 中
async function startOptimizationFlow(workspaceId, workspace) {
  // Phase 1: Intent Analysis
  const intentResult = await executeIntentAnalysis(workspace);

  wsHandler.broadcast({
    type: 'intent_report',
    workspace_id: workspaceId,
    data: intentResult
  });

  // 等待人工确认
  wsHandler.broadcast({
    type: 'human_loop_pending',
    workspace_id: workspaceId,
    message: 'Please confirm the intent analysis result'
  });

  const confirmation = await waitForHumanConfirmation(workspaceId);

  if (!confirmation.confirmed) {
    // 用户拒绝,重新分析或终止
    logger.info('User rejected intent analysis, aborting');
    return;
  }

  // Phase 2: Video Analysis
  const videoResult = await executeVideoAnalysis(workspace, confirmation.corrections || intentResult);

  // Phase 3: Master Decision
  const finalResult = await executeMasterDecision(intentResult, videoResult);

  // ...
}

/**
 * 等待人工确认
 */
function waitForHumanConfirmation(workspaceId) {
  return new Promise((resolve) => {
    const wsHandler = global.wsOptimizationHandler;

    // 设置 resolver 到全局 Map
    wsHandler.pendingConfirmations.set(workspaceId, resolve);

    // 超时保护 (5 分钟)
    setTimeout(() => {
      if (wsHandler.pendingConfirmations.has(workspaceId)) {
        wsHandler.pendingConfirmations.delete(workspaceId);
        resolve({ confirmed: false, timeout: true });
      }
    }, 5 * 60 * 1000);
  });
}
```

**实现方式 2: DeepAgents 原生支持** (如果框架支持)

检查 `deepagents` 是否支持中断和恢复机制,参考 job-assistant-qwen.js 的实现。

---

## 数据库扩展

### Workspace Schema 更新

```javascript
// backend/src/db/mongodb.js

const WorkspaceSchema = new mongoose.Schema({
  // ... 现有字段 ...

  // v2.0: 优化历史
  optimization_history: [
    {
      timestamp: { type: Date, default: Date.now },
      intent_report: {
        user_intent: {
          scene_description: String,
          desired_mood: String,
          key_elements: [String],
          motion_expectation: String
        },
        confidence: Number
      },
      video_analysis: {
        content_match_score: Number,
        issues: [
          {
            category: String,
            description: String,
            severity: String
          }
        ],
        technical_quality: Object
      },
      changes: [
        {
          field: String,
          old_value: mongoose.Schema.Types.Mixed,
          new_value: mongoose.Schema.Types.Mixed,
          reason: String
        }
      ],
      applied: { type: Boolean, default: false }
    }
  ]
}, {
  timestamps: true
});
```

**索引**:
```javascript
WorkspaceSchema.index({ 'optimization_history.timestamp': -1 });
```

---

## 错误处理

### 错误场景

1. **工作空间不存在**
   - API 返回 404
   - 不启动 Agent 系统

2. **视频未生成**
   - API 返回 400
   - 提示用户先生成视频

3. **Agent 执行失败**
   - 捕获异常
   - 通过 WebSocket 发送 `optimization_error` 消息
   - 记录日志

4. **Qwen VL API 调用失败**
   - 重试 3 次 (指数退避)
   - 失败后使用降级方案 (跳过视频分析,仅基于参数优化)

5. **人工确认超时**
   - 5 分钟无响应自动终止
   - 发送超时消息到前端

### 错误日志

```javascript
// 使用 Winston logger
logger.error('Optimization failed', {
  workspace_id: workspaceId,
  error: error.message,
  stack: error.stack,
  phase: 'intent_analysis'  // 或 'video_analysis', 'master_decision'
});
```

---

## 性能优化

### 1. 视频文件访问

**问题**: Qwen VL 需要访问视频文件

**方案**:
- 如果视频存储在本地 `uploads/` 目录,需要提供公网可访问 URL
- 选项 A: 通过 Express 静态路由暴露 (已有: `app.use('/uploads', express.static('uploads'))`)
- 选项 B: 上传到 OSS 并使用 OSS URL (生产环境推荐)

### 2. Agent 执行并发控制

**问题**: 多个用户同时触发优化可能导致 API 限流

**方案**:
- 使用队列 (可选): Bull + Redis
- 简化版: 内存计数器限制最多 3 个并发任务

```javascript
// backend/src/services/prompt-optimizer.js
let activeOptimizations = 0;
const MAX_CONCURRENT = 3;

async function startOptimizationFlow(workspaceId, workspace) {
  if (activeOptimizations >= MAX_CONCURRENT) {
    throw new Error('Too many optimization tasks running, please try again later');
  }

  activeOptimizations++;
  try {
    // ... 执行优化 ...
  } finally {
    activeOptimizations--;
  }
}
```

### 3. WebSocket 连接管理

**问题**: 长时间 Agent 执行可能导致 WebSocket 超时

**方案**:
- 定期发送心跳包 (前端 + 后端)
- 设置合理的超时时间 (5 分钟)

---

## 测试策略

### 单元测试

**optimize-prompt.js API 测试**:
```javascript
// backend/src/api/__tests__/optimize-prompt.test.js
describe('POST /api/optimize-prompt', () => {
  it('should return 400 if workspace_id missing', async () => {
    const res = await request(app).post('/api/optimize-prompt').send({});
    expect(res.status).toBe(400);
  });

  it('should return 404 if workspace not found', async () => {
    const res = await request(app).post('/api/optimize-prompt').send({
      workspace_id: '000000000000000000000000'
    });
    expect(res.status).toBe(404);
  });

  it('should start optimization flow', async () => {
    // Mock workspace with completed video
    const res = await request(app).post('/api/optimize-prompt').send({
      workspace_id: testWorkspaceId
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

**Agent 系统测试**:
```javascript
// backend/src/services/__tests__/prompt-optimizer.test.js
describe('Agent System', () => {
  it('should parse intent analysis output', () => {
    const mockOutput = '<INTENT_REPORT>{"user_intent": {...}}</INTENT_REPORT>';
    const result = parseIntentReport(mockOutput);
    expect(result.user_intent).toBeDefined();
  });

  it('should parse video analysis output', () => {
    // ...
  });
});
```

### 集成测试

**完整优化流程测试**:
```javascript
// backend/src/__tests__/integration/optimization-flow.test.js
describe('Optimization Flow Integration', () => {
  it('should complete full optimization workflow', async () => {
    // 1. 创建测试工作空间
    // 2. 生成视频
    // 3. 触发优化 API
    // 4. 模拟 WebSocket 消息
    // 5. 验证数据库更新
  });
});
```

### Mock 策略

**Mock Qwen API**:
```javascript
jest.mock('@langchain/community/chat_models/alibaba_tongyi', () => ({
  ChatAlibabaTongyi: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      messages: [{ content: '<INTENT_REPORT>...</INTENT_REPORT>' }]
    })
  }))
}));
```

---

## 部署注意事项

### 环境变量

```bash
# backend/.env
DASHSCOPE_API_KEY=your-key  # 已有,用于 Qwen LLM + Qwen VL
```

### 依赖安装

```bash
cd backend
npm install langchain deepagents @langchain/community zod
```

### 生产优化

1. **Agent 超时**: 设置 5 分钟最大执行时间
2. **日志级别**: 生产环境设置为 `info` 或 `warn`
3. **错误监控**: 集成 Sentry 或类似服务 (可选)

---

## 向后兼容性

- 所有 v2.0 模块为新增,不修改 v1.x 现有代码
- 数据库 Schema 新增字段为可选 (默认空数组)
- API 端点为新增路由 (`/api/optimize-prompt`)
- WebSocket 消息类型不冲突

---

## 下一步

阅读以下详细设计文档:
1. **Agent 系统设计**: `v2-agent-system-design.md`
2. **WebSocket 协议**: `v2-websocket-protocol.md`
3. **API 设计**: `v2-api-design.md`
4. **数据库变更**: `v2-database-schema.md`
