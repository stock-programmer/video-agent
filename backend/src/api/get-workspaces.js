import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function getWorkspaces(req, res) {
  try {
    const workspaces = await Workspace.find()
      .sort({ order_index: 1 })
      .lean();

    logger.info(`查询工作空间: ${workspaces.length}个`);
    res.json(workspaces);
  } catch (error) {
    logger.error('查询失败:', error);
    res.status(500).json({ error: error.message });
  }
}
