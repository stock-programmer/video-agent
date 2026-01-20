import { WebSocketServer } from 'ws';
import config from '../config.js';
import logger from '../utils/logger.js';

// ========== v1.x 现有导入 ==========
import { handleCreate } from './workspace-create.js';
import { handleUpdate } from './workspace-update.js';
import { handleDelete } from './workspace-delete.js';
import { handleReorder } from './workspace-reorder.js';

// ========== v2.0 新增导入 ==========
import { handleHumanConfirm } from './prompt-optimization.js';

let wss = null;
const clients = new Set();

export function startWebSocketServer() {
  wss = new WebSocketServer({ port: config.server.wsPort });

  wss.on('connection', (ws) => {
    // 为每个连接分配唯一 ID (v2.0 新增)
    ws.id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('WebSocket 客户端连接', { wsId: ws.id });
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
      logger.info('WebSocket 客户端断开', { wsId: ws.id });
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
    // ========== v1.x 现有消息类型 ==========
    case 'workspace.create':
      await handleCreate(ws, message.data);
      break;
    case 'workspace.update':
      await handleUpdate(ws, message.data);
      break;
    case 'workspace.delete':
      await handleDelete(ws, message.data);
      break;
    case 'workspace.reorder':
      await handleReorder(ws, message.data);
      break;

    // ========== v2.0 新增消息类型 ==========
    case 'human_confirm':
      // v2.0: human_confirm 消息格式不同，数据在消息顶层而不是data字段
      handleHumanConfirm(ws, message);
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

/**
 * 广播消息到指定 workspace 的客户端
 * 用于 prompt-optimizer 的实时进度推送
 * @param {string} workspaceId - Workspace ID
 * @param {object} message - 消息对象
 */
export function broadcastToWorkspace(workspaceId, message) {
  const data = JSON.stringify({
    workspace_id: workspaceId,
    ...message
  });

  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });

  logger.debug('Broadcast to workspace', {
    workspaceId,
    messageType: message.type,
    clientCount: clients.size
  });
}
