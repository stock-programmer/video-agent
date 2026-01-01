# 后端任务 3.2 - WebSocket服务器

## 层级
第3层

## 依赖
- backend-dev-plan-2.1-project-init.md
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.3-logger-setup.md
- backend-dev-plan-2.4-database-setup.md

## 并行任务
- backend-dev-plan-3.1-express-server.md
- backend-dev-plan-3.3-video-service-runway.md
- backend-dev-plan-3.4-llm-service-openai.md

## 任务目标
创建 WebSocket 服务器和消息路由

## 执行步骤

### 1. 创建 src/websocket/server.js
```javascript
import { WebSocketServer } from 'ws';
import config from '../config.js';
import logger from '../utils/logger.js';

let wss = null;
const clients = new Set();

export function startWebSocketServer() {
  wss = new WebSocketServer({ port: config.server.wsPort });

  wss.on('connection', (ws) => {
    logger.info('WebSocket 客户端连接');
    clients.add(ws);

    // 心跳检测
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // 接收消息
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('收到消息:', message.type);

        await handleMessage(ws, message);
      } catch (error) {
        logger.error('消息处理失败:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    // 断开连接
    ws.on('close', () => {
      logger.info('WebSocket 客户端断开');
      clients.delete(ws);
    });
  });

  // 心跳检测 (30秒)
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  logger.info(`WebSocket 服务器启动: ws://localhost:${config.server.wsPort}`);
}

// 消息路由
async function handleMessage(ws, message) {
  switch (message.type) {
    case 'workspace.create':
      // 后续实现
      break;
    case 'workspace.update':
      // 后续实现
      break;
    case 'workspace.delete':
      // 后续实现
      break;
    case 'workspace.reorder':
      // 后续实现
      break;
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `未知消息类型: ${message.type}`
      }));
  }
}

// 广播消息给所有客户端
export function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}
```

### 2. 在 server.js 中启动 WebSocket
修改 `src/server.js`:
```javascript
import { startWebSocketServer } from './websocket/server.js';

async function startServer() {
  await connectDB();

  app.listen(config.server.port, () => {
    logger.info(`HTTP 服务器启动: http://localhost:${config.server.port}`);
  });

  startWebSocketServer();
}
```

### 3. 测试 WebSocket
创建 `test-ws.js`:
```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('已连接');
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (data) => {
  console.log('收到:', data.toString());
});
```

运行:
```bash
node test-ws.js
```

## 验收标准
- [ ] `src/websocket/server.js` 已创建
- [ ] WebSocket 服务器启动成功
- [ ] 客户端可以连接
- [ ] 消息路由正常工作
- [ ] 心跳检测正常
- [ ] 广播功能可用

## 下一步
- backend-dev-plan-5.1-ws-workspace-create.md
- backend-dev-plan-5.2-ws-workspace-update.md
- backend-dev-plan-5.3-ws-workspace-delete.md
- backend-dev-plan-5.4-ws-workspace-reorder.md
