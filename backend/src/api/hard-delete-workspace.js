import fs from 'fs/promises';
import path from 'path';
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

/**
 * 硬删除工作空间 API
 * DELETE /api/workspace/:id/hard-delete
 *
 * 功能:
 * 1. 删除数据库记录
 * 2. 删除关联的图片文件
 * 3. 删除关联的视频文件
 */
export async function hardDeleteWorkspace(req, res) {
  try {
    const { id } = req.params;

    logger.info(`开始硬删除工作空间: ${id}`);

    // 1. 查找工作空间
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: '工作空间不存在'
      });
    }

    // 2. 删除图片文件
    if (workspace.image_path) {
      try {
        const imagePath = path.resolve(workspace.image_path);
        await fs.unlink(imagePath);
        logger.info(`已删除图片文件: ${imagePath}`);
      } catch (error) {
        logger.warn(`删除图片失败 (文件可能已不存在): ${error.message}`);
      }
    }

    // 3. 删除视频文件
    if (workspace.video?.path) {
      try {
        const videoPath = path.resolve(workspace.video.path);
        await fs.unlink(videoPath);
        logger.info(`已删除视频文件: ${videoPath}`);
      } catch (error) {
        logger.warn(`删除视频失败 (文件可能已不存在): ${error.message}`);
      }
    }

    // 4. 从数据库删除记录
    await Workspace.findByIdAndDelete(id);
    logger.info(`已删除数据库记录: ${id}`);

    res.json({
      success: true,
      message: '工作空间已永久删除'
    });
  } catch (error) {
    logger.error('硬删除工作空间失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
