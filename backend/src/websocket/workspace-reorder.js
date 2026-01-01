import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleReorder(ws, data) {
  try {
    const { new_order } = data; // [{id, order_index}, ...]

    const bulkOps = new_order.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order_index: item.order_index } }
      }
    }));

    await Workspace.bulkWrite(bulkOps);

    logger.info(`工作空间排序完成: ${new_order.length}个`);

    ws.send(JSON.stringify({
      type: 'workspace.reorder_confirm'
    }));
  } catch (error) {
    logger.error('排序失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
