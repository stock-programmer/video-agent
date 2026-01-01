# 后端开发计划 - 依赖关系图

## 任务依赖拓扑

```
[0] 环境准备
    ├─ 0.1 安装依赖 (Node.js, MongoDB)
    └─ 0.2 验证第三方API (Runway, OpenAI)
         ↓
[1] 基础设施 (可并行)
    ├─ 1.1 项目初始化 + 依赖安装
    ├─ 1.2 配置管理 (config.js, .env)
    ├─ 1.3 日志系统 (logger.js)
    └─ 1.4 数据库连接 (mongodb.js + Workspace Model)
         ↓
[2] 核心服务 (可并行)
    ├─ 2.1 Express服务器 (server.js)
    ├─ 2.2 WebSocket服务器 (websocket/server.js)
    └─ 2.3 第三方服务适配器
         ├─ services/video-runway.js
         └─ services/llm-openai.js
         ↓
[3] API层 (依赖1.4, 2.3, 可部分并行)
    ├─ 3.1 api/upload-image.js (依赖: 1.1)
    ├─ 3.2 api/get-workspaces.js (依赖: 1.4)
    ├─ 3.3 api/generate-video.js (依赖: 1.4, 2.3)
    └─ 3.4 api/ai-suggest.js (依赖: 1.4, 2.3)
         ↓
[4] WebSocket协议层 (依赖1.4, 2.2, 可并行)
    ├─ 4.1 websocket/workspace-create.js
    ├─ 4.2 websocket/workspace-update.js
    ├─ 4.3 websocket/workspace-delete.js
    └─ 4.4 websocket/workspace-reorder.js
         ↓
[5] 集成与测试 (依赖所有上游)
    ├─ 5.1 集成WebSocket到video-runway.js (状态推送)
    ├─ 5.2 单元测试 (所有模块)
    └─ 5.3 集成测试 (完整流程)
```

---

## 任务详细说明

### [0] 环境准备

**0.1 安装依赖**
- 安装 Node.js v18+
- 安装 MongoDB v6.0+
- 安装开发工具 (Postman, MongoDB Compass)

**0.2 验证第三方API**
- 获取 Runway API Key 并测试图生视频接口
- 获取 OpenAI API Key 并测试 Chat API
- 记录调用示例和响应格式

**交付**: API测试脚本 + 调用示例文档

---

### [1] 基础设施 (可并行执行)

**1.1 项目初始化**
```bash
mkdir -p backend/{src/{api,websocket,services,db,utils},uploads,logs}
npm init -y
npm install express mongoose ws multer winston axios dotenv cors
npm install -D nodemon jest supertest eslint
```

**1.2 配置管理**
- 创建 `src/config.js` (加载和验证环境变量)
- 创建 `.env.example` (模板)
- 创建 `.env` (本地配置)

**1.3 日志系统**
- 创建 `src/utils/logger.js` (Winston配置)
- 输出到 console + logs/error.log + logs/combined.log

**1.4 数据库连接**
- 创建 `src/db/mongodb.js`
- 定义 Workspace Schema (参考 `backend-database-design.md`)
- 创建索引 (order_index, video.status)

**交付**: 可启动的基础框架 + 数据库连接成功

---

### [2] 核心服务 (可并行执行)

**2.1 Express服务器**
- 创建 `src/server.js`
- 配置中间件 (cors, body-parser, express.static)
- 添加健康检查 `GET /health`
- 启动HTTP服务器 (PORT=3000)

**2.2 WebSocket服务器**
- 创建 `src/websocket/server.js`
- 启动WebSocket服务器 (PORT=3001)
- 实现消息路由分发
- 实现心跳检测 (ping/pong)

**2.3 第三方服务适配器**

*services/video-runway.js*
- `generate(workspaceId, formData)`: 调用Runway API
- 轮询逻辑 (每5秒, 超时10分钟)
- 状态更新: generating → completed/failed
- 返回: { task_id, status, url?, error? }

*services/llm-openai.js*
- `suggest(workspaceData, userInput)`: 调用OpenAI Chat API
- 构建prompt (包含图片、表单、视频、用户输入)
- 解析返回的结构化建议
- 返回: { camera_movement?, shot_type?, lighting?, motion_prompt? }

**交付**: 服务器可启动 + 第三方API可调用

---

### [3] API层 (依赖1.4, 2.3)

**3.1 api/upload-image.js**
```javascript
// POST /api/upload/image
// Multer处理文件上传 → 保存到uploads/ → 返回{image_path, image_url}
```

**3.2 api/get-workspaces.js**
```javascript
// GET /api/workspaces
// 查询所有workspace, 按order_index排序, 返回数组
```

**3.3 api/generate-video.js**
```javascript
// POST /api/generate/video
// 接收{workspace_id, form_data} → 调用video-runway.js → 返回{task_id}
```

**3.4 api/ai-suggest.js**
```javascript
// POST /api/ai/suggest
// 接收{workspace_id, user_input} → 调用llm-openai.js → 保存协作历史 → 返回建议
```

**交付**: 所有API端点可用 (Postman测试通过)

---

### [4] WebSocket协议层 (依赖1.4, 2.2)

**4.1 websocket/workspace-create.js**
```javascript
// 消息: {type: 'workspace.create', data: {...}}
// 计算order_index → 插入MongoDB → 返回{type: 'workspace.created', data: {...}}
```

**4.2 websocket/workspace-update.js**
```javascript
// 消息: {type: 'workspace.update', workspace_id, updates: {...}}
// MongoDB.updateOne({$set: updates}) → 返回{type: 'workspace.sync_confirm'}
```

**4.3 websocket/workspace-delete.js**
```javascript
// 消息: {type: 'workspace.delete', workspace_id}
// MongoDB.deleteOne() → 返回{type: 'workspace.deleted'}
```

**4.4 websocket/workspace-reorder.js**
```javascript
// 消息: {type: 'workspace.reorder', new_order: [{id, order_index}, ...]}
// 批量更新order_index → 返回{type: 'workspace.reorder_confirm'}
```

**交付**: WebSocket协议测试通过

---

### [5] 集成与测试 (依赖所有上游)

**5.1 集成WebSocket到video-runway.js**
- 在 `generate()` 中推送状态更新
  - 开始: `{type: 'video.status_update', status: 'generating'}`
  - 完成: `{type: 'video.status_update', status: 'completed', url}`
  - 失败: `{type: 'video.status_update', status: 'failed', error}`

**5.2 单元测试**
- API测试 (Supertest + mongodb-memory-server)
- WebSocket协议测试
- 服务模块测试 (Mock Runway/OpenAI)

**5.3 集成测试**
- 完整流程: 创建workspace → 上传图片 → 生成视频 → AI建议
- 边界测试: 大文件、并发、网络异常

**交付**: 测试覆盖率 > 70%, 所有核心功能测试通过

---

## 并行执行策略

### 第一批 (可同时开始)
- 0.1 安装依赖
- 0.2 验证第三方API

### 第二批 (依赖第一批完成)
- 1.1 项目初始化
- 1.2 配置管理
- 1.3 日志系统
- 1.4 数据库连接

### 第三批 (依赖第二批完成)
- 2.1 Express服务器
- 2.2 WebSocket服务器
- 2.3 第三方服务适配器 (可与2.1/2.2并行)

### 第四批 (依赖1.4 + 2.3)
- 3.1 api/upload-image.js
- 3.2 api/get-workspaces.js
- 3.3 api/generate-video.js
- 3.4 api/ai-suggest.js

### 第五批 (依赖1.4 + 2.2)
- 4.1 ~ 4.4 所有WebSocket协议 (可并行)

### 第六批 (依赖所有上游)
- 5.1 集成WebSocket推送
- 5.2 单元测试
- 5.3 集成测试

---

## 关键里程碑

- ✅ **M1**: 基础设施就绪 (服务器可启动, 数据库连接成功)
- ✅ **M2**: 核心API可用 (图片上传, 视频生成, AI建议)
- ✅ **M3**: WebSocket协议完成 (实时同步可用)
- ✅ **M4**: 集成完成 (状态推送 + 测试通过)

---

## 验收标准

每个任务完成后用以下方式验证:

- **API**: Postman测试请求响应正确
- **WebSocket**: 客户端脚本测试消息收发
- **服务**: Mock第三方API测试业务逻辑
- **集成**: 端到端测试完整流程

---

## 参考文档

- [后端架构总览](./backend-architecture.md)
- [API设计](./backend-api-design.md)
- [数据库设计](./backend-database-design.md)
- [模块设计](./backend-architecture-modules.md)
- [配置管理](./backend-config.md)
- [测试策略](./backend-testing.md)
