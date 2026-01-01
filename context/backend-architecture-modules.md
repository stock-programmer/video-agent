# 程序架构和模块设计

## 文档信息
- **版本号**：v1.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段设计

---

## 设计原则

### 高度内聚的单文件模块

**核心思想：** 一个文件完成一个完整的独立功能

- ✅ **单文件完成 API**：路由 + 业务逻辑 + 数据库操作都在一个文件
- ✅ **单文件完成 WebSocket 协议**：连接处理 + 消息处理 + 数据库操作
- ✅ **高度内聚**：相关代码集中在一起，便于 AI 理解和修改
- ✅ **独立功能**：每个文件职责单一，互不依赖

**为什么不用分层？**
- ❌ 分层架构（路由层/业务层/数据层）需要人类理解上下文
- ❌ AI 需要跨多个文件才能理解完整逻辑
- ✅ 单文件模块 AI 可以一次性理解和修改

---

## 目录结构

```
backend/
├── src/
│   ├── server.js                   # 启动入口（HTTP + WebSocket）
│   ├── config.js                   # 配置管理
│   │
│   ├── db/
│   │   └── mongodb.js              # MongoDB 连接 + Workspace Model
│   │
│   ├── api/
│   │   ├── upload-image.js         # 图片上传 API（完整功能）
│   │   ├── get-workspaces.js       # 获取所有工作空间（完整功能）
│   │   ├── generate-video.js       # 触发视频生成（完整功能）
│   │   └── ai-suggest.js           # AI 协作建议（完整功能）
│   │
│   ├── websocket/
│   │   ├── server.js               # WebSocket 服务器 + 消息分发
│   │   ├── workspace-create.js     # 创建工作空间协议（完整）
│   │   ├── workspace-update.js     # 更新工作空间协议（完整）
│   │   ├── workspace-delete.js     # 删除工作空间协议（完整）
│   │   └── workspace-reorder.js    # 调整顺序协议（完整）
│   │
│   ├── services/
│   │   ├── video-runway.js         # Runway 视频生成（API调用 + 轮询 + 状态更新）
│   │   ├── video-pika.js           # Pika 视频生成（API调用 + 轮询 + 状态更新）
│   │   ├── video-kling.js          # Kling 视频生成（API调用 + 轮询 + 状态更新）
│   │   ├── llm-openai.js           # OpenAI LLM 服务（完整）
│   │   ├── llm-claude.js           # Claude LLM 服务（完整）
│   │   └── llm-qwen.js             # 通义千问 LLM 服务（完整）
│   │
│   └── utils/
│       └── logger.js               # Winston 日志工具
│
├── uploads/                        # 用户上传的图片
├── logs/                           # 应用日志
│
├── .env
├── package.json
└── README.md
```

---

## 核心模块说明

### 启动入口层

#### server.js
**职责：** 应用启动入口
- 连接数据库
- 创建 Express 应用
- 注册所有 API 路由
- 启动 HTTP 服务器
- 启动 WebSocket 服务器
- 优雅关闭处理

#### config.js
**职责：** 配置管理
- 加载环境变量
- 导出配置对象
- 提供配置验证

---

### 数据库层

#### db/mongodb.js
**职责：** 数据库相关所有功能
- MongoDB 连接初始化
- Workspace Model Schema 定义
- 连接错误处理

**设计说明：** 连接和 Model 放在一起，因为它们高度相关

---

### API 层（单文件完成完整功能）

#### api/upload-image.js
**完整职责：**
- 配置 Multer 文件上传
- 验证文件类型和大小
- 保存文件到 uploads 目录
- 生成访问 URL
- 返回响应
- 错误处理和日志记录

---

#### api/get-workspaces.js
**完整职责：**
- 从 MongoDB 查询所有工作空间
- 按 order_index 排序
- 返回 JSON 响应
- 错误处理和日志记录

---

#### api/generate-video.js
**完整职责：**
- 参数验证（workspace_id, image_url, params）
- 检查工作空间是否存在
- 根据配置动态加载视频服务（Runway/Pika/Kling）
- 调用视频服务的 generate 方法
- 返回 task_id
- 错误处理和日志记录

---

#### api/ai-suggest.js
**完整职责：**
- 参数验证（workspace_id, user_input, context）
- 根据配置动态加载 LLM 服务（OpenAI/Claude/Qwen）
- 调用 LLM 服务生成建议
- 保存 AI 协作历史到 MongoDB
- 返回建议结果
- 错误处理和日志记录

---

### WebSocket 层（单文件完成协议）

#### websocket/server.js
**完整职责：**
- 创建 WebSocket 服务器
- 管理活跃连接 Map
- 心跳检测（30秒 ping/pong）
- 消息解析和分发
- 连接断开处理
- 提供 broadcast 方法（广播消息给所有客户端）

---

#### websocket/workspace-create.js
**完整职责：**
- 接收创建工作空间消息
- 创建 Workspace 文档到 MongoDB
- 返回 workspace.created 确认消息
- 错误处理

---

#### websocket/workspace-update.js
**完整职责：**
- 接收增量更新消息（workspace_id + updates 字段）
- 解析点号路径字段（如 "form_data.camera_movement"）
- 使用 MongoDB $set 操作更新
- 返回 workspace.sync_confirm 确认消息
- 错误处理

---

#### websocket/workspace-delete.js
**完整职责：**
- 接收删除消息（workspace_id）
- 从 MongoDB 删除工作空间
- 返回 workspace.deleted 确认消息
- 错误处理

---

#### websocket/workspace-reorder.js
**完整职责：**
- 接收批量排序消息（reorder_map 对象）
- 构建 MongoDB bulkWrite 操作
- 批量更新 order_index
- 返回 workspace.reorder_confirm 确认消息
- 错误处理

---

### 服务层（单文件完成服务商实现）

#### services/video-runway.js
**完整职责：**
- 配置 Runway API 客户端（axios）
- 实现 generate(workspace_id, image_url, params) 方法
  - 调用 Runway API 提交生成请求
  - 获取 task_id
  - 更新 MongoDB: video.status = 'generating'
  - WebSocket 广播状态更新
  - 启动轮询任务
- 实现轮询机制
  - 每5秒查询一次 Runway API 状态
  - 超时时间10分钟
  - 使用 Map 管理轮询任务
- 处理完成状态
  - 更新 MongoDB: video.status = 'completed', video.url
  - WebSocket 广播完成事件
  - 停止轮询
- 处理失败状态
  - 更新 MongoDB: video.status = 'failed', video.error
  - WebSocket 广播失败事件
  - 停止轮询
- 错误处理和日志记录

---

#### services/video-pika.js
**完整职责：** 同 video-runway.js，但调用 Pika API

---

#### services/video-kling.js
**完整职责：** 同 video-runway.js，但调用 Kling API

---

#### services/llm-openai.js
**完整职责：**
- 配置 OpenAI API 客户端
- 实现 suggest({ user_input, context }) 方法
  - 构建 prompt（包含用户输入和当前参数）
  - 调用 OpenAI Chat API
  - 解析 JSON 格式的建议
  - 返回建议对象
- 错误处理和日志记录

---

#### services/llm-claude.js
**完整职责：** 同 llm-openai.js，但调用 Claude API

---

#### services/llm-qwen.js
**完整职责：** 同 llm-openai.js，但调用通义千问 API

---

### 工具层

#### utils/logger.js
**职责：**
- Winston 日志配置
- 定义日志级别（debug/info/error）
- 配置文件输出（logs/error.log, logs/combined.log）
- 配置控制台输出（开发环境彩色格式）

---

## 逻辑调用拓扑图

### 视频生成完整流程

```
用户点击「生成视频」
  ↓
前端调用 POST /api/generate/video
  ↓
server.js 路由分发
  ↓
api/generate-video.js
  ├─ 参数验证
  ├─ 检查工作空间是否存在（查询 MongoDB）
  └─ 根据 config.VIDEO_PROVIDER 动态加载服务
       ↓
     require(`./services/video-${config.VIDEO_PROVIDER}`)
       ↓
     services/video-runway.js
       ↓
     video-runway.js::generate()
       ├─ 调用 Runway API → 获取 task_id
       ├─ 更新 MongoDB: video.status = 'generating'
       ├─ WebSocket 广播状态更新（通过 websocket/server.js::broadcast）
       └─ 启动轮询任务 startPolling()
            ↓
          setInterval (每5秒执行)
            ├─ 调用 Runway API 查询状态
            ├─ 如果状态 = completed
            │    ├─ handleCompleted()
            │    ├─ 更新 MongoDB: status = 'completed', url = '...'
            │    ├─ WebSocket 广播完成事件
            │    └─ 停止轮询 stopPolling()
            └─ 如果状态 = failed
                 ├─ handleFailed()
                 ├─ 更新 MongoDB: status = 'failed', error = '...'
                 ├─ WebSocket 广播失败事件
                 └─ 停止轮询 stopPolling()
```

---

### WebSocket 状态同步流程

```
用户在前端输入（修改运镜方式）
  ↓
前端 State 更新
  ↓
debounce 300ms（前端防抖）
  ↓
WebSocket.send({
  type: 'workspace.update',
  data: {
    workspace_id: 'xxx',
    updates: {
      'form_data.camera_movement': '推进'
    }
  }
})
  ↓
websocket/server.js 接收消息
  ↓
解析 JSON
  ↓
根据 type 分发到对应处理器
  ↓
websocket/workspace-update.js::handleWorkspaceUpdate()
  ├─ 解析 workspace_id 和 updates
  ├─ 构建 $set 操作对象
  ├─ MongoDB updateOne({ _id }, { $set: updates })
  └─ WebSocket 返回确认
       ↓
     ws.send({
       type: 'workspace.sync_confirm',
       data: { workspace_id, updated_at }
     })
       ↓
     前端收到确认
       ↓
     显示"已保存"提示
```

---

### AI 建议生成流程

```
用户输入 AI 协作请求
  ↓
前端调用 POST /api/ai/suggest
  ↓
api/ai-suggest.js
  ├─ 参数验证
  └─ 根据 config.LLM_PROVIDER 动态加载服务
       ↓
     require(`./services/llm-${config.LLM_PROVIDER}`)
       ↓
     services/llm-openai.js
       ↓
     llm-openai.js::suggest()
       ├─ 构建 prompt
       ├─ 调用 OpenAI Chat API
       ├─ 解析返回的 JSON 建议
       └─ 返回建议对象
            ↓
          api/ai-suggest.js 继续
            ├─ 保存 AI 协作历史到 MongoDB
            │   MongoDB updateOne({ $push: { ai_collaboration: {...} } })
            └─ 返回建议给前端
```

---

## 模块职责清单

| 模块类型 | 文件 | 完整职责 |
|---------|------|---------|
| **启动** | server.js | HTTP + WebSocket 启动、路由注册 |
| **启动** | config.js | 配置管理 |
| **数据库** | db/mongodb.js | MongoDB 连接 + Workspace Model |
| **API** | api/upload-image.js | 图片上传（Multer + 保存 + 响应） |
| **API** | api/get-workspaces.js | 查询所有工作空间（完整） |
| **API** | api/generate-video.js | 触发视频生成（完整） |
| **API** | api/ai-suggest.js | AI 建议生成 + 保存历史（完整） |
| **WebSocket** | websocket/server.js | WS 服务器 + 连接管理 + 消息分发 |
| **WebSocket** | websocket/workspace-create.js | 创建工作空间协议（完整） |
| **WebSocket** | websocket/workspace-update.js | 增量更新协议（完整） |
| **WebSocket** | websocket/workspace-delete.js | 删除工作空间协议（完整） |
| **WebSocket** | websocket/workspace-reorder.js | 批量排序协议（完整） |
| **服务** | services/video-runway.js | Runway 实现（API + 轮询 + 状态更新） |
| **服务** | services/video-pika.js | Pika 实现（API + 轮询 + 状态更新） |
| **服务** | services/video-kling.js | Kling 实现（API + 轮询 + 状态更新） |
| **服务** | services/llm-openai.js | OpenAI LLM 实现（完整） |
| **服务** | services/llm-claude.js | Claude LLM 实现（完整） |
| **服务** | services/llm-qwen.js | 通义千问 LLM 实现（完整） |
| **工具** | utils/logger.js | Winston 日志配置 |

---

## 第三方服务切换机制

### 视频生成服务切换

**配置方式：** 修改 `.env` 文件中的 `VIDEO_PROVIDER`

```
VIDEO_PROVIDER=runway   # 使用 services/video-runway.js
VIDEO_PROVIDER=pika     # 使用 services/video-pika.js
VIDEO_PROVIDER=kling    # 使用 services/video-kling.js
```

**实现机制：**
- `api/generate-video.js` 根据配置动态 require 服务文件
- 每个视频服务文件必须导出 `generate()` 方法
- 方法签名统一：`generate(workspace_id, image_url, params)`

---

### LLM 服务切换

**配置方式：** 修改 `.env` 文件中的 `LLM_PROVIDER`

```
LLM_PROVIDER=openai   # 使用 services/llm-openai.js
LLM_PROVIDER=claude   # 使用 services/llm-claude.js
LLM_PROVIDER=qwen     # 使用 services/llm-qwen.js
```

**实现机制：**
- `api/ai-suggest.js` 根据配置动态 require 服务文件
- 每个 LLM 服务文件必须导出 `suggest()` 方法
- 方法签名统一：`suggest({ user_input, context })`

---

## 添加新功能的方法

### 添加新 API

1. 创建文件 `api/new-feature.js`
2. 实现完整功能（参数验证 + 业务逻辑 + 数据库操作 + 响应 + 错误处理）
3. 在 `server.js` 中注册路由：`app.post('/api/new-feature', require('./api/new-feature'))`
4. 完成

---

### 添加新 WebSocket 协议

1. 创建文件 `websocket/new-protocol.js`
2. 实现完整协议（接收消息 + 处理 + 数据库操作 + 返回确认 + 错误处理）
3. 在 `websocket/server.js` 的消息分发 switch 中添加 case
4. 完成

---

### 添加新视频服务商

1. 创建文件 `services/video-newprovider.js`
2. 实现 `generate(workspace_id, image_url, params)` 方法
   - 调用第三方 API
   - 更新 MongoDB
   - 启动轮询
   - 处理完成/失败状态
3. 修改 `.env`：`VIDEO_PROVIDER=newprovider`
4. 完成

---

### 添加新 LLM 服务商

1. 创建文件 `services/llm-newprovider.js`
2. 实现 `suggest({ user_input, context })` 方法
   - 构建 prompt
   - 调用 LLM API
   - 解析结果
3. 修改 `.env`：`LLM_PROVIDER=newprovider`
4. 完成

---

## 异步任务管理

### 轮询任务设计

**问题：** 视频生成是异步的，需要定期查询状态

**解决方案：** 每个视频服务内部管理轮询任务

**实现位置：** `services/video-*.js` 文件内部

**机制：**
- 使用 Map 存储轮询任务：`pollingTasks.set(workspace_id, intervalId)`
- 调用 `generate()` 后立即启动 `setInterval`
- 每5秒查询一次第三方 API 状态
- 完成或失败后清除 interval：`clearInterval(intervalId)`
- 超时时间10分钟，超时自动标记为失败

**优点：**
- 轮询逻辑和服务实现高度内聚在同一个文件
- 避免重复轮询（通过 Map 检查）
- 自动清理（完成/失败/超时）

---

## WebSocket 连接管理

### 活跃连接管理

**实现位置：** `websocket/server.js`

**机制：**
- 使用 Map 存储活跃连接：`activeConnections.set(connectionId, ws)`
- 新连接建立时生成唯一 ID
- 连接断开时从 Map 删除
- 提供 broadcast 方法遍历 Map 发送消息

---

### 心跳检测

**实现位置：** `websocket/server.js`

**机制：**
- 每个连接有 `isAlive` 标志
- 每30秒发送 ping
- 收到 pong 时设置 `isAlive = true`
- 下次检测时如果 `isAlive = false` 则断开连接

---

## 数据库操作规范

### 增量更新

**使用场景：** WebSocket 状态同步

**方法：** MongoDB `$set` 操作

**优点：**
- 只更新变化的字段
- 避免覆盖其他字段
- 支持点号路径更新嵌套字段（如 `form_data.camera_movement`）

---

### 批量操作

**使用场景：** 工作空间排序

**方法：** MongoDB `bulkWrite`

**优点：**
- 减少网络往返次数
- 原子性操作
- 性能更好

---

## 错误处理策略

### API 错误处理

**位置：** 每个 `api/*.js` 文件内部

**机制：**
- try/catch 捕获异常
- 返回统一格式：`{ success: false, error: '错误信息' }`
- 记录详细日志（logger.error）

---

### WebSocket 错误处理

**位置：** 每个 `websocket/*.js` 文件内部

**机制：**
- try/catch 捕获异常
- 返回错误事件：`{ type: 'error', data: { code, message } }`
- 记录详细日志（logger.error）

---

### 第三方 API 错误处理

**位置：** `services/*.js` 文件内部

**机制：**
- axios 请求设置 timeout
- try/catch 捕获网络错误、超时错误
- 更新 MongoDB 为 failed 状态
- WebSocket 推送失败事件
- 记录详细日志

---

## 日志记录规范

### 关键操作日志

**记录内容：**
- API 调用（请求参数、响应结果）
- 视频生成任务状态变化
- 文件上传事件
- WebSocket 连接/断开
- 数据库操作错误

**日志级别：**
- `logger.info`：正常操作
- `logger.warn`：警告（如重复轮询）
- `logger.error`：错误和异常

---

## 总结

本架构设计的核心特点：

✅ **单文件完成功能**：每个文件都是完整独立的功能模块
✅ **高度内聚**：相关代码集中在一个文件，便于 AI 理解和修改
✅ **低耦合**：模块之间通过 require 动态加载，松耦合
✅ **易于扩展**：添加新功能只需创建新文件并注册
✅ **适合 AI 开发**：AI 可以一次性理解整个模块的完整逻辑，无需跨文件理解

这种设计完全摒弃了传统的分层架构，专为 AI 辅助开发优化。
