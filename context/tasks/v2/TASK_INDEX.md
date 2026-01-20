# v2.0 DAG 开发任务 - 完整索引

## 文档概述

本目录包含 v2.0 "一键优化提示词" 功能的完整 DAG 任务文档,包括技术架构、开发计划和详细任务分解。

**总文档数**: 26 个 (9个架构文档 + 17个任务文档)
**总任务数**: 17 个 (11个后端任务 + 6个前端任务)
**预计总工时**: 62 小时

---

## 📁 目录结构

```
context/tasks/v2/
├── README.md                          # 本文件 (总索引)
│
├── 技术架构文档 (9个)
├── v2-architecture-overview.md        # 架构总览
├── v2-frontend-architecture.md        # 前端架构
├── v2-backend-architecture.md         # 后端架构
├── v2-agent-system-design.md          # Agent 系统设计
├── v2-websocket-protocol.md           # WebSocket 协议
├── v2-api-design.md                   # API 设计
├── v2-database-schema.md              # 数据库变更
├── v2-development-plan.md             # 开发计划
└── README.md                          # 架构文档导航
│
├── backend/                           # 后端任务 (11个任务)
│   ├── README.md                      # 后端任务索引
│   │
│   ├── Layer 1: 基础工具模块 (3个任务, 可并行)
│   ├── layer1-task1-qwen-vl-service.md       # Qwen VL 视频分析服务
│   ├── layer1-task2-agent-helpers.md          # Agent 辅助工具
│   └── layer1-task3-qwen-wrapper.md           # QwenWithTools Wrapper
│   │
│   ├── Layer 2: Agent 核心 (3个任务)
│   ├── layer2-task1-intent-agent.md           # Intent Analysis Sub-Agent
│   ├── layer2-task2-video-agent.md            # Video Analysis Sub-Agent
│   └── layer2-task3-master-agent.md           # Master Agent
│   │
│   ├── Layer 3: 主入口 (1个任务)
│   └── layer3-task1-prompt-optimizer.md       # Prompt Optimizer 主流程
│   │
│   ├── Layer 4: API/WebSocket (3个任务)
│   ├── layer4-task1-optimize-api.md           # Optimize Prompt API
│   ├── layer4-task2-websocket-handler.md      # WebSocket Handler
│   └── layer4-task3-server-integration.md     # 服务器集成
│   │
│   └── Layer 5: 错误处理与日志 (2个任务)
│       ├── layer5-task1-error-handling.md     # 错误处理和日志
│       └── layer5-task2-database-schema.md    # 数据库 Schema 更新
│
└── frontend/                          # 前端任务 (6个任务)
    ├── README.md                      # 前端任务索引
    │
    ├── Layer 1: 状态管理 (2个任务, 可并行)
    ├── layer1-task1-zustand-store.md          # 扩展 Zustand Store
    └── layer1-task2-websocket-client.md       # 扩展 WebSocket Client
    │
    ├── Layer 2: 基础组件 (2个任务)
    ├── layer2-task1-optimize-button.md        # OptimizeButton 组件
    └── layer2-task2-agent-progress.md         # AgentProgress 组件
    │
    ├── Layer 3: 核心组件 (3个任务)
    ├── layer3-task1-ai-output-area.md         # AIOutputArea 组件
    ├── layer3-task2-intent-modal.md           # IntentReportModal 组件
    └── layer3-task3-optimization-result.md    # OptimizationResult 组件
    │
    └── Layer 4: 集成与样式 (2个任务)
        ├── layer4-task1-workspace-integration.md  # 集成到 Workspace
        └── layer4-task2-styling.md                # 样式优化和动画
```

---

## 🚀 快速开始

### 第一步: 阅读架构文档

**必读顺序**:
1. `v2-architecture-overview.md` - 系统架构和工作流程
2. 根据角色选择:
   - 后端开发: `v2-backend-architecture.md` → `v2-agent-system-design.md`
   - 前端开发: `v2-frontend-architecture.md` → `v2-websocket-protocol.md`

### 第二步: 查看任务清单

- **后端开发者**: `backend/README.md`
- **前端开发者**: `frontend/README.md`

### 第三步: 按层级开始开发

- 完成当前层所有任务后才能进入下一层
- 同一层内的任务可以并行开发
- 每个任务完成后必须通过验收标准

---

## 📋 任务总览

### 后端任务 (11个)

| Layer | 任务数 | 预计工时 | 可并行 |
|-------|--------|----------|--------|
| Layer 1: 基础工具 | 3 | 7h | ✅ 是 |
| Layer 2: Agent 核心 | 3 | 14h | 部分 |
| Layer 3: 主入口 | 1 | 6h | ❌ 否 |
| Layer 4: API/WebSocket | 3 | 6h | 部分 |
| Layer 5: 错误/日志 | 2 | 5h | ✅ 是 |
| **总计** | **11** | **38h** | - |

**详细清单**: 见 `backend/README.md`

---

### 前端任务 (6个)

| Layer | 任务数 | 预计工时 | 可并行 |
|-------|--------|----------|--------|
| Layer 1: 状态管理 | 2 | 5h | ✅ 是 |
| Layer 2: 基础组件 | 2 | 4h | 部分 |
| Layer 3: 核心组件 | 3 | 11h | 部分 |
| Layer 4: 集成/样式 | 2 | 4h | ❌ 否 |
| **总计** | **6** | **24h** | - |

**详细清单**: 见 `frontend/README.md`

---

## 🔄 DAG 依赖关系

### 后端 DAG

```
Layer 1 (可并行)
  L1-T1 (Qwen VL)
  L1-T2 (Helpers)
  L1-T3 (Wrapper)
       ↓
Layer 2
  L2-T1 (Intent Agent) ←─ L1-T2, L1-T3
  L2-T2 (Video Agent)  ←─ L1-T1, L1-T2, L1-T3
       ↓
  L2-T3 (Master Agent) ←─ L2-T1, L2-T2
       ↓
Layer 3
  L3-T1 (Optimizer)    ←─ L2-T3
       ↓
Layer 4
  L4-T1 (API)          ←─ L3-T1
  L4-T2 (WebSocket)    ←─ L3-T1
       ↓
  L4-T3 (Integration)  ←─ L4-T1, L4-T2
       ↓
Layer 5 (可并行)
  L5-T1 (Error/Log)    ←─ L4-T3
  L5-T2 (DB Schema)    ←─ 无依赖
```

### 前端 DAG

```
Layer 1 (可并行)
  F1-T1 (Store)
  F1-T2 (WebSocket)
       ↓
Layer 2
  F2-T1 (Button)       ←─ F1-T1
  F2-T2 (Progress)     ←─ 无依赖
       ↓
Layer 3
  F3-T1 (OutputArea)   ←─ F1-T1, F1-T2, F2-T2
  F3-T2 (Modal)        ←─ F1-T1, F1-T2
  F3-T3 (Result)       ←─ F1-T1
       ↓
Layer 4
  F4-T1 (Integration)  ←─ F3-T1, F3-T2, F3-T3
       ↓
  F4-T2 (Styling)      ←─ F4-T1
```

---

## 📖 已创建的文档清单

### ✅ 架构文档 (9个)

- [x] `README.md` - 架构文档导航
- [x] `v2-architecture-overview.md` - 架构总览 (17KB)
- [x] `v2-frontend-architecture.md` - 前端架构 (24KB)
- [x] `v2-backend-architecture.md` - 后端架构 (25KB)
- [x] `v2-agent-system-design.md` - Agent 系统设计 (24KB)
- [x] `v2-websocket-protocol.md` - WebSocket 协议 (17KB)
- [x] `v2-api-design.md` - API 设计 (13KB)
- [x] `v2-database-schema.md` - 数据库变更 (14KB)
- [x] `v2-development-plan.md` - 开发计划 (18KB)

### ✅ 后端任务文档 (11个已创建)

**Layer 1** (已创建 3个):
- [x] `backend/layer1-task1-qwen-vl-service.md` - Qwen VL 服务
- [x] `backend/layer1-task2-agent-helpers.md` - Agent 辅助工具
- [x] `backend/layer1-task3-qwen-wrapper.md` - QwenWithTools Wrapper
- [x] `backend/README.md` - 后端任务索引

**Layer 2** (已创建 3个):
- [x] `backend/layer2-task1-intent-agent.md` - Intent Analysis Sub-Agent
- [x] `backend/layer2-task2-video-agent.md` - Video Analysis Sub-Agent
- [x] `backend/layer2-task3-master-agent.md` - Master Agent

**Layer 3** (已创建 1个):
- [x] `backend/layer3-task1-prompt-optimizer.md` - Prompt Optimizer 主流程

**Layer 4** (已创建 3个):
- [x] `backend/layer4-task1-optimize-api.md` - Optimize Prompt API
- [x] `backend/layer4-task2-websocket-handler.md` - WebSocket Handler
- [x] `backend/layer4-task3-server-integration.md` - 服务器集成

**Layer 5** (已创建 2个):
- [x] `backend/layer5-task1-error-handling.md` - 错误处理和日志
- [x] `backend/layer5-task2-database-schema.md` - 数据库 Schema 更新

### ✅ 前端任务文档 (6个已创建)

**Layer 1** (已创建 2个):
- [x] `frontend/layer1-task1-zustand-store.md` - Zustand Store 扩展
- [x] `frontend/layer1-task2-websocket-client.md` - WebSocket Client 扩展
- [x] `frontend/README.md` - 前端任务索引

**Layer 2** (已创建 2个):
- [x] `frontend/layer2-task1-optimize-button.md` - OptimizeButton 组件
- [x] `frontend/layer2-task2-agent-progress.md` - AgentProgress 组件

**Layer 3** (已创建 3个):
- [x] `frontend/layer3-task1-ai-output-area.md` - AIOutputArea 组件
- [x] `frontend/layer3-task2-intent-modal.md` - IntentReportModal 组件
- [x] `frontend/layer3-task3-optimization-result.md` - OptimizationResult 组件

**Layer 4** (已创建 2个):
- [x] `frontend/layer4-task1-workspace-integration.md` - 集成到 Workspace
- [x] `frontend/layer4-task2-styling.md` - 样式优化和动画

---

## 🎯 关键设计原则

### 1. 向后兼容 (CRITICAL)

- **Golden Rule**: 老代码不得因新功能而破坏
- 所有 v2.0 代码为新增,不修改 v1.x 现有逻辑
- 数据库新增字段为可选,默认值兼容

**示例**:
- ✅ 新增 `optimization_history` 字段 (默认 `[]`)
- ✅ 新增 API 端点 `/api/optimize-prompt`
- ❌ 不修改 `/api/generate-video` 现有逻辑

### 2. 全面日志记录 (REQUIRED)

**所有外部调用必须记录完整日志**:
- **请求前**: 记录参数、目标、意图
- **响应后**: 记录状态、结果、耗时
- **错误时**: 记录错误类型、堆栈、上下文

**示例** (Qwen VL API 调用):
```javascript
logger.info('Starting Qwen VL analysis', { videoUrl, promptLength });
// ... API 调用 ...
logger.info('Qwen VL response received', { status, duration });
logger.debug('Response data', { content });
// 错误时
logger.error('Qwen VL failed', { error, attempt, stack });
```

**参考**: `CLAUDE.md` - Comprehensive Request/Response Logging

### 3. DAG 任务模型 (MUST FOLLOW)

- **层级执行**: 完成当前层所有任务后才能进入下一层
- **并行优化**: 同层内无依赖任务可并行开发
- **依赖检查**: 开始任务前验证依赖任务已完成
- **测试驱动**: 每个任务必须通过验收标准

---

## 🔧 开发工具

### 环境准备

```bash
# 后端依赖
cd backend
npm install langchain deepagents @langchain/community zod

# 前端依赖 (无新增)
cd frontend
npm install
```

### 测试命令

```bash
# 后端单元测试
cd backend
npm test -- <test-file>.test.js

# 前端组件测试
cd frontend
npm test -- <component>.test.tsx

# 集成测试
npm run test:integration
```

### 开发服务器

```bash
# 启动后端
cd backend
npm run dev  # http://localhost:3000

# 启动前端
cd frontend
npm run dev  # http://localhost:5173
```

---

## 📊 进度跟踪

### 里程碑

| 里程碑 | 目标 | 预计时间 | 状态 |
|--------|------|----------|------|
| **M0: 文档完成** | 所有架构和任务文档编写完成 | Week 0 | ✅ 完成 |
| **M1: 后端核心完成** | Layer 1-3 测试通过 | Week 1-2 | 📋 待开始 |
| **M2: 前端 UI 完成** | Layer 1-3 组件可用 | Week 2 | 📋 待开始 |
| **M3: API 集成完成** | 前后端联调成功 | Week 3 | 📋 待开始 |
| **M4: 生产就绪** | 所有测试通过,可上线 | Week 4 | 📋 待开始 |

### 当前状态

```
✅ Phase 0: 文档准备 (100%)
   - 架构文档: 9/9 完成
   - 任务文档: 17/17 完成
   - 任务索引: 3/3 完成

📋 Phase 1: 环境准备 (0%)
   - 依赖安装
   - API 验证
   - 数据库更新

📋 Phase 2: 后端开发 (0%)
   - Layer 1-5 任务

📋 Phase 3: 前端开发 (0%)
   - Layer 1-4 任务

📋 Phase 4: 集成测试 (0%)
   - E2E 测试
   - Bug 修复

📋 Phase 5: 部署上线 (0%)
   - 生产部署
   - 监控配置
```

---

## 🆘 问题排查

### 常见问题

**Q1: 如何确认任务依赖?**
- **回答**: 每个任务文档的"任务元数据"部分列出了所有依赖
- **工具**: 查看本文档的 DAG 依赖图

**Q2: 如何验证任务完成?**
- **回答**: 每个任务文档末尾有"验收标准"章节
- **要求**: 所有验收标准必须通过才能标记任务完成

**Q3: 任务可以并行开发吗?**
- **回答**: 同一层级内的任务可以并行开发
- **注意**: 必须完成所有依赖任务后才能开始新任务

---

## 📚 相关资源

### 项目文档

- **业务需求**: `../businee-v2.md`
- **技术参考**: `../third-part/job-assistant-qwen.js`
- **v1.x 文档**: `../business-v1-1.md`, `../backend-architecture.md`
- **项目说明**: `../../CLAUDE.md`

### 外部资源

- **Qwen API**: 阿里云百炼平台 DashScope
- **DeepAgents**: Multi-agent 协作框架
- **LangChain**: Agent 编排框架

---

## 👥 团队协作

### 角色分工

**后端开发者**:
- 负责 `backend/` 目录下所有任务
- 重点: Agent 系统、API、WebSocket

**前端开发者**:
- 负责 `frontend/` 目录下所有任务
- 重点: React 组件、状态管理、UI/UX

**全栈开发者**:
- 建议先完成后端 Layer 1-3
- 再完成前端 Layer 1-4
- 最后进行集成测试

### 沟通机制

- **API 接口对齐**: 后端完成 Layer 4 后与前端确认接口
- **WebSocket 协议对齐**: 参考 `v2-websocket-protocol.md` 统一消息格式
- **类型定义同步**: 前后端共享 TypeScript 类型定义

---

## ✅ 下一步行动

1. **阅读架构文档**: 从 `README.md` 开始,按角色阅读相关文档
2. **准备开发环境**: 安装依赖,验证 API 可用性
3. **开始 Layer 1 任务**: 后端/前端 Layer 1 任务可并行开发
4. **持续更新进度**: 完成任务后更新本文档的进度跟踪部分

---

**开发愉快! 🚀**

如有问题,请参考相关架构文档或任务文档中的"参考文档"章节。
