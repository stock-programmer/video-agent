import { WebSocketServer } from 'ws';
import config from '../config.js';
import logger from '../utils/logger.js';
import { handleCreate } from './workspace-create.js';
import { handleUpdate } from './workspace-update.js';
import { handleDelete } from './workspace-delete.js';
import { handleReorder } from './workspace-reorder.js';

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
