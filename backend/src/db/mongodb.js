import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../utils/logger.js';

// Workspace Schema
const workspaceSchema = new mongoose.Schema({
  order_index: { type: Number, required: true },
  image_path: String,
  image_url: String,
  form_data: {
    // ===== v1.0 字段 =====
    camera_movement: String,
    shot_type: String,
    lighting: String,
    motion_prompt: String,
    checkboxes: mongoose.Schema.Types.Mixed,

    // ===== v1.1 新增字段 =====
    duration: {
      type: Number,
      default: 5,  // API最小值
      enum: [5, 10, 15]  // Qwen API支持的值
    },
    aspect_ratio: {
      type: String,
      default: '16:9',
      enum: ['16:9', '9:16', '1:1', '4:3']
    },
    motion_intensity: {
      type: Number,
      default: 3,  // 中等强度
      min: 1,
      max: 5
    },
    quality_preset: {
      type: String,
      default: 'standard',
      enum: ['draft', 'standard', 'high']
    },

    // ===== v1.2 新增字段 =====
    angle: String,       // 视角 - 支持自由输入
    frame_rate: String   // 帧率 - 支持自由输入
  },
  video: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    task_id: String,
    url: String,          // 阿里云 OSS 公开 URL (e.g., https://bucket.oss-region.aliyuncs.com/uploads/videos/xxx.mp4)
    remote_url: String,   // 原始远程 URL (Qwen CDN URL, 备用)
    path: String,         // 文件名 (e.g., workspace_id_timestamp.mp4)
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
  },

  // ========== v2.0 新增字段: Prompt Optimization History ==========
  optimization_history: [{
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },

    // 意图报告 (Intent Analysis Agent 输出)
    intent_report: {
      user_intent: {
        scene_description: String,
        desired_mood: String,
        key_elements: [String],
        motion_expectation: String,
        energy_level: String
      },
      parameter_analysis: {
        aligned: [String],
        potential_issues: [String]
      },
      confidence: Number
    },

    // 视频分析 (Video Analysis Agent 输出)
    video_analysis: {
      content_match_score: Number,
      issues: [{
        category: String,
        description: String,
        severity: {
          type: String,
          enum: ['high', 'medium', 'low']
        },
        affected_parameter: String
      }],
      technical_quality: {
        resolution: String,
        clarity_score: Number,
        fluency_score: Number,
        artifacts: String
      },
      strengths: [String],
      overall_assessment: String
    },

    // 优化结果 (Master Agent 输出)
    optimization_result: {
      ng_reasons: [String],
      optimized_params: mongoose.Schema.Types.Mixed, // 只包含被修改的参数
      changes: [{
        field: String,
        old_value: mongoose.Schema.Types.Mixed,
        new_value: mongoose.Schema.Types.Mixed,
        reason: String
      }],
      confidence: Number
    },

    // ========== v2.0.1 新增字段: 详细分析步骤和思考过程 ==========
    // 分析步骤 (所有Agent的详细步骤)
    analysis_steps: [{
      agent: String,                      // agent名称: intent_analysis, video_analysis, master
      phase: String,                      // 步骤阶段: visual_analysis, llm_inference等
      title: String,                      // 步骤标题（中文展示）
      description: String,                // 步骤详细说明
      status: {
        type: String,
        enum: ['running', 'completed']
      },
      result: mongoose.Schema.Types.Mixed, // 步骤结果（可选）
      timestamp: Date
    }],

    // AI思考过程 (关键决策点的内部推理)
    thoughts: [{
      agent: String,                      // agent名称
      thought: String,                    // 思考内容
      timestamp: Date
    }],

    // 用户操作记录
    user_action: {
      type: String,
      enum: ['applied', 'rejected', 'modified', 'pending'],
      default: 'pending'
    },
    applied_at: Date
  }]
}, {
  timestamps: true
});

// 创建索引
workspaceSchema.index({ order_index: 1 });
workspaceSchema.index({ 'video.status': 1 });
workspaceSchema.index({ 'deleted.is_deleted': 1 });  // 软删除查询优化

// v2.0 新增索引 (优化 Prompt Optimization 查询)
workspaceSchema.index({ 'optimization_history.timestamp': -1 });  // 按时间查询优化历史
workspaceSchema.index({ 'optimization_history.user_action': 1, createdAt: -1 });  // 按用户操作和创建时间查询

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
