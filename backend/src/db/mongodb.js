import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../utils/logger.js';

// Workspace Schema
const workspaceSchema = new mongoose.Schema({
  order_index: { type: Number, required: true },
  image_path: String,
  image_url: String,
  form_data: {
    camera_movement: String,
    shot_type: String,
    lighting: String,
    motion_prompt: String,
    checkboxes: mongoose.Schema.Types.Mixed
  },
  video: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    task_id: String,
    url: String,          // 本地访问URL (e.g., /uploads/videos/xxx.mp4)
    remote_url: String,   // 原始远程URL (备用)
    path: String,         // 本地文件系统路径
    error: String
  },
  ai_collaboration: [{
    user_input: String,
    ai_suggestion: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  deleted: {
    is_deleted: { type: Boolean, default: false },      // 是否被软删除
    deleted_at: Date,                                     // 删除时间
    original_order_index: Number                          // 原始位置索引(用于恢复)
  }
}, {
  timestamps: true
});

// 创建索引
workspaceSchema.index({ order_index: 1 });
workspaceSchema.index({ 'video.status': 1 });
workspaceSchema.index({ 'deleted.is_deleted': 1 });  // 新增索引优化查询

export const Workspace = mongoose.model('Workspace', workspaceSchema);

// 连接数据库
export async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('MongoDB 连接成功');
  } catch (error) {
    logger.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
}

// 断开连接
export async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('MongoDB 连接已断开');
}
