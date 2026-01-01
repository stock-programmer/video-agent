import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleCreate(ws, data) {
  try {
    // 计算新的 order_index
    const maxOrder = await Workspace.findOne().sort({ order_index: -1 });
    const newOrder = (maxOrder?.order_index || 0) + 1;

    const workspace = await Workspace.create({
      order_index: newOrder,
      ...data
    });

    logger.info(`工作空间创建成功: ${workspace._id}`);

    ws.send(JSON.stringify({
      type: 'workspace.created',
      data: workspace
    }));
  } catch (error) {
    logger.error('创建失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
