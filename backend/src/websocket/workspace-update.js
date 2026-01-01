import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleUpdate(ws, data) {
  try {
    const { workspace_id, updates } = data;

    logger.debug(`收到更新请求: workspace_id=${workspace_id}`);
    logger.debug(`更新内容: ${JSON.stringify(updates, null, 2)}`);

    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      workspace_id,
      { $set: { ...updates, updated_at: new Date() } },
      { new: true }
    );

    if (!updatedWorkspace) {
      throw new Error('工作空间不存在');
    }

    logger.info(`工作空间更新成功: ${workspace_id}`);
    logger.debug(`更新后的数据: ${JSON.stringify(updatedWorkspace, null, 2)}`);

    ws.send(JSON.stringify({
      type: 'workspace.sync_confirm',
      workspace_id
    }));
  } catch (error) {
    logger.error('更新失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
