# v2.0 技术架构文档导航

## 文档概述

本目录包含 v2.0 "一键优化提示词" 功能的完整技术架构文档。

**版本**: v2.0
**创建日期**: 2025-01-15
**状态**: 设计完成,待开发

---

## 文档阅读顺序

建议按以下顺序阅读文档,以全面理解 v2.0 架构:

### 1. 开始阅读 (必读)

**[v2-architecture-overview.md](./v2-architecture-overview.md)**
- 功能概述
- 系统架构图
- 核心工作流程
- 数据流设计
- 技术挑战与解决方案

**阅读时间**: 20-30 分钟

---

### 2. 前端架构 (前端开发必读)

**[v2-frontend-architecture.md](./v2-frontend-architecture.md)**
- 组件设计 (5个新增组件)
- 状态管理 (Zustand 扩展)
- WebSocket 集成
- UI/UX 设计
- 测试策略

**阅读时间**: 30-40 分钟

**关键组件**:
- `OptimizeButton` - 触发优化按钮
- `AIOutputArea` - AI 输出区容器
- `IntentReportModal` - 意图确认弹窗
- `OptimizationResult` - 优化结果展示
- `AgentProgress` - 进度消息展示

---

### 3. 后端架构 (后端开发必读)

**[v2-backend-architecture.md](./v2-backend-architecture.md)**
- 技术栈 (langchain, deepagents)
- 模块设计 (单文件高内聚)
- Agent 系统集成
- API 实现
- WebSocket 通信
- 错误处理

**阅读时间**: 30-40 分钟

**核心模块**:
- `api/optimize-prompt.js` - 触发优化 API
- `services/prompt-optimizer.js` - Agent 系统主入口
- `services/qwen-vl.js` - Qwen VL 视频分析
- `websocket/prompt-optimization.js` - WebSocket handler

---

### 4. Agent 系统设计 (核心技术必读)

**[v2-agent-system-design.md](./v2-agent-system-design.md)**
- Master Agent 设计
- Intent Analysis Sub-Agent
- Video Analysis Sub-Agent
- Human-in-the-Loop 实现
- Agent 通信协议
- Prompt 工程

**阅读时间**: 40-50 分钟

**核心内容**:
- Agent 职责定义
- System Prompt 设计
- 输入输出格式
- 多 Agent 协作流程

---

### 5. 通信协议 (前后端联调必读)

**[v2-websocket-protocol.md](./v2-websocket-protocol.md)**
- 消息类型定义 (9种消息)
- 消息格式规范
- 时序图
- 错误处理
- 测试方法

**阅读时间**: 20-30 分钟

**关键消息**:
- `agent_start` / `agent_progress` / `agent_complete`
- `intent_report` / `human_confirm`
- `video_analysis` / `optimization_result`

---

### 6. API 设计 (后端/前端接口必读)

**[v2-api-design.md](./v2-api-design.md)**
- REST API 端点定义
- 请求/响应格式
- 验证规则
- 错误码
- 测试用例

**阅读时间**: 15-20 分钟

**新增 API**:
- `POST /api/optimize-prompt`

---

### 7. 数据库变更 (后端必读)

**[v2-database-schema.md](./v2-database-schema.md)**
- Workspace Schema 扩展
- `optimization_history` 字段定义
- 索引设计
- 数据迁移策略
- 数据操作示例

**阅读时间**: 15-20 分钟

---

### 8. 开发计划 (所有人必读)

**[v2-development-plan.md](./v2-development-plan.md)**
- 任务分解 (5个 Phase)
- 时间估算 (3-4 周)
- 依赖关系图
- 里程碑
- 风险应对

**阅读时间**: 30-40 分钟

---

## 文档结构

```
context/tasks/v2/
├── README.md                          # 本文件 (导航)
├── v2-architecture-overview.md        # 架构总览
├── v2-frontend-architecture.md        # 前端架构
├── v2-backend-architecture.md         # 后端架构
├── v2-agent-system-design.md          # Agent 系统设计
├── v2-websocket-protocol.md           # WebSocket 协议
├── v2-api-design.md                   # API 设计
├── v2-database-schema.md              # 数据库变更
└── v2-development-plan.md             # 开发计划
```

---

## 快速参考

### 关键技术决策

| 问题 | 决策 | 文档位置 |
|------|------|---------|
| 使用哪个 LLM? | Qwen-Plus (通义千问) | backend-architecture.md |
| 视频分析如何实现? | Qwen VL API | agent-system-design.md |
| Multi-Agent 框架? | DeepAgents + LangChain | backend-architecture.md |
| 如何实现 Human-in-the-Loop? | WebSocket + Promise 异步等待 | backend-architecture.md, agent-system-design.md |
| 前端状态管理? | Zustand (扩展现有 store) | frontend-architecture.md |
| 数据库变更策略? | 新增可选字段,向后兼容 | database-schema.md |

---

### 核心流程速查

**优化流程 (端到端)**:
```
用户点击按钮
  → POST /api/optimize-prompt
  → Agent System 启动
  → Intent Analysis (Sub-Agent 1)
  → 发送 intent_report (WebSocket)
  → Human 确认 (前端弹窗)
  → 发送 human_confirm (WebSocket)
  → Video Analysis (Sub-Agent 2)
  → Master Agent 决策
  → 发送 optimization_result (WebSocket)
  → 前端自动更新表单
```

**详细文档**: `v2-architecture-overview.md` - 核心工作流程

---

### 代码示例位置

| 示例 | 文档位置 |
|------|---------|
| OptimizeButton 实现 | frontend-architecture.md |
| AIOutputArea 实现 | frontend-architecture.md |
| IntentReportModal 实现 | frontend-architecture.md |
| API Handler 实现 | api-design.md, backend-architecture.md |
| Agent System 实现 | backend-architecture.md, agent-system-design.md |
| WebSocket Handler 实现 | backend-architecture.md, websocket-protocol.md |
| Zustand Store 扩展 | frontend-architecture.md |
| MongoDB Schema 更新 | database-schema.md |

---

## 相关参考文档

### 项目根目录

- **`context/businee-v2.md`** - v2.0 业务需求文档 (原始需求)
- **`context/third-part/job-assistant-qwen.js`** - Multi-Agent 参考实现
- **`CLAUDE.md`** - 项目整体架构说明 (v1.x + v2.0)

### v1.x 文档 (基础)

- **`context/business-v1-1.md`** - v1.1 功能规划 (参考向后兼容)
- **`context/backend-architecture.md`** - 后端架构基础
- **`frontend/src/stores/workspaceStore.ts`** - 现有状态管理

---

## 开发前准备清单

**开始开发前,请确保**:
- ✅ 已阅读 `v2-architecture-overview.md`
- ✅ 已阅读角色相关文档 (前端/后端/Agent)
- ✅ 已阅读 `v2-development-plan.md`
- ✅ 已安装 Node.js 依赖 (langchain, deepagents, etc.)
- ✅ 已验证 Qwen API 可用 (`DASHSCOPE_API_KEY`)
- ✅ 已理解 Human-in-the-Loop 设计
- ✅ 已理解 WebSocket 通信协议

---

## 问题排查指南

### 常见问题

**Q1: DeepAgents 如何使用?**
- **参考**: `context/third-part/job-assistant-qwen.js` (完整示例)
- **文档**: `v2-agent-system-design.md` - Agent 通信协议

**Q2: Human-in-the-Loop 如何暂停 Agent?**
- **方案**: 分阶段执行 Agent,使用 Promise + WebSocket 实现异步等待
- **文档**: `v2-backend-architecture.md` - Human-in-the-Loop 实现

**Q3: WebSocket 消息如何同步?**
- **方案**: 每条消息带 `workspace_id`,前端过滤非当前工作空间消息
- **文档**: `v2-websocket-protocol.md` - 消息格式

**Q4: 如何测试 Agent 系统?**
- **方案**: Mock Qwen API 响应,验证输出解析逻辑
- **文档**: `v2-agent-system-design.md` - 测试策略

**Q5: 数据库迁移是否必要?**
- **回答**: 不必要,新增字段为可选 (默认空数组),向后兼容
- **文档**: `v2-database-schema.md` - 向后兼容性

---

## 联系与反馈

**技术问题**: 查阅相关文档,参考代码示例

**架构建议**: 参考 `v2-architecture-overview.md` 中的技术挑战与解决方案

**开发进度**: 参考 `v2-development-plan.md` 中的里程碑和任务清单

---

## 文档更新日志

| 日期 | 更新内容 | 版本 |
|------|---------|------|
| 2025-01-15 | 初始版本,所有架构文档创建完成 | v2.0-draft |

---

**祝开发顺利! 🚀**
