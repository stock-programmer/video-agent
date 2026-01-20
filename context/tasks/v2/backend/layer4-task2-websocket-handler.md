# Backend Layer 4 Task 2: 实现 WebSocket 优化协议

## 任务元数据

- **任务 ID**: `backend-v2-layer4-task2`
- **任务名称**: 实现 WebSocket 优化协议
- **所属层级**: Layer 4 - API 和 WebSocket
- **预计工时**: 3 小时
- **依赖任务**: B-L3-T1 (Prompt Optimizer)
- **可并行任务**: B-L4-T1 (Optimize API)

---

## 任务目标

实现 WebSocket 消息处理,支持优化流程的实时进度推送和 Human-in-the-Loop 确认。

**核心功能**:
- 处理客户端 `human_confirm` 消息
- 实现服务端 broadcast 函数
- 支持 v2.0 所有 WebSocket 消息类型
- 向后兼容 v1.x WebSocket 协议

---

## 实现文件

**文件路径**: `backend/src/websocket/prompt-optimization.js`

---

## 实现步骤

### Step 1: 实现消息处理器

```javascript
// backend/src/websocket/prompt-optimization.js
const logger = require('../utils/logger');
const { handleHumanConfirmation } = require('../services/prompt-optimizer');

/**
 * 处理 human_confirm 消息
 * @param {WebSocket} ws - WebSocket 连接
 * @param {object} data - 消息数据
 */
function handleHumanConfirm(ws, data) {
  const { workspace_id, confirmed } = data;

  logger.info('Received human_confirm message', {
    workspace_id,
    confirmed,
    wsId: ws.id
  });

  // 验证输入
  if (!workspace_id) {
    logger.warn('human_confirm missing workspace_id', { data });
    ws.send(JSON.stringify({
      type: 'error',
      error: 'workspace_id is required for human_confirm'
    }));
    return;
  }

  if (typeof confirmed !== 'boolean') {
    logger.warn('human_confirm missing confirmed boolean', { data });
    ws.send(JSON.stringify({
      type: 'error',
      error: 'confirmed must be a boolean'
    }));
    return;
  }

  // 调用 Prompt Optimizer 处理确认
  const handled = handleHumanConfirmation(workspace_id, confirmed);

  if (!handled) {
    logger.warn('No pending confirmation found for workspace', { workspace_id });
    ws.send(JSON.stringify({
      type: 'error',
      error: 'No pending confirmation for this workspace'
    }));
    return;
  }

  logger.info('Human confirmation handled successfully', {
    workspace_id,
    confirmed
  });

  // 发送确认响应
  ws.send(JSON.stringify({
    type: 'human_confirm_ack',
    workspace_id,
    confirmed
  }));
}

module.exports = {
  handleHumanConfirm
};
```

### Step 2: 集成到 WebSocket Server

```javascript
// backend/src/websocket/server.js (更新)

const WebSocket = require('ws');
const logger = require('../utils/logger');

// ========== v1.x 现有导入 ==========
const { handleWorkspaceCreate } = require('./workspace-create');
const { handleWorkspaceUpdate } = require('./workspace-update');
const { handleWorkspaceDelete } = require('./workspace-delete');
const { handleWorkspaceReorder } = require('./workspace-reorder');

// ========== v2.0 新增导入 ==========
const { handleHumanConfirm } = require('./prompt-optimization');

let wss = null;
const clients = new Map(); // workspaceId -> Set<WebSocket>

/**
 * 初始化 WebSocket 服务器
 */
function initWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  logger.info('WebSocket server initialized');

  wss.on('connection', (ws) => {
    ws.id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('New WebSocket connection', { wsId: ws.id });

    ws.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage);

        logger.debug('WebSocket message received', {
          wsId: ws.id,
          type: message.type,
          workspace_id: message.workspace_id
        });

        // 路由消息到对应处理器
        switch (message.type) {
          // ========== v1.x 现有消息类型 ==========
          case 'workspace.create':
            handleWorkspaceCreate(ws, message.data);
            break;

          case 'workspace.update':
            handleWorkspaceUpdate(ws, message.data);
            break;

          case 'workspace.delete':
            handleWorkspaceDelete(ws, message.data);
            break;

          case 'workspace.reorder':
            handleWorkspaceReorder(ws, message.data);
            break;

          // ========== v2.0 新增消息类型 ==========
          case 'human_confirm':
            handleHumanConfirm(ws, message.data);
            break;

          default:
            logger.warn('Unknown WebSocket message type', {
              wsId: ws.id,
              type: message.type
            });
            ws.send(JSON.stringify({
              type: 'error',
              error: `Unknown message type: ${message.type}`
            }));
        }
      } catch (error) {
        logger.error('WebSocket message handling error', {
          wsId: ws.id,
          error: error.message,
          stack: error.stack
        });

        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed', { wsId: ws.id });

      // 从所有 workspace 订阅中移除
      for (const [workspaceId, wsSet] of clients.entries()) {
        if (wsSet.has(ws)) {
          wsSet.delete(ws);
          logger.debug('Removed ws from workspace subscription', {
            wsId: ws.id,
            workspaceId
          });
        }
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        wsId: ws.id,
        error: error.message
      });
    });
  });

  return wss;
}

/**
 * 广播消息到指定 workspace 的所有订阅者
 * @param {string} workspaceId - Workspace ID
 * @param {object} message - 消息内容
 */
function broadcastToWorkspace(workspaceId, message) {
  const messageStr = JSON.stringify(message);
  const wsSet = clients.get(workspaceId);

  if (!wsSet || wsSet.size === 0) {
    logger.debug('No subscribers for workspace', { workspaceId });

    // v2.0: 即使没有订阅者也继续执行 (优化流程不依赖客户端连接)
    return;
  }

  logger.debug('Broadcasting to workspace subscribers', {
    workspaceId,
    messageType: message.type,
    subscriberCount: wsSet.size
  });

  let successCount = 0;
  let failCount = 0;

  wsSet.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
        successCount++;
      } catch (error) {
        logger.error('Failed to send message to client', {
          wsId: ws.id,
          workspaceId,
          error: error.message
        });
        failCount++;
      }
    } else {
      // 清理已关闭的连接
      wsSet.delete(ws);
      logger.debug('Removed closed connection', {
        wsId: ws.id,
        workspaceId
      });
    }
  });

  logger.debug('Broadcast complete', {
    workspaceId,
    successCount,
    failCount
  });
}

/**
 * 订阅 workspace 更新
 * @param {WebSocket} ws - WebSocket 连接
 * @param {string} workspaceId - Workspace ID
 */
function subscribeToWorkspace(ws, workspaceId) {
  if (!clients.has(workspaceId)) {
    clients.set(workspaceId, new Set());
  }

  clients.get(workspaceId).add(ws);

  logger.debug('WebSocket subscribed to workspace', {
    wsId: ws.id,
    workspaceId,
    totalSubscribers: clients.get(workspaceId).size
  });
}

module.exports = {
  initWebSocketServer,
  broadcastToWorkspace,
  subscribeToWorkspace
};
```

### Step 3: 更新 Server 启动脚本

```javascript
// backend/src/server.js (更新)

const http = require('http');
const app = require('./app');
const { connectDB } = require('./db/mongodb');
const { initWebSocketServer, broadcastToWorkspace } = require('./websocket/server');
const logger = require('./utils/logger');
const config = require('./config');

async function startServer() {
  try {
    // 连接数据库
    await connectDB();
    logger.info('MongoDB connected successfully');

    // 创建 HTTP 服务器
    const server = http.createServer(app);

    // 初始化 WebSocket
    initWebSocketServer(server);

    // ========== v2.0 新增: 注册 wsBroadcast 函数到 app ==========
    app.set('wsBroadcast', broadcastToWorkspace);
    logger.info('WebSocket broadcast function registered to app');

    // 启动服务器
    const PORT = config.serverPort || 3000;

    server.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`WebSocket server ready`);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

startServer();
```

### Step 4: 单元测试

```javascript
// backend/src/websocket/__tests__/prompt-optimization.test.js
const { handleHumanConfirm } = require('../prompt-optimization');
const { handleHumanConfirmation } = require('../../services/prompt-optimizer');

jest.mock('../../services/prompt-optimizer');
jest.mock('../../utils/logger');

describe('WebSocket Prompt Optimization Handler', () => {
  let mockWs;

  beforeEach(() => {
    mockWs = {
      id: 'test-ws-id',
      send: jest.fn()
    };

    jest.clearAllMocks();
  });

  it('should handle human confirmation successfully', () => {
    handleHumanConfirmation.mockReturnValue(true);

    handleHumanConfirm(mockWs, {
      workspace_id: 'test-id',
      confirmed: true
    });

    expect(handleHumanConfirmation).toHaveBeenCalledWith('test-id', true);
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'human_confirm_ack',
        workspace_id: 'test-id',
        confirmed: true
      })
    );
  });

  it('should handle human rejection successfully', () => {
    handleHumanConfirmation.mockReturnValue(true);

    handleHumanConfirm(mockWs, {
      workspace_id: 'test-id',
      confirmed: false
    });

    expect(handleHumanConfirmation).toHaveBeenCalledWith('test-id', false);
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'human_confirm_ack',
        workspace_id: 'test-id',
        confirmed: false
      })
    );
  });

  it('should return error if workspace_id missing', () => {
    handleHumanConfirm(mockWs, {
      confirmed: true
    });

    expect(handleHumanConfirmation).not.toHaveBeenCalled();
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('workspace_id is required')
    );
  });

  it('should return error if confirmed not boolean', () => {
    handleHumanConfirm(mockWs, {
      workspace_id: 'test-id',
      confirmed: 'yes'
    });

    expect(handleHumanConfirmation).not.toHaveBeenCalled();
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('must be a boolean')
    );
  });

  it('should return error if no pending confirmation', () => {
    handleHumanConfirmation.mockReturnValue(false);

    handleHumanConfirm(mockWs, {
      workspace_id: 'test-id',
      confirmed: true
    });

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('No pending confirmation')
    );
  });
});
```

---

## 验收标准

- [ ] 正确处理 `human_confirm` 消息
- [ ] 验证消息格式和必要字段
- [ ] 成功调用 `handleHumanConfirmation` 函数
- [ ] 向客户端发送确认响应 (`human_confirm_ack`)
- [ ] `broadcastToWorkspace` 函数正确注册到 app
- [ ] 兼容 v1.x WebSocket 消息类型
- [ ] 完整的日志记录
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd backend
npm test -- prompt-optimization.test.js
```

---

## 参考文档

- `context/tasks/v2/v2-websocket-protocol.md` - WebSocket 协议设计
- `context/tasks/v2/v2-backend-architecture.md` - WebSocket 层设计
