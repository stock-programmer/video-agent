# v2.0 开发计划

## 文档概述

本文档提供 v2.0 "一键优化提示词" 功能的完整开发计划,包括任务分解、依赖关系、时间估算、里程碑。

---

## 开发原则

1. **向后兼容**: 不破坏 v1.x 功能
2. **渐进式开发**: 前后端并行,模块独立
3. **先后端后前端**: Agent 系统优先,UI 其次
4. **测试驱动**: 每个模块完成后立即测试

---

## 总体时间线

**预计总时长**: 3-4 周 (约 15-20 工作日)

**阶段划分**:
- **Phase 1**: 环境准备与依赖安装 (1天)
- **Phase 2**: 后端核心开发 (7-10天)
- **Phase 3**: 前端 UI 开发 (4-5天)
- **Phase 4**: 集成测试与优化 (2-3天)
- **Phase 5**: 部署与上线 (1天)

---

## Phase 1: 环境准备与依赖安装

**目标**: 安装新依赖,验证第三方 API 可用性

**时长**: 1 天

### 任务清单

#### 1.1 安装 Node.js 依赖 ⏱️ 30min

**后端**:
```bash
cd backend
npm install langchain deepagents @langchain/community zod
```

**验证**:
```bash
npm list langchain
npm list deepagents
```

**输出**: `package.json` 更新

---

#### 1.2 验证 Qwen API 可用性 ⏱️ 1h

**任务**: 测试 Qwen LLM 和 Qwen VL API

**测试脚本**: 创建 `backend/test-qwen-integration.js`

```javascript
// backend/test-qwen-integration.js
const { ChatAlibabaTongyi } = require('@langchain/community/chat_models/alibaba_tongyi');
require('dotenv').config();

async function testQwenLLM() {
  const model = new ChatAlibabaTongyi({
    model: 'qwen-plus',
    alibabaApiKey: process.env.DASHSCOPE_API_KEY
  });

  const result = await model.invoke([
    { role: 'user', content: 'Hello, Qwen!' }
  ]);

  console.log('Qwen LLM Response:', result.content);
}

async function testQwenVL() {
  const axios = require('axios');

  const response = await axios.post(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    {
      model: 'qwen-vl-max',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { text: 'Describe this image' },
              { image: 'https://example.com/test.jpg' }
            ]
          }
        ]
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Qwen VL Response:', response.data);
}

testQwenLLM().then(() => testQwenVL());
```

**运行**:
```bash
node backend/test-qwen-integration.js
```

**预期结果**: 无错误,返回正常响应

---

#### 1.3 研究 DeepAgents 框架 ⏱️ 2h

**任务**: 阅读 `context/third-part/job-assistant-qwen.js`,理解:
- `QwenWithTools` wrapper 实现
- `createDeepAgent()` 用法
- Sub-agents 定义方式
- Human-in-the-Loop 实现 (如果框架支持)

**输出**: 技术笔记,确认实现方案

---

#### 1.4 数据库 Schema 更新 ⏱️ 30min

**任务**: 更新 `backend/src/db/mongodb.js`,添加 `optimization_history` 字段

**参考**: `v2-database-schema.md`

**验证**:
```bash
cd backend
npm start  # 启动服务,Mongoose 自动创建索引
```

**检查**: MongoDB Compass 查看 Schema 是否更新

---

**Phase 1 输出**:
- ✅ 依赖安装完成
- ✅ Qwen API 验证通过
- ✅ DeepAgents 框架理解清晰
- ✅ 数据库 Schema 已更新

---

## Phase 2: 后端核心开发

**目标**: 实现 Agent 系统、API、WebSocket 通信

**时长**: 7-10 天

### Layer 1: 基础工具模块 (Day 2)

#### 2.1 实现 Qwen VL 视频分析服务 ⏱️ 3h

**文件**: `backend/src/services/qwen-vl.js`

**功能**:
- 调用 Qwen VL API 分析视频
- 解析分析结果
- 错误处理与重试

**参考**: `v2-backend-architecture.md` - Qwen VL 部分

**测试**:
```bash
node backend/src/services/__tests__/qwen-vl.test.js
```

---

#### 2.2 实现 Agent 辅助工具 ⏱️ 2h

**文件**: `backend/src/utils/agent-helpers.js`

**功能**:
- `parseIntentReport()` - 解析意图报告
- `parseVideoAnalysis()` - 解析视频分析
- `parseOptimizationResult()` - 解析优化结果
- `buildAgentContext()` - 构建 Agent 上下文

**测试**: 单元测试

---

#### 2.3 实现 QwenWithTools Wrapper ⏱️ 2h

**文件**: `backend/src/services/agents/qwen-wrapper.js`

**功能**: 复用 `job-assistant-qwen.js` 中的 `QwenWithTools` 实现

**测试**: 验证 tool binding 功能

---

### Layer 2: Agent 系统核心 (Day 3-4)

#### 2.4 实现 Intent Analysis Sub-Agent ⏱️ 4h

**文件**: `backend/src/services/agents/intent-agent.js`

**功能**:
- 定义意图分析 Prompt
- 执行 LLM 调用
- 解析意图报告
- 错误处理

**参考**: `v2-agent-system-design.md` - Intent Analysis 部分

**测试**:
```javascript
const { executeIntentAnalysis } = require('./intent-agent');

const workspace = { /* mock data */ };
const result = await executeIntentAnalysis(workspace);

expect(result.user_intent).toBeDefined();
expect(result.confidence).toBeGreaterThan(0.5);
```

---

#### 2.5 实现 Video Analysis Sub-Agent ⏱️ 4h

**文件**: `backend/src/services/agents/video-agent.js`

**功能**:
- 定义视频分析 Prompt
- 调用 Qwen VL 获取视频内容
- 执行 LLM 分析
- 解析视频分析结果

**参考**: `v2-agent-system-design.md` - Video Analysis 部分

**测试**: Mock Qwen VL 响应,验证解析逻辑

---

#### 2.6 实现 Master Agent ⏱️ 6h

**文件**: `backend/src/services/agents/master-agent.js`

**功能**:
- 定义 Master Prompt
- 使用 DeepAgents 创建 multi-agent 系统
- 编排 Sub-Agents 执行顺序
- 整合分析结果
- 生成最终优化方案

**参考**: `v2-agent-system-design.md` - Master Agent 部分

**测试**: 集成测试,验证完整流程

---

### Layer 3: Agent 系统主入口 (Day 5)

#### 2.7 实现 Prompt Optimizer 主流程 ⏱️ 6h

**文件**: `backend/src/services/prompt-optimizer.js`

**功能**:
- `startOptimizationFlow()` - 主流程入口
- 分阶段执行 Agent
- Human-in-the-Loop 等待逻辑
- WebSocket 进度推送
- 数据库结果保存

**参考**: `v2-backend-architecture.md` - Agent 系统主入口

**关键难点**: Human-in-the-Loop 异步等待

```javascript
async function startOptimizationFlow(workspaceId, workspace) {
  // Phase 1: Intent Analysis
  const intentResult = await executeIntentAnalysis(workspace);

  wsHandler.broadcast({ type: 'intent_report', data: intentResult });

  // 等待人工确认 (异步阻塞)
  const confirmation = await waitForHumanConfirmation(workspaceId);

  if (!confirmation.confirmed) return;

  // Phase 2: Video Analysis
  const videoResult = await executeVideoAnalysis(workspace, confirmation.corrections || intentResult);

  // Phase 3: Master Decision
  const finalResult = await executeMasterDecision(intentResult, videoResult);

  // Save to DB
  await saveOptimizationResult(workspaceId, finalResult);

  // Broadcast final result
  wsHandler.broadcast({ type: 'optimization_result', data: finalResult });
}
```

**测试**: Mock WebSocket,验证流程完整性

---

### Layer 4: API 和 WebSocket (Day 6)

#### 2.8 实现 Optimize Prompt API ⏱️ 2h

**文件**: `backend/src/api/optimize-prompt.js`

**功能**:
- 验证请求参数
- 查询工作空间
- 验证视频生成状态
- 触发异步优化流程

**参考**: `v2-api-design.md`

**测试**:
```bash
npm test -- optimize-prompt.test.js
```

---

#### 2.9 实现 WebSocket 优化协议 ⏱️ 3h

**文件**: `backend/src/websocket/prompt-optimization.js`

**功能**:
- 注册 WebSocket handler
- 广播进度消息
- 处理 `human_confirm` 消息
- 管理 pending confirmations Map

**参考**: `v2-websocket-protocol.md`

**测试**: WebSocket 集成测试

---

#### 2.10 集成到主服务器 ⏱️ 1h

**修改文件**:
- `backend/src/app.js` - 注册 API 路由
- `backend/src/websocket/server.js` - 注册 WebSocket handler

**验证**: 启动服务器,测试端到端流程

---

### Layer 5: 错误处理与日志 (Day 7)

#### 2.11 完善错误处理 ⏱️ 3h

**任务**:
- Agent 执行异常捕获
- Qwen API 调用失败重试
- 超时保护
- WebSocket 错误消息

**参考**: `v2-backend-architecture.md` - 错误处理

---

#### 2.12 添加日志记录 ⏱️ 2h

**任务**:
- Winston logger 集成
- 关键步骤日志
- 错误日志
- 性能监控埋点

---

**Phase 2 输出**:
- ✅ Agent 系统完整实现
- ✅ API 端点可用
- ✅ WebSocket 通信正常
- ✅ 单元测试通过

---

## Phase 3: 前端 UI 开发

**目标**: 实现用户界面和 WebSocket 集成

**时长**: 4-5 天

### Layer 1: 状态管理 (Day 8)

#### 3.1 扩展 Zustand Store ⏱️ 3h

**文件**: `frontend/src/stores/workspaceStore.ts`

**新增 State**:
- `optimizationStates: Record<string, OptimizationState>`

**新增 Actions**:
- `startOptimization()`
- `addProgressMessage()`
- `setIntentReport()`
- `setVideoAnalysis()`
- `setFinalResult()`
- `applyOptimization()`

**参考**: `v2-frontend-architecture.md` - 状态管理

**测试**: `workspaceStore.test.ts`

---

#### 3.2 扩展 WebSocket Client ⏱️ 2h

**文件**: `frontend/src/services/websocket.ts`

**新增方法**:
- `sendHumanConfirmation()`

**新增消息监听**:
- 处理 v2.0 新增消息类型

**测试**: Mock WebSocket,验证消息处理

---

### Layer 2: 基础组件 (Day 9)

#### 3.3 实现 OptimizeButton 组件 ⏱️ 2h

**文件**: `frontend/src/components/v2/OptimizeButton.tsx`

**功能**:
- 触发优化 API
- 加载状态
- 自动滚动到 AI 输出区

**参考**: `v2-frontend-architecture.md` - OptimizeButton

**测试**: 组件单元测试

---

#### 3.4 实现 AgentProgress 组件 ⏱️ 2h

**文件**: `frontend/src/components/v2/AgentProgress.tsx`

**功能**:
- 渲染单条进度消息
- 图标和颜色区分
- 时间戳格式化

**测试**: Storybook (可选)

---

### Layer 3: 核心组件 (Day 10-11)

#### 3.5 实现 AIOutputArea 组件 ⏱️ 4h

**文件**: `frontend/src/components/v2/AIOutputArea.tsx`

**功能**:
- 流式显示进度消息
- 自动滚动到底部
- WebSocket 消息监听
- 垂直滚动条

**参考**: `v2-frontend-architecture.md` - AIOutputArea

**测试**: 集成测试

---

#### 3.6 实现 IntentReportModal 组件 ⏱️ 4h

**文件**: `frontend/src/components/v2/IntentReportModal.tsx`

**功能**:
- 全屏弹窗显示意图报告
- 确认/拒绝/修正按钮
- 意图修正表单
- 发送 WebSocket 消息

**参考**: `v2-frontend-architecture.md` - IntentReportModal

**测试**: 用户交互测试

---

#### 3.7 实现 OptimizationResult 组件 ⏱️ 3h

**文件**: `frontend/src/components/v2/OptimizationResult.tsx`

**功能**:
- 显示 NG 原因
- 参数前后对比
- 变更原因说明
- 置信度展示

**参考**: `v2-frontend-architecture.md` - OptimizationResult

**测试**: Snapshot 测试

---

### Layer 4: 集成到 Workspace (Day 12)

#### 3.8 修改 Workspace 组件 ⏱️ 2h

**文件**: `frontend/src/components/Workspace.tsx`

**修改**:
- 添加 OptimizeButton (视频下载按钮下方)
- 添加 AIOutputArea (AI 协作助手上方)

**布局调整**:
- 确保 AI 输出区不推出工作空间
- 垂直滚动条

---

#### 3.9 样式优化 ⏱️ 2h

**任务**:
- Tailwind CSS 样式调整
- 动画效果 (淡入/淡出)
- 响应式布局
- 滚动条美化

---

**Phase 3 输出**:
- ✅ 所有 UI 组件完成
- ✅ WebSocket 集成正常
- ✅ 用户交互流畅

---

## Phase 4: 集成测试与优化

**目标**: 端到端测试,修复 Bug,性能优化

**时长**: 2-3 天

### Day 13: 端到端测试

#### 4.1 完整流程测试 ⏱️ 4h

**测试场景**:
1. 用户上传图片,生成视频 (v1.x 功能)
2. 点击"一键优化提示词"按钮
3. 后端 Agent 系统执行
4. 前端实时显示进度
5. 用户确认意图
6. 收到最终优化结果
7. 表单参数自动更新
8. 用户重新生成视频

**验证点**:
- API 响应时间 < 500ms
- WebSocket 消息延迟 < 100ms
- Agent 执行总时长 < 3 分钟
- UI 无卡顿

---

#### 4.2 边界情况测试 ⏱️ 3h

**测试场景**:
- 用户拒绝意图确认
- Qwen API 调用失败
- WebSocket 连接断开
- 用户长时间不确认 (超时)
- 并发多个优化请求

---

### Day 14: Bug 修复与优化

#### 4.3 Bug 修复 ⏱️ 4h

**根据测试结果修复**:
- Agent 输出解析错误
- WebSocket 消息丢失
- UI 渲染问题
- 内存泄漏

---

#### 4.4 性能优化 ⏱️ 3h

**优化项**:
- Agent 执行并行化 (可行的部分)
- WebSocket 消息节流
- 前端组件 Memoization
- 数据库查询优化

---

**Phase 4 输出**:
- ✅ 所有测试用例通过
- ✅ 已知 Bug 全部修复
- ✅ 性能指标达标

---

## Phase 5: 部署与上线

**目标**: 部署到生产环境,监控运行状态

**时长**: 1 天

### Day 15: 部署

#### 5.1 更新依赖与配置 ⏱️ 1h

**后端**:
```bash
cd backend
npm install --production
```

**前端**:
```bash
cd frontend
npm run build
```

**环境变量**: 确保 `DASHSCOPE_API_KEY` 已配置

---

#### 5.2 数据库迁移 ⏱️ 30min

**运行迁移脚本** (可选):
```bash
node backend/migrate-v2.js
```

**验证**: 检查 `optimization_history` 字段存在

---

#### 5.3 部署到服务器 ⏱️ 2h

**步骤**:
1. Git push 到生产分支
2. SSH 到服务器
3. Pull 最新代码
4. 重启后端服务
5. 部署前端静态文件

**验证**:
- 后端 API 可访问
- WebSocket 连接正常
- 前端页面加载

---

#### 5.4 监控与日志 ⏱️ 1h

**配置**:
- Winston 日志级别: `info`
- 错误监控: Sentry (可选)
- 性能监控: New Relic (可选)

**验证**:
- 日志文件正常写入
- 错误能被捕获

---

**Phase 5 输出**:
- ✅ v2.0 已部署上线
- ✅ 监控系统运行正常

---

## 任务依赖图

```
Phase 1 (环境准备)
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│                                             │
↓                                             ↓
Phase 2 (后端开发)                       Phase 3 (前端开发)
├─ Layer 1: 工具模块                      ├─ Layer 1: 状态管理
│   ├─ Qwen VL 服务                       │   ├─ Zustand Store
│   ├─ Agent 辅助工具                     │   └─ WebSocket Client
│   └─ QwenWithTools                      │
├─ Layer 2: Agent 核心                    ├─ Layer 2: 基础组件
│   ├─ Intent Agent ──┐                   │   ├─ OptimizeButton
│   ├─ Video Agent ───┼─→ Layer 3        │   └─ AgentProgress
│   └─ Master Agent ──┘                   │
├─ Layer 3: 主入口                        ├─ Layer 3: 核心组件
│   └─ Prompt Optimizer ─→ Layer 4       │   ├─ AIOutputArea
│                                         │   ├─ IntentReportModal
├─ Layer 4: API/WebSocket                 │   └─ OptimizationResult
│   ├─ Optimize API                       │
│   └─ WebSocket Handler ─────────────────┼─→ Layer 4: 集成
└─ Layer 5: 错误处理/日志                 │   └─ Workspace 修改
                                          └─ 样式优化
                ↓                             ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        ↓
                 Phase 4 (集成测试)
                   ├─ E2E 测试
                   ├─ Bug 修复
                   └─ 性能优化
                        ↓
                 Phase 5 (部署)
```

---

## 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| **M1: 环境准备完成** | Day 1 | 依赖安装,API 验证通过 |
| **M2: 后端核心完成** | Day 7 | Agent 系统可运行,API 可调用 |
| **M3: 前端 UI 完成** | Day 12 | 所有组件实现,集成到 Workspace |
| **M4: 集成测试通过** | Day 14 | E2E 测试通过,Bug 修复完成 |
| **M5: 生产部署** | Day 15 | v2.0 上线运行 |

---

## 风险与应对

### 风险 1: DeepAgents 框架学习曲线

**影响**: 后端开发延期 2-3 天

**应对**:
- 提前深入研究 `job-assistant-qwen.js`
- 考虑手动实现 multi-agent 逻辑 (不依赖框架)

---

### 风险 2: Qwen VL API 不稳定

**影响**: 视频分析失败率高

**应对**:
- 实现降级方案 (跳过视频分析,仅基于参数优化)
- 增加重试次数 (3次 → 5次)
- 考虑缓存视频分析结果

---

### 风险 3: Human-in-the-Loop 实现复杂

**影响**: 开发时间延长 1-2 天

**应对**:
- 分阶段执行 Agent (不使用 DeepAgents 原生暂停)
- WebSocket + Promise 实现异步等待

---

### 风险 4: WebSocket 消息同步问题

**影响**: 前端显示不完整或错乱

**应对**:
- 每条消息带 `workspace_id` 和 `timestamp`
- 前端过滤非当前工作空间消息
- 添加消息序号,确保顺序

---

## 后续迭代 (v2.1+)

**可能的增强**:
1. **优化历史查看**: 展示历史优化记录,支持回滚
2. **批量优化**: 同时优化多个工作空间
3. **A/B 测试模式**: 生成两个优化方案对比
4. **自定义 Agent 规则**: 用户配置优化策略
5. **更强的视频分析**: 集成更多视觉模型

---

## 总结

**预计总工时**: 15-20 工作日 (3-4 周)

**关键成功因素**:
1. Qwen API 稳定性
2. DeepAgents 框架掌握
3. WebSocket 实时通信可靠性
4. Human-in-the-Loop 用户体验

**技术亮点**:
- 多 Agent 协作系统
- Human-in-the-Loop 设计
- 流式进度展示
- 向后兼容的架构

---

## 参考文档

1. **架构总览**: `v2-architecture-overview.md`
2. **前端架构**: `v2-frontend-architecture.md`
3. **后端架构**: `v2-backend-architecture.md`
4. **Agent 系统**: `v2-agent-system-design.md`
5. **WebSocket 协议**: `v2-websocket-protocol.md`
6. **API 设计**: `v2-api-design.md`
7. **数据库变更**: `v2-database-schema.md`
8. **技术参考**: `context/third-part/job-assistant-qwen.js`
