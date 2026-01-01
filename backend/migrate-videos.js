#!/usr/bin/env node

/**
 * 视频数据迁移脚本
 *
 * 功能:
 * 1. 检查所有已完成的视频记录
 * 2. 对于使用远程URL的视频,尝试下载到本地
 * 3. 更新数据库记录
 *
 * 使用方法:
 * node migrate-videos.js
 */

import mongoose from 'mongoose';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config();

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker';

// Workspace Schema
const workspaceSchema = new mongoose.Schema({
  order_index: Number,
  image_path: String,
  image_url: String,
  form_data: mongoose.Schema.Types.Mixed,
  video: {
    status: String,
    task_id: String,
    url: String,
    remote_url: String,
    path: String,
    error: String
  },
  ai_collaboration: Array,
  created_at: Date,
  updated_at: Date
}, { timestamps: true });

const Workspace = mongoose.model('Workspace', workspaceSchema);

// 下载视频到本地
async function downloadVideo(videoUrl, workspaceId) {
  const videosDir = path.join(__dirname, 'uploads', 'videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `${workspaceId}_${timestamp}.mp4`;
  const videoPath = path.join(videosDir, filename);

  console.log(`  下载视频: ${videoUrl} -> ${videoPath}`);

  const response = await axios({
    method: 'GET',
    url: videoUrl,
    responseType: 'stream',
    timeout: 120000
  });

  await pipeline(
    response.data,
    fs.createWriteStream(videoPath)
  );

  const localVideoUrl = `/uploads/videos/${filename}`;
  return { videoPath, localVideoUrl };
}

// 主函数
async function migrateVideos() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    // 查找所有已完成的视频
    const workspaces = await Workspace.find({
      'video.status': 'completed',
      'video.url': { $exists: true, $ne: null }
    });

    console.log(`找到 ${workspaces.length} 个已完成的视频记录\n`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const workspace of workspaces) {
      console.log(`处理工作空间: ${workspace._id}`);
      console.log(`  当前URL: ${workspace.video.url}`);

      // 如果已经是本地路径,跳过
      if (workspace.video.url.startsWith('/uploads/videos/')) {
        console.log(`  ⏭️  已经是本地视频,跳过\n`);
        skipCount++;
        continue;
      }

      // 如果URL不是HTTP开头,可能是旧的相对路径
      if (!workspace.video.url.startsWith('http')) {
        console.log(`  ⚠️  非HTTP URL,跳过: ${workspace.video.url}\n`);
        skipCount++;
        continue;
      }

      try {
        // 下载视频
        const { videoPath, localVideoUrl } = await downloadVideo(
          workspace.video.url,
          workspace._id
        );

        // 更新数据库
        await Workspace.findByIdAndUpdate(workspace._id, {
          'video.url': localVideoUrl,
          'video.remote_url': workspace.video.url,
          'video.path': videoPath,
          'video.error': null,
          updated_at: new Date()
        });

        console.log(`  ✅ 迁移成功: ${localVideoUrl}\n`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ 下载失败: ${error.message}`);

        // 标记错误但保留原URL
        await Workspace.findByIdAndUpdate(workspace._id, {
          'video.error': `迁移失败: ${error.message}`,
          updated_at: new Date()
        });

        console.log(`  保留原始URL作为备用\n`);
        failCount++;
      }
    }

    console.log('========================================');
    console.log('迁移完成!');
    console.log(`总计: ${workspaces.length} 个视频`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    console.log(`跳过: ${skipCount} 个`);
    console.log('========================================');

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 连接已关闭');
  }
}

// 运行迁移
migrateVideos();
