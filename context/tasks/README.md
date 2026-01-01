# DAG任务节点索引

## 概述
所有开发任务已拆分为 **35个DAG节点**,分为前端16个、后端19个。每个节点文件包含:
- 层级(第几层)
- 依赖关系(依赖哪些节点)
- 并行任务(可同时进行的节点)
- 具体执行步骤
- 验收标准

## 后端任务节点 (19个)

### 第1层 - 环境准备 (可并行)
- `backend-dev-plan-1.1-install-dependencies.md` - 安装Node.js, MongoDB, 开发工具
- `backend-dev-plan-1.2-verify-third-party-apis.md` - 验证Qwen和Google Gemini API

### 第2层 - 基础设施 (可并行,依赖1.1)
- `backend-dev-plan-2.1-project-init.md` - 项目初始化,安装npm依赖
- `backend-dev-plan-2.2-config-management.md` - 配置管理(.env, config.js)
- `backend-dev-plan-2.3-logger-setup.md` - 日志系统(Winston)
- `backend-dev-plan-2.4-database-setup.md` - MongoDB连接和Schema

### 第3层 - 核心服务 (可并行,依赖第2层)
- `backend-dev-plan-3.1-express-server.md` - Express HTTP服务器
- `backend-dev-plan-3.2-websocket-server.md` - WebSocket服务器
- `backend-dev-plan-3.3-video-service-qwen.md` - Qwen视频生成服务
- `backend-dev-plan-3.4-llm-service-gemini.md` - Google Gemini LLM服务

### 第4层 - API层 (可并行,依赖2.4, 3.1, 3.3, 3.4)
- `backend-dev-plan-4.1-api-upload-image.md` - 图片上传API
- `backend-dev-plan-4.2-api-get-workspaces.md` - 获取工作空间API
- `backend-dev-plan-4.3-api-generate-video.md` - 视频生成API
- `backend-dev-plan-4.4-api-ai-suggest.md` - AI建议API

### 第5层 - WebSocket协议 (可并行,依赖2.4, 3.2)
- `backend-dev-plan-5.1-ws-workspace-create.md` - 创建工作空间协议
- `backend-dev-plan-5.2-ws-workspace-update.md` - 更新工作空间协议
- `backend-dev-plan-5.3-ws-workspace-delete.md` - 删除工作空间协议
- `backend-dev-plan-5.4-ws-workspace-reorder.md` - 排序工作空间协议

### 第6层 - 集成测试 (依赖所有上游)
- `backend-dev-plan-6.1-integration-testing.md` - 后端集成测试

---

## 前端任务节点 (16个)

### 第1层 - 项目脚手架 (无依赖)
- `frontend-dev-plan-1.1-project-scaffold.md` - Vite + React + TypeScript脚手架

### 第2层 - 基础设施 (可并行,依赖1.1)
- `frontend-dev-plan-2.1-project-config.md` - Vite配置, Tailwind配置
- `frontend-dev-plan-2.2-type-definitions.md` - TypeScript类型定义
- `frontend-dev-plan-2.3-api-client.md` - Axios API客户端封装
- `frontend-dev-plan-2.4-websocket-client.md` - WebSocket客户端封装

### 第3层 - 状态管理 (依赖第2层)
- `frontend-dev-plan-3.1-state-management.md` - Zustand状态管理 + WebSocket集成

### 第4层 - UI组件 (可并行,依赖3.1)
- `frontend-dev-plan-4.1-timeline-component.md` - Timeline横向滚动容器
- `frontend-dev-plan-4.2-workspace-component.md` - Workspace工作空间容器
- `frontend-dev-plan-4.3-image-upload-component.md` - 图片上传组件
- `frontend-dev-plan-4.4-video-form-component.md` - 视频生成表单组件
- `frontend-dev-plan-4.5-video-player-component.md` - 视频播放器组件
- `frontend-dev-plan-4.6-ai-collaboration-component.md` - AI协作组件
- `frontend-dev-plan-4.7-common-components.md` - 通用组件(Loading, Error, Empty)

### 第5层 - 集成优化 (依赖第4层)
- `frontend-dev-plan-5.1-app-integration.md` - App集成,路由配置
- `frontend-dev-plan-5.2-performance-optimization.md` - 性能优化(懒加载, 虚拟滚动)

### 第6层 - 联调测试 (依赖所有前端 + 所有后端)
- `frontend-dev-plan-6.1-frontend-backend-integration.md` - 前后端联调测试

---

## 执行策略

### 并行开发
**前端和后端完全并行**,互不阻塞:
- 后端团队: 从 `backend-dev-plan-1.1` 和 `1.2` 开始
- 前端团队: 从 `frontend-dev-plan-1.1` 开始

### 层级推进
每层内的任务可以**并行执行**,完成一层后进入下一层:

**后端进度:**
```
第1层(2个任务) → 第2层(4个任务) → 第3层(4个任务)
→ 第4层(4个任务) → 第5层(4个任务) → 第6层(1个任务)
```

**前端进度:**
```
第1层(1个任务) → 第2层(4个任务) → 第3层(1个任务)
→ 第4层(7个任务) → 第5层(2个任务) → 第6层(1个任务)
```

### 最终联调
前后端第6层都完成后,执行:
- `frontend-dev-plan-6.1-frontend-backend-integration.md` - 完整流程联调

---

## 文件位置

```
context/tasks/
├── backend/
│   ├── backend-dev-plan-1.1-install-dependencies.md
│   ├── backend-dev-plan-1.2-verify-third-party-apis.md
│   ├── backend-dev-plan-2.1-project-init.md
│   ├── ... (共19个文件)
│   └── backend-dev-plan-6.1-integration-testing.md
│
└── frontend/
    ├── frontend-dev-plan-1.1-project-scaffold.md
    ├── frontend-dev-plan-2.1-project-config.md
    ├── ... (共16个文件)
    └── frontend-dev-plan-6.1-frontend-backend-integration.md
```

---

## 验收标准

每个节点完成后必须:
1. ✅ 通过该节点的验收标准
2. ✅ 代码可运行无错误
3. ✅ 相关测试通过
4. ✅ 文档更新(如有需要)

---

## 使用说明

### 对于开发者
1. 查看当前层级的任务文件
2. 检查依赖是否完成
3. 执行任务中的步骤
4. 验证是否满足验收标准
5. 标记完成,进入下一个任务

### 对于AI Agent
1. 读取任务文件获取详细指令
2. 按照执行步骤编写代码
3. 运行验收标准中的测试
4. 确认通过后进入下一个任务
5. 同一层级的任务可以并行处理

---

## 参考文档

- [后端开发计划](../backend-dev-plan.md) - 后端DAG总览
- [前端开发计划](../frontend-dev-plan.md) - 前端DAG总览
- [业务需求](../business.md) - 产品需求
- [后端架构](../backend-architecture.md) - 后端架构设计
- [数据库设计](../backend-database-design.md) - MongoDB Schema
- [API设计](../backend-api-design.md) - REST API和WebSocket

---

**现在可以开始按照DAG顺序执行开发任务了!**
