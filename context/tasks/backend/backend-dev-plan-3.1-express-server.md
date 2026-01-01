# 后端任务 3.1 - Express服务器

## 层级
第3层

## 依赖
- backend-dev-plan-2.1-project-init.md
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.3-logger-setup.md
- backend-dev-plan-2.4-database-setup.md

## 并行任务
- backend-dev-plan-3.2-websocket-server.md
- backend-dev-plan-3.3-video-service-runway.md
- backend-dev-plan-3.4-llm-service-openai.md

## 任务目标
创建 Express HTTP 服务器

## 执行步骤

### 1. 创建 src/server.js
```javascript
import express from 'express';
import cors from 'cors';
import config from './config.js';
import logger from './utils/logger.js';
import { connectDB } from './db/mongodb.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 (上传的图片)
app.use('/uploads', express.static('uploads'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
async function startServer() {
  try {
    await connectDB();

    app.listen(config.server.port, () => {
      logger.info(`HTTP 服务器启动: http://localhost:${config.server.port}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
```

### 2. 测试服务器
```bash
npm run dev
```

访问:
```bash
curl http://localhost:3000/health
```

应该返回:
```json
{"status":"ok","timestamp":"2025-12-25T..."}
```

## 验收标准
- [ ] `src/server.js` 已创建
- [ ] Express 服务器启动成功
- [ ] `GET /health` 返回正常
- [ ] CORS 配置正确
- [ ] 静态文件服务可用
- [ ] 数据库连接成功

## 下一步
- backend-dev-plan-4.1-api-upload-image.md
- backend-dev-plan-4.2-api-get-workspaces.md
- backend-dev-plan-4.3-api-generate-video.md
- backend-dev-plan-4.4-api-ai-suggest.md
