import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';
import config from '../config.js';
import { getAccessUrl } from '../utils/oss.js';

/**
 * 为workspace重新生成签名URL(如果使用私有bucket)
 * 确保前端获取的URL始终有效
 */
async function refreshWorkspaceUrls(workspace) {
  if (!config.oss.usePrivateBucket) {
    // 公开bucket,无需处理
    return workspace;
  }

  // 重新生成图片签名URL
  if (workspace.image_path) {
    const imageObjectName = config.oss.imagePath + workspace.image_path;
    workspace.image_url = await getAccessUrl(imageObjectName);
  }

  // 重新生成视频签名URL
  if (workspace.video?.path) {
    const videoObjectName = config.oss.videoPath + workspace.video.path;
    workspace.video.url = await getAccessUrl(videoObjectName);
  }

  return workspace;
}

export async function getWorkspaces(req, res) {
  try {
    const workspaces = await Workspace.find()
      .sort({ order_index: 1 })
      .lean();

    // 如果使用私有bucket,为所有workspace重新生成签名URL
    if (config.oss.usePrivateBucket) {
      const refreshedWorkspaces = await Promise.all(
        workspaces.map(ws => refreshWorkspaceUrls(ws))
      );
      logger.info(`查询工作空间: ${refreshedWorkspaces.length}个 (已刷新签名URL)`);
      res.json(refreshedWorkspaces);
    } else {
      logger.info(`查询工作空间: ${workspaces.length}个`);
      res.json(workspaces);
    }
  } catch (error) {
    logger.error('查询失败:', error);
    res.status(500).json({ error: error.message });
  }
}
