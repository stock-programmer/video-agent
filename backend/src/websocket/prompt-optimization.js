import logger from '../utils/logger.js';
import { handleHumanConfirmation } from '../services/prompt-optimizer.js';

/**
 * WebSocket Prompt Optimization Handler
 *
 * 处理 v2.0 提示词优化流程的 WebSocket 消息：
 * - human_confirm: Human-in-the-Loop 确认消息
 *
 * 注意：这个模块依赖 Prompt Optimizer 服务 (Layer 3)
 * 在集成测试前需要确保 Prompt Optimizer 已实现
 */

/**
 * 处理 human_confirm 消息
 * @param {WebSocket} ws - WebSocket 连接
 * @param {object} data - 消息数据
 */
export function handleHumanConfirm(ws, data) {
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

  // 调用确认处理函数 (从 prompt-optimizer 导入)
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
