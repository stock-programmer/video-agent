import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleDelete(ws, data) {
  try {
    const { workspace_id } = data;

    await Workspace.findByIdAndDelete(workspace_id);

    logger.info(`工作空间删除: ${workspace_id}`);

    ws.send(JSON.stringify({
      type: 'workspace.deleted',
      workspace_id
    }));
  } catch (error) {
    logger.error('删除失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
