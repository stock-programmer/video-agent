# 后端任务 2.2 - 配置管理

## 层级
第2层

## 依赖
- backend-dev-plan-1.1-install-dependencies.md

## 并行任务
- backend-dev-plan-2.1-project-init.md
- backend-dev-plan-2.3-logger-setup.md
- backend-dev-plan-2.4-database-setup.md

## 任务目标
实现配置管理,加载和验证环境变量

## 参考文档
- `context/backend-config.md`

## 执行步骤

### 1. 创建 .env.example
```bash
NODE_ENV=development
SERVER_PORT=3000
WS_PORT=3001
MONGODB_URI=mongodb://localhost:27017/video-maker

RUNWAY_API_KEY=your-runway-key
OPENAI_API_KEY=your-openai-key

VIDEO_PROVIDER=runway
LLM_PROVIDER=openai
UPLOAD_MAX_SIZE=10485760
```

### 2. 创建 .env
```bash
cp .env.example .env
# 填入真实的 API Key
```

### 3. 创建 src/config.js
```javascript
import dotenv from 'dotenv';
dotenv.config();

function validateConfig() {
  const required = ['MONGODB_URI', 'SERVER_PORT', 'WS_PORT'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`缺少环境变量: ${missing.join(', ')}`);
  }
}

validateConfig();

export default {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.SERVER_PORT),
    wsPort: parseInt(process.env.WS_PORT)
  },
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760,
    dir: './uploads'
  },
  video: {
    provider: process.env.VIDEO_PROVIDER || 'runway'
  },
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai'
  },
  apiKeys: {
    runway: process.env.RUNWAY_API_KEY,
    openai: process.env.OPENAI_API_KEY
  }
};
```

## 验收标准
- [ ] `.env.example` 已创建
- [ ] `.env` 已创建并填入配置
- [ ] `src/config.js` 实现完成
- [ ] 配置验证正常工作
- [ ] `node -e "import('./src/config.js')"` 无错误

## 下一步
- backend-dev-plan-3.1-express-server.md
- backend-dev-plan-3.2-websocket-server.md
