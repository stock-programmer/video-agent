# AI视频生成平台 - 后端架构总览

## 文档信息
- **版本号**：v2.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段架构设计

---

## 文档导航

本文档是后端架构的总览，详细内容请查看以下独立文档：

| 文档 | 内容 | 文件 |
|------|------|------|
| **API 和 WebSocket 通信设计** | REST API 端点、WebSocket 事件、消息格式、状态同步机制 | `backend-api-design.md` |
| **数据库设计** | MongoDB Schema、索引设计、常用查询、性能优化 | `backend-database-design.md` |
| **程序架构和模块设计** | 单文件模块设计、目录结构、调用拓扑、职责清单 | `backend-architecture-modules.md` |
| **配置管理** | 环境变量、服务商切换、配置验证、安全最佳实践 | `backend-config.md` |
| **测试策略** | 功能测试、API 测试、WebSocket 测试、Mock 策略 | `backend-testing.md` |
| **部署指南** | 服务器配置、PM2 管理、Nginx 配置、备份策略 | `backend-deployment.md` |

---

## 设计原则

### 1. 简单直接
- 单用户假设，避免过度设计
- 无认证系统、无权限控制
- 专注核心功能

### 2. 近实时同步
- WebSocket 增量更新
- 类似草稿箱的自动保存体验
- 300ms debounce 避免频繁发送

### 3. 灵活扩展
- 第三方 API 可随时切换（视频生成、LLM）
- 适配器模式实现服务商解耦
- 配置文件控制，无需修改代码

### 4. 高度内聚
- 单文件完成完整功能
- 不使用传统分层架构
- 专为 AI 开发优化

### 5. 开发友好
- 完善的日志系统（Winston）
- 清晰的错误提示
- 详细的文档

---

## 不包含的功能（MVP 阶段）

- ❌ 任务队列（Redis/Bull）
- ❌ 缓存层（Redis）
- ❌ 监控告警服务（Prometheus/Grafana）
- ❌ 用户认证系统
- ❌ 权限控制
- ❌ 负载均衡
- ❌ 多机集群

---

## 核心技术栈

```
Node.js + Express + WebSocket
├── MongoDB + Mongoose          - 数据持久化
├── ws                         - WebSocket 服务
├── Multer                     - 文件上传
├── Winston                    - 日志记录
├── Axios                      - HTTP 请求
└── PM2                        - 进程管理（生产环境）
```

---

## 架构概览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 (React)                         │
│     - 横向时间轴布局                                          │
│     - 图片上传、表单填写、视频播放、AI 协作                      │
└──────────────────┬──────────────────────┬───────────────────┘
                   │ HTTP (REST API)      │ WebSocket
                   ↓                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Node.js + Express)                  │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  API 模块     │  │ WebSocket 模块 │  │  服务模块        │  │
│  │              │  │               │  │                 │  │
│  │ upload-image │  │ ws server     │  │ video-runway    │  │
│  │ get-worksp.. │  │ create        │  │ video-pika      │  │
│  │ generate-..  │  │ update        │  │ video-kling     │  │
│  │ ai-suggest   │  │ delete        │  │ llm-openai      │  │
│  │              │  │ reorder       │  │ llm-claude      │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬────────┘  │
│         │                  │                   │            │
│         └──────────────────┼───────────────────┘            │
│                            ↓                                │
│                   ┌────────────────┐                        │
│                   │  MongoDB Model  │                       │
│                   │  (Workspace)    │                       │
│                   └────────┬───────┘                        │
└────────────────────────────┼────────────────────────────────┘
                             ↓
                    ┌────────────────┐
                    │    MongoDB     │
                    │   (持久化存储)   │
                    └────────────────┘
```

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
│   ├── api/                        # API 层（单文件完成功能）
│   │   ├── upload-image.js
│   │   ├── get-workspaces.js
│   │   ├── generate-video.js
│   │   └── ai-suggest.js
│   │
│   ├── websocket/                  # WebSocket 层（单文件完成协议）
│   │   ├── server.js
│   │   ├── workspace-create.js
│   │   ├── workspace-update.js
│   │   ├── workspace-delete.js
│   │   └── workspace-reorder.js
│   │
│   ├── services/                   # 服务层（第三方 API 集成）
│   │   ├── video-runway.js         # Runway（API + 轮询）
│   │   ├── video-pika.js           # Pika（API + 轮询）
│   │   ├── video-kling.js          # Kling（API + 轮询）
│   │   ├── llm-openai.js
│   │   ├── llm-claude.js
│   │   └── llm-qwen.js
│   │
│   └── utils/
│       └── logger.js               # Winston 日志工具
│
├── uploads/                        # 用户上传的图片
├── logs/                           # 应用日志
│
├── .env                            # 环境变量
├── .env.example                    # 环境变量模板
├── ecosystem.config.js             # PM2 配置
├── package.json
└── README.md
```

---

## 核心功能流程

### 1. 用户上传图片

```
前端选择图片 → POST /api/upload/image
  ↓
api/upload-image.js
  ├─ Multer 处理文件上传
  ├─ 保存到 uploads/ 目录
  └─ 返回 { image_path, image_url }
```

---

### 2. 表单自动保存（WebSocket）

```
用户填写表单（运镜方式）
  ↓
前端 debounce 300ms
  ↓
WebSocket.send({ type: 'workspace.update', updates: { ... } })
  ↓
websocket/server.js 分发
  ↓
websocket/workspace-update.js
  ├─ MongoDB updateOne({ $set: updates })
  └─ 返回 sync_confirm
```

---

### 3. 视频生成（异步任务）

```
用户点击「生成视频」
  ↓
POST /api/generate/video
  ↓
api/generate-video.js
  ├─ 根据 VIDEO_PROVIDER 加载服务
  └─ 调用 services/video-runway.js
       ↓
     video-runway.js::generate()
       ├─ 调用 Runway API → task_id
       ├─ 更新 MongoDB: status = 'generating'
       ├─ WebSocket 推送状态
       └─ 启动轮询（每5秒查询状态）
            ↓
          完成 → handleCompleted()
            ├─ 更新 MongoDB: status = 'completed', url = '...'
            └─ WebSocket 推送完成事件
```

---

### 4. AI 协作建议

```
用户输入「帮我优化运镜」
  ↓
POST /api/ai/suggest
  ↓
api/ai-suggest.js
  ├─ 根据 LLM_PROVIDER 加载服务
  └─ 调用 services/llm-openai.js
       ↓
     llm-openai.js::suggest()
       ├─ 构建 prompt
       ├─ 调用 OpenAI Chat API
       └─ 返回建议
            ↓
          保存 AI 协作历史到 MongoDB
            ↓
          返回建议给前端
```

---

## 数据库设计（MongoDB）

### Workspace Collection

**核心字段：**
- `order_index`: 排序顺序（索引）
- `image_path`, `image_url`: 图片信息
- `form_data`: 表单数据（运镜、景别、光线、提示词）
- `video`: 视频生成状态（status, task_id, url, error）
- `ai_collaboration`: AI 协作历史数组

**索引：**
- `order_index`: 支持快速排序
- `video.status`: 支持按状态筛选（轮询任务管理）

**详细设计：** 见 `backend-database-design.md`

---

## API 端点清单

### REST API

| 方法 | 路径 | 功能 | 文件 |
|------|------|------|------|
| POST | /api/upload/image | 上传图片 | api/upload-image.js |
| GET | /api/workspaces | 获取所有工作空间 | api/get-workspaces.js |
| POST | /api/generate/video | 触发视频生成 | api/generate-video.js |
| POST | /api/ai/suggest | AI 协作建议 | api/ai-suggest.js |
| GET | /health | 健康检查 | server.js |

---

### WebSocket 事件

**客户端 → 服务器：**
- `workspace.create`: 创建工作空间
- `workspace.update`: 增量更新
- `workspace.delete`: 删除工作空间
- `workspace.reorder`: 调整顺序

**服务器 → 客户端：**
- `workspace.created`: 创建成功
- `workspace.sync_confirm`: 同步确认
- `workspace.deleted`: 删除成功
- `workspace.reorder_confirm`: 排序确认
- `video.status_update`: 视频状态更新（主动推送）
- `error`: 错误通知

**详细设计：** 见 `backend-api-design.md`

---

## 第三方服务集成

### 视频生成服务

**支持的服务商：**
- Runway ML
- Pika Labs
- 快手可灵（Kling）

**切换方式：** 修改 `.env` 中的 `VIDEO_PROVIDER`

**实现文件：**
- `services/video-runway.js`
- `services/video-pika.js`
- `services/video-kling.js`

**每个文件完整实现：**
- API 调用
- 轮询任务管理
- 状态更新
- WebSocket 推送

---

### LLM 服务

**支持的服务商：**
- OpenAI (GPT-4)
- Anthropic (Claude)
- 阿里云通义千问

**切换方式：** 修改 `.env` 中的 `LLM_PROVIDER`

**实现文件：**
- `services/llm-openai.js`
- `services/llm-claude.js`
- `services/llm-qwen.js`

---

## 配置管理

### 环境变量

**核心配置：**
```bash
# 环境
NODE_ENV=development

# 数据库
MONGODB_URI=mongodb://localhost:27017/video-maker

# 服务器
SERVER_PORT=3000
WS_PORT=3001

# 第三方 API 密钥
RUNWAY_API_KEY=xxx
OPENAI_API_KEY=xxx

# 服务商选择
VIDEO_PROVIDER=runway
LLM_PROVIDER=openai
```

**详细配置：** 见 `backend-config.md`

---

## 部署方案

### MVP 阶段：单机部署

**架构：**
```
Nginx (反向代理)
  ├─ HTTP → Backend:3000
  └─ WebSocket → Backend:3001

Backend (PM2 管理)
  └─ Node.js 进程

MongoDB (本地或 Atlas)
  └─ 数据持久化
```

**特点：**
- 简单快速
- PM2 自动重启
- Nginx 处理 HTTPS
- 定期备份数据库

**详细步骤：** 见 `backend-deployment.md`

---

## 测试策略

### MVP 阶段测试重点

**优先级：**
1. ⭐⭐⭐ 核心功能测试（图片上传、视频生成、状态同步）
2. ⭐⭐ API 集成测试（自动化）
3. ⭐ WebSocket 协议测试（自动化）

**工具：**
- Jest（测试框架）
- Supertest（HTTP 测试）
- nock（Mock 第三方 API）
- mongodb-memory-server（测试数据库）

**详细策略：** 见 `backend-testing.md`

---

## 关键设计决策

### 1. 为什么使用单文件模块而不是分层架构？

**原因：**
- AI 更容易理解完整的功能模块
- 减少跨文件理解成本
- 高度内聚，易于修改

**示例：**
- `api/upload-image.js` 完成从路由处理到文件保存的所有逻辑
- `websocket/workspace-update.js` 完成从接收消息到数据库更新的所有逻辑

---

### 2. 为什么使用 WebSocket 而不是轮询？

**原因：**
- 近实时双向通信
- 服务器主动推送（视频生成完成通知）
- 减少无效请求
- 更好的用户体验

---

### 3. 为什么视频生成使用后端轮询而不是前端轮询？

**原因：**
- 统一管理轮询任务
- 避免浏览器关闭后任务丢失
- 减少第三方 API 调用（只有一个服务器在轮询）
- 通过 WebSocket 主动推送给前端

---

### 4. 为什么使用 MongoDB 而不是 MySQL？

**原因：**
- 灵活的 Schema 设计（form_data, ai_collaboration）
- 嵌套对象和数组支持
- 快速迭代，无需频繁修改表结构
- JSON 格式与前端数据一致

---

## 性能考虑

### 数据库优化
- 索引设计（order_index, video.status）
- 使用 `.lean()` 返回普通对象
- 批量操作（bulkWrite）

### WebSocket 优化
- 前端 debounce 300ms 避免频繁发送
- 增量更新（只发送变化字段）
- 心跳检测（30秒）

### 文件存储
- MVP 阶段本地存储（uploads/）
- 未来迁移到 OSS（架构已预留）

---

## 未来扩展方向

### Phase 2: 性能优化
- 引入 Redis 缓存热点数据
- 使用消息队列处理视频生成任务
- 优化数据库查询

### Phase 3: 多用户支持
- 添加用户认证系统
- 基于 user_id 的数据隔离
- 权限控制

### Phase 4: 高可用
- 数据库主从复制
- 负载均衡
- 服务监控和告警

### Phase 5: 功能扩展
- 视频片段合成
- 批量导出
- 模板库
- CDN 加速

---

## 技术风险与应对

### 1. 第三方 API 不稳定
- 设置合理的超时时间（30秒）
- 轮询超时机制（10分钟）
- 提供错误提示给用户

### 2. WebSocket 连接稳定性
- 自动重连机制（指数退避）
- 心跳检测（30秒 ping/pong）
- 断线后重新加载状态

### 3. 大文件传输
- 限制文件大小（10MB）
- 图片压缩（前端处理）
- 未来迁移到 OSS

### 4. 数据一致性
- 单用户场景，冲突概率低
- WebSocket 确认机制（5秒超时重试）
- MongoDB 文档级原子操作

---

## 开发工作流

### 本地开发

```bash
# 启动 MongoDB
sudo systemctl start mongod

# 启动后端（开发模式）
npm run dev

# 运行测试
npm test

# 查看日志
tail -f logs/combined.log
```

---

### 添加新功能

**添加新 API：**
1. 创建 `api/new-feature.js`
2. 实现完整功能
3. 在 `server.js` 注册路由

**添加新视频服务商：**
1. 创建 `services/video-newprovider.js`
2. 实现 `generate()` 方法（包含轮询）
3. 修改 `.env`: `VIDEO_PROVIDER=newprovider`

**添加新 WebSocket 协议：**
1. 创建 `websocket/new-protocol.js`
2. 实现协议处理
3. 在 `websocket/server.js` 添加 case

---

## 日志和调试

### 日志级别
- `debug`: 调试信息（开发环境）
- `info`: 关键操作（视频生成开始/完成）
- `error`: 错误和异常

### 日志文件
- `logs/error.log`: 仅错误日志
- `logs/combined.log`: 所有日志

### 日志查看
```bash
# 实时查看所有日志
tail -f logs/combined.log

# 实时查看错误日志
tail -f logs/error.log

# 搜索特定关键词
grep "workspace_id" logs/combined.log
```

---

## 总结

本架构设计的核心特点：

✅ **简单直接**：Express + MongoDB + WebSocket，技术栈成熟稳定
✅ **近实时同步**：WebSocket 增量更新 + debounce，体验流畅
✅ **灵活扩展**：配置文件切换服务商，无需修改代码
✅ **高度内聚**：单文件完成功能，专为 AI 开发优化
✅ **开发友好**：清晰的目录结构，完善的日志系统
✅ **单用户优化**：无复杂权限控制，专注核心功能

适合快速上线 MVP，验证产品方向，后续可根据用户反馈和业务需求逐步优化扩展。

---

## 参考文档

- [API 和 WebSocket 通信设计](./backend-api-design.md)
- [数据库设计](./backend-database-design.md)
- [程序架构和模块设计](./backend-architecture-modules.md)
- [配置管理](./backend-config.md)
- [测试策略](./backend-testing.md)
- [部署指南](./backend-deployment.md)
