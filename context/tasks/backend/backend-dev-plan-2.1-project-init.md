# 后端任务 2.1 - 项目初始化

## 层级
第2层

## 依赖
- backend-dev-plan-1.1-install-dependencies.md

## 并行任务
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.3-logger-setup.md
- backend-dev-plan-2.4-database-setup.md

## 任务目标
创建项目目录结构并安装 npm 依赖

## 执行步骤

### 1. 创建目录结构
```bash
mkdir -p backend/src/{api,websocket,services,db,utils}
mkdir -p backend/{uploads,logs}
cd backend
```

### 2. 初始化 npm
```bash
npm init -y
```

编辑 `package.json`:
```json
{
  "name": "video-maker-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  }
}
```

### 3. 安装依赖
```bash
npm install express mongoose ws multer winston axios dotenv cors @google/generative-ai
npm install -D nodemon jest supertest eslint mongodb-memory-server
```

**依赖说明：**
- `express` - HTTP 服务器框架
- `mongoose` - MongoDB ODM
- `ws` - WebSocket 服务器
- `multer` - 文件上传中间件
- `winston` - 日志管理
- `axios` - HTTP 客户端（调用第三方 API）
- `dotenv` - 环境变量管理
- `cors` - 跨域请求处理
- `@google/generative-ai` - Google Gemini AI SDK

**开发依赖说明：**
- `nodemon` - 开发环境自动重启
- `jest` - 测试框架
- `supertest` - HTTP 接口测试
- `eslint` - 代码规范检查
- `mongodb-memory-server` - 内存 MongoDB（测试用）

### 4. 配置 ESLint
```bash
npm init @eslint/config
```

选择以下选项（推荐）：
- How would you like to use ESLint? → **To check syntax and find problems**
- What type of modules does your project use? → **JavaScript modules (import/export)**
- Which framework does your project use? → **None of these**
- Does your project use TypeScript? → **No**
- Where does your code run? → **Node**
- What format do you want your config file to be in? → **JavaScript**

### 5. 创建 .gitignore
```
node_modules/
.env
logs/*.log
uploads/*
!uploads/.gitkeep
```

### 6. 创建 .env.example 模板文件

在 `backend/` 目录下创建 `.env.example` 文件作为配置模板：

```bash
# ===== 环境配置 =====
NODE_ENV=development

# ===== 数据库配置 =====
MONGODB_URI=mongodb://localhost:27017/video-maker

# ===== 服务器配置 =====
SERVER_PORT=3000
WS_PORT=3001

# ===== 第三方 API 密钥 =====
# 视频生成服务 - 阿里云通义千问 (DashScope)
# 获取地址: https://bailian.console.aliyun.com/
DASHSCOPE_API_KEY=

# LLM 服务 - Google Gemini
# 获取地址: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=

# ===== 服务商选择 =====
VIDEO_PROVIDER=qwen
LLM_PROVIDER=gemini

# ===== 上传配置 =====
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# ===== 日志配置 =====
LOG_LEVEL=info
LOG_DIR=./logs

# ===== 视频生成配置 =====
VIDEO_POLL_INTERVAL=5000
VIDEO_TIMEOUT=600000

# ===== WebSocket 配置 =====
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=60000

# ===== Qwen 视频生成配置 =====
QWEN_VIDEO_MODEL=qwen-vl-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# ===== Gemini LLM 配置 =====
GEMINI_MODEL=gemini-pro
```

### 7. 第三方服务配置说明

#### 7.1 Qwen (通义千问) - 视频生成服务

本项目使用阿里云 DashScope 平台的通义千问作为**图生视频**服务。

**API Key 获取步骤：**
1. 访问阿里云百炼平台：https://bailian.console.aliyun.com/
2. 登录阿里云账号（没有账号需要先注册）
3. 进入 API-KEY 管理页面
4. 创建新的 API Key
5. 复制生成的 API Key 到 `.env` 文件的 `DASHSCOPE_API_KEY` 变量

**认证方式：**
- 环境变量：使用 `DASHSCOPE_API_KEY` 环境变量（推荐）
- HTTP Header: `Authorization: Bearer {DASHSCOPE_API_KEY}`

**API 端点：**
- Base URL: `https://dashscope.aliyuncs.com/api/v1`
- 视频生成任务提交: `/services/aigc/video-generation/generation`
- 任务状态查询: `/tasks/{task_id}`

**推荐模型：**
- `qwen-vl-plus` - 通用视觉理解模型（支持图生视频）
- `qwen-vl-max` - 高性能视觉模型

**调用限制：**
- 新用户通常有免费额度（具体以官网为准）
- 查看配额：https://dashscope.console.aliyun.com/

**参考文档：**
- 官方文档：https://help.aliyun.com/zh/dashscope/
- API 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2867393
- 视频生成 API：https://help.aliyun.com/zh/dashscope/developer-reference/video-generation

#### 7.2 Google Gemini - LLM 服务

本项目使用 Google Gemini 作为**AI 协作助手**的 LLM 服务。

**API Key 获取步骤：**
1. 访问 Google AI Studio：https://aistudio.google.com/app/apikey
2. 登录 Google 账号
3. 点击 "Create API Key" 创建新的 API Key
4. 复制生成的 API Key 到 `.env` 文件的 `GOOGLE_API_KEY` 变量

**认证方式：**
- API Key 方式：通过 `@google/generative-ai` SDK 自动处理

**推荐模型：**
- `gemini-pro` - 文本生成（用于 AI 建议功能）
- `gemini-pro-vision` - 多模态模型（如需图像理解）

**调用限制：**
- 免费额度：60 requests/min
- 付费版本有更高配额

**参考文档：**
- 官方文档：https://ai.google.dev/docs
- Node.js SDK：https://github.com/google/generative-ai-js
- API 参考：https://ai.google.dev/api/rest

## 验收标准
- [ ] 目录结构创建完成（src, uploads, logs 等）
- [ ] `package.json` 配置正确（含 scripts 和 type: "module"）
- [ ] 所有依赖安装完成（运行 `npm list` 无错误）
- [ ] ESLint 配置文件生成（.eslintrc.js）
- [ ] `.gitignore` 文件创建
- [ ] `.env.example` 模板文件创建（包含 DASHSCOPE_API_KEY 和 GOOGLE_API_KEY）
- [ ] 已获取 DashScope API Key（用于视频生成）
- [ ] 已获取 Google API Key（用于 LLM 服务）

## 常见问题

### Q1: npm install 报错怎么办？
- 检查 Node.js 版本是否 >= 18（运行 `node -v`）
- 清除缓存：`npm cache clean --force`
- 删除 `node_modules` 和 `package-lock.json`，重新安装

### Q2: 如何验证 DashScope API Key 是否有效？
可以使用 curl 测试：
```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer YOUR_DASHSCOPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-turbo",
    "input": {
      "messages": [{"role": "user", "content": "你好"}]
    }
  }'
```

### Q3: 如何验证 Google Gemini API Key 是否有效？
可以使用 Node.js 测试：
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent('Hello, Gemini!');
console.log(result.response.text());
```

### Q4: 为什么视频生成用 Qwen，LLM 用 Gemini？
- **Qwen (通义千问)**: 阿里云的多模态模型，专长于视觉理解和图生视频任务
- **Gemini**: Google 的强大 LLM，适合文本生成和创意协作建议
- 这种组合充分发挥各自优势，提供最佳用户体验

## 下一步
- backend-dev-plan-3.1-express-server.md
- backend-dev-plan-3.2-websocket-server.md
