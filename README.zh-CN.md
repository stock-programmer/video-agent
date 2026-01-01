# AI 视频生成平台

> AI 驱动的视频生成 SaaS 平台，支持人机协作的创意视频制作工作流，核心功能为**图生视频**（Image-to-Video），基于阿里云通义千问和 Google Gemini 技术。

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![使用 Claude Code 构建](https://img.shields.io/badge/%E4%BD%BF%E7%94%A8-Claude%20Code-%23blueviolet.svg)](https://claude.com/code)
[![零手写代码](https://img.shields.io/badge/%E6%89%8B%E5%86%99%E4%BB%A3%E7%A0%81-0%25-ff69b4.svg)]()

[English](README.md) | [简体中文](README.zh-CN.md)

---

## 🚀 革命性的开发范式

> **本项目完全通过突破性的人机协作范式构建 —— 人类没有手写一行代码。**

### 📋 规格文档驱动的 AI 开发工作流

不同于传统编码方式，本项目通过系统化的文档驱动方法创建：

```
用户故事 → MVP 版本逻辑 → 商业规划 → 业务需求
    ↓
产品需求文档（PRD）
    ↓
业务与技术架构设计
    ↓
开发任务分解（DAG 模型）
    ↓
规格文档 → Claude Code（AI 编码代理）→ 完整应用
```

**核心创新：**
- **人类角色：** 战略思考、需求定义、架构设计
- **AI 角色：** 代码生成、功能实现、测试
- **协作媒介：** `context/` 目录中的结构化规格文档
- **AI 代理：** [Claude Code](https://claude.com/code) - 自主编码代理

这代表了软件开发的新时代，人类专注于**构建什么**（通过规格文档），AI 负责**如何构建**（通过代码生成）。

**📁 所有规格文档都在 `context/` 目录中，可供参考和复现。**

---

## ✨ 核心特性

- 🎬 **图生视频** - 使用 AI 将静态图片转换为动态视频
- 🤖 **AI 协作** - 基于 Gemini LLM 的智能视频参数建议
- 📊 **横向时间轴** - 直观的工作空间管理，支持横向滚动
- ⚡ **实时同步** - 基于 WebSocket 的跨客户端状态同步
- 🎨 **丰富的视频控制** - 摄像机运动、镜头类型、光照效果和自定义动作提示
- 🔄 **灵活的 API 集成** - 轻松切换第三方视频生成服务商

---

## 🎯 项目概述

这是一个 **MVP 阶段**的平台，专注于核心的图生视频工作流。用户可以：

1. 上传图片（分镜图）
2. 配置视频生成参数（摄像机、光照、运动）
3. 使用 AI 生成视频（通义千问 wan2.6-i2v 模型）
4. 获取 AI 驱动的最佳视频设置建议
5. 在横向时间轴中管理多个工作空间

**当前状态：** ✅ 完整实现（前端 + 后端 + 第三方 API）

---

## 🛠️ 技术栈

### 前端
- **框架：** React 19 + TypeScript
- **构建工具：** Vite
- **样式：** TailwindCSS 4
- **状态管理：** Zustand
- **数据获取：** Axios + TanStack React Query
- **拖拽：** dnd-kit

### 后端
- **运行时：** Node.js + Express
- **数据库：** MongoDB + Mongoose
- **实时通信：** WebSocket (ws)
- **文件上传：** Multer
- **日志：** Winston

### 第三方 API
- **视频生成：** 阿里云通义千问（DashScope wan2.6-i2v）
- **LLM 服务：** Google Gemini 3 (gemini-3-flash-preview)

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- MongoDB >= 6
- API 密钥：
  - [阿里云 DashScope API Key](https://bailian.console.aliyun.com/)
  - [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/stock-programmer/video-agent.git
cd video-agent/my-project
```

2. **配置环境变量**
```bash
# 根目录
cp .env.example .env
# 编辑 .env 并添加你的 API 密钥

# 后端目录
cd backend
cp .env.example .env
# 编辑 backend/.env
```

3. **安装依赖**
```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

4. **启动 MongoDB**
```bash
# 确保 MongoDB 正在运行
mongod
```

5. **运行应用**

```bash
# 终端 1 - 启动后端（在 backend/ 目录）
npm run dev

# 终端 2 - 启动前端（在 frontend/ 目录）
npm run dev
```

6. **访问应用**
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000
- WebSocket：ws://localhost:3001

---

## 📁 项目结构

```
my-project/
├── ai-output-resource/         # AI 生成的测试脚本和文档
│   ├── test-scripts/           # API 测试脚本
│   └── docs/                   # 生成的文档
├── backend/                    # 后端应用
│   ├── src/
│   │   ├── api/                # REST API 端点
│   │   ├── websocket/          # WebSocket 处理器
│   │   ├── services/           # 第三方集成
│   │   ├── db/                 # MongoDB 模型
│   │   └── utils/              # 工具函数（日志等）
│   ├── uploads/                # 用户上传的图片
│   └── logs/                   # 应用日志
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/         # React 组件
│   │   ├── services/           # API 和 WebSocket 客户端
│   │   ├── stores/             # Zustand 状态管理
│   │   └── types/              # TypeScript 类型定义
│   └── dist/                   # 构建输出
├── context/                    # 开发文档
│   ├── business.md             # 业务需求
│   ├── backend-*.md            # 后端架构文档
│   └── tasks/                  # 开发任务分解
└── CLAUDE.md                   # AI 助手指南
```

---

## ⚙️ 环境配置

### 根目录 `.env`
```bash
# 第三方 API 密钥
DASHSCOPE_API_KEY=your-dashscope-key
GOOGLE_API_KEY=your-google-key
```

### 后端 `.env`
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/video-maker
SERVER_PORT=3000
WS_PORT=3001

# 服务提供商
VIDEO_PROVIDER=qwen
LLM_PROVIDER=gemini

# API 密钥
DASHSCOPE_API_KEY=your-dashscope-key
GOOGLE_API_KEY=your-google-key

# 上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## 🔌 API 端点

### REST API
- `POST /api/upload/image` - 上传图片
- `GET /api/workspaces` - 获取所有工作空间
- `GET /api/uploads/:filename` - 访问上传的图片
- `POST /api/generate/video` - 触发视频生成
- `POST /api/ai/suggest` - AI 协作建议

### WebSocket 事件
**客户端 → 服务器：**
- `workspace.create` - 创建新工作空间
- `workspace.update` - 更新工作空间数据
- `workspace.delete` - 删除工作空间
- `workspace.reorder` - 重新排序工作空间

**服务器 → 客户端：**
- `workspace.sync_confirm` - 确认同步
- `video.status_update` - 视频生成状态更新
- `error` - 错误通知

---

## 🧪 测试

### 后端测试
```bash
cd backend
npm test
```

### API 验证
```bash
# 测试通义千问视频生成 API
node ai-output-resource/test-scripts/test-qwen-video.js

# 测试 Gemini LLM API
node ai-output-resource/test-scripts/test-gemini-llm.js
```

---

## 📦 生产构建

### 前端构建
```bash
cd frontend
npm run build
# 输出：frontend/dist/
```

### 后端生产模式
```bash
cd backend
npm start
```

---

## 🏗️ 架构亮点

### 规格驱动的设计哲学
- **所有架构决策都先文档化，然后由 AI 实现**
- **人类可读的规格文档**使 AI 代理能够生成一致的代码
- **基于 DAG 的任务分解**确保系统化的逐层开发
- **零歧义** - 规格文档足够精确，可供 AI 解释

### 单文件模块设计
- **高内聚：** 一个文件 = 一个完整功能
- **无分层分离：** 避免传统的 routes/services/models 分离
- **AI 友好：** 更易于 AI 助手理解和维护
- **规格对齐：** 每个模块直接映射到规格文档

### 第三方 API 适配器模式
- **灵活的提供商切换：** 通过环境变量更改提供商
- **无需代码更改：** 只需更新 `.env` 配置
- **易于扩展：** 通过创建单个适配器文件添加新提供商

### 实时状态同步
- **WebSocket + 增量更新：** 仅传输更改的字段
- **立即持久化：** 更新立即写入 MongoDB
- **草稿式自动保存：** 跨客户端的近实时状态同步

---

## 🚧 已知限制（MVP）

- **单用户假设：** 无认证系统
- **本地文件存储：** 图片存储在 `backend/uploads/`（非云存储）
- **无任务队列：** 视频生成使用简单的轮询机制
- **有限的错误恢复：** 网络故障可能需要手动刷新

---

## 🔮 未来增强

- [ ] 用户认证和多用户支持
- [ ] 云存储集成（OSS/S3）
- [ ] 视频生成任务队列（Redis/Bull）
- [ ] 高级错误恢复机制
- [ ] 监控和告警（Prometheus/Grafana）
- [ ] 剧本编写和分镜设计工具
- [ ] 文生视频功能

---

## 📖 规格文档（开发蓝图）

> **这些文档不仅仅是文档 —— 它们就是驱动整个开发的"源代码"。**

`context/` 目录包含完整的规格驱动开发工作流：

### 核心规格文档
- **[业务需求文档](context/business.md)** - 产品愿景、MVP 范围和业务逻辑
- **[后端架构文档](context/backend-architecture.md)** - 系统设计和架构决策
- **[API 设计文档](context/backend-api-design.md)** - REST API 和 WebSocket 规格
- **[数据库设计文档](context/backend-database-design.md)** - MongoDB 模式和数据建模
- **[开发任务分解](context/tasks/README.md)** - 基于 DAG 的任务执行计划

### 如何复现此项目
1. 按顺序阅读规格文档（从业务需求到任务分解）
2. 将它们提供给 Claude Code 或类似的 AI 编码代理
3. 遵循 DAG 任务执行模型（逐层执行）
4. AI 代理将生成完全相同的应用程序

**这展示了规格驱动 AI 开发的可复现性和透明度。**

---

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发指南
- 遵循基于 DAG 的任务执行模型（参见 `context/tasks/README.md`）
- 阅读 `CLAUDE.md` 了解 AI 助手协作指南
- 使用单文件模块设计模式
- 为新功能编写测试

---

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 👥 作者

- **许武** - 初始工作

---

## 🙏 致谢

- [阿里云通义千问（DashScope）](https://help.aliyun.com/zh/model-studio/) - 视频生成 API
- [Google Gemini](https://ai.google.dev/) - LLM 服务
- [Claude Code](https://claude.com/code) - AI 辅助开发

---

## 📧 联系方式

- **项目链接：** https://github.com/stock-programmer/video-agent
- **问题反馈：** https://github.com/stock-programmer/video-agent/issues
- **邮箱：** 273007213@qq.com

---

<p align="center">用 ❤️ 和 AI 制作</p>
