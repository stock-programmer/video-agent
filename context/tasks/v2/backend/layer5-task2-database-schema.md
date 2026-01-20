# Backend Layer 5 Task 2: 数据库 Schema 更新

## 任务元数据

- **任务 ID**: `backend-v2-layer5-task2`
- **任务名称**: 数据库 Schema 更新
- **所属层级**: Layer 5 - 错误处理与日志
- **预计工时**: 2 小时
- **依赖任务**: 无 (可独立完成)
- **可并行任务**: B-L5-T1 (Error Handling)

---

## 任务目标

更新 MongoDB Workspace schema,添加 v2.0 优化历史字段。

**核心功能**:
- 添加 `optimization_history` 字段
- 确保向后兼容 (v1.x workspaces 不受影响)
- 创建数据库迁移脚本
- 添加索引优化查询

---

## 实现文件

**更新文件**:
- `backend/src/db/mongodb.js`

**新增文件**:
- `backend/src/db/migrations/add-optimization-history.js`

---

## 实现步骤

### Step 1: 更新 Workspace Schema

```javascript
// backend/src/db/mongodb.js (更新 Workspace Schema)

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const workspaceSchema = new mongoose.Schema({
  // ========== v1.x 现有字段 ==========
  order_index: {
    type: Number,
    required: true,
    index: true
  },
  image_path: {
    type: String,
    required: true
  },
  image_url: {
    type: String,
    required: true
  },
  form_data: {
    // v1.0 fields
    camera_movement: String,
    shot_type: String,
    lighting: String,
    motion_prompt: String,
    checkboxes: Object,

    // v1.1 fields (added Jan 2025)
    duration: {
      type: Number,
      default: 5
    },
    aspect_ratio: {
      type: String,
      default: '16:9'
    },
    motion_intensity: {
      type: Number,
      default: 3
    },
    quality_preset: {
      type: String,
      default: 'standard'
    }
  },
  video: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    task_id: String,
    url: String,
    error: String
  },
  ai_collaboration: [{
    type: {
      type: String,
      enum: ['suggestion', 'critique', 'alternative']
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // ========== v2.0 新增字段 ==========
  optimization_history: [{
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },

    // 意图报告
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

    // 视频分析
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

    // 优化结果
    optimization_result: {
      ng_reasons: [String],
      optimized_params: Object, // 只包含被修改的参数
      changes: [{
        field: String,
        old_value: mongoose.Schema.Types.Mixed,
        new_value: mongoose.Schema.Types.Mixed,
        reason: String
      }],
      confidence: Number
    },

    // 用户操作
    user_action: {
      type: String,
      enum: ['applied', 'rejected', 'modified'],
      default: 'applied'
    },
    applied_at: Date
  }],

  // ========== 时间戳 ==========
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  // 自动更新 updated_at
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// 索引 (优化查询性能)
workspaceSchema.index({ order_index: 1 });
workspaceSchema.index({ 'video.status': 1 });
workspaceSchema.index({ 'optimization_history.timestamp': -1 }); // v2.0 新增
workspaceSchema.index({ created_at: -1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);

/**
 * 连接 MongoDB
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker';

  try {
    await mongoose.connect(uri, {
      // MongoDB 6+ 不需要这些选项
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });

    logger.info('MongoDB connected successfully', {
      uri: uri.replace(/\/\/.*@/, '//***:***@'), // 隐藏密码
      database: mongoose.connection.name
    });

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  connectDB,
  Workspace
};
```

### Step 2: 创建数据库迁移脚本

```javascript
// backend/src/db/migrations/add-optimization-history.js

/**
 * 数据库迁移脚本: 添加 optimization_history 字段
 *
 * 用途: 为所有现有 workspaces 添加空的 optimization_history 数组
 * 注意: 这是可选的,因为 MongoDB schema 会自动处理 undefined 字段
 *       但明确添加可以提高查询一致性
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

async function migrateOptimizationHistory() {
  logger.info('Starting optimization_history migration...');

  try {
    // 连接数据库
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker'
    );

    logger.info('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('workspaces');

    // 统计需要迁移的文档
    const totalCount = await collection.countDocuments({});
    const needsMigrationCount = await collection.countDocuments({
      optimization_history: { $exists: false }
    });

    logger.info('Migration statistics', {
      totalWorkspaces: totalCount,
      needsMigration: needsMigrationCount
    });

    if (needsMigrationCount === 0) {
      logger.info('No workspaces need migration');
      return;
    }

    // 执行迁移
    const result = await collection.updateMany(
      { optimization_history: { $exists: false } },
      { $set: { optimization_history: [] } }
    );

    logger.info('Migration completed', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

    // 验证迁移结果
    const remainingCount = await collection.countDocuments({
      optimization_history: { $exists: false }
    });

    if (remainingCount > 0) {
      logger.warn('Some documents were not migrated', {
        remainingCount
      });
    } else {
      logger.info('All documents migrated successfully');
    }

  } catch (error) {
    logger.error('Migration failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// 执行迁移 (如果直接运行此文件)
if (require.main === module) {
  migrateOptimizationHistory()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateOptimizationHistory };
```

### Step 3: 创建索引优化脚本

```javascript
// backend/src/db/migrations/create-indexes.js

/**
 * 创建数据库索引
 *
 * 用途: 为 v2.0 新增的查询模式创建优化索引
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

async function createIndexes() {
  logger.info('Creating database indexes...');

  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker'
    );

    logger.info('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('workspaces');

    // 获取现有索引
    const existingIndexes = await collection.indexes();
    logger.info('Existing indexes', {
      count: existingIndexes.length,
      names: existingIndexes.map(idx => idx.name)
    });

    // 创建新索引
    const indexesToCreate = [
      {
        key: { 'optimization_history.timestamp': -1 },
        name: 'optimization_history_timestamp_-1',
        background: true
      },
      {
        key: { 'optimization_history.user_action': 1, created_at: -1 },
        name: 'optimization_user_action_created_at',
        background: true
      }
    ];

    for (const indexSpec of indexesToCreate) {
      try {
        await collection.createIndex(indexSpec.key, {
          name: indexSpec.name,
          background: indexSpec.background
        });

        logger.info('Index created', {
          name: indexSpec.name,
          key: indexSpec.key
        });
      } catch (error) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          logger.warn('Index already exists', { name: indexSpec.name });
        } else {
          throw error;
        }
      }
    }

    // 显示最终索引列表
    const finalIndexes = await collection.indexes();
    logger.info('Final indexes', {
      count: finalIndexes.length,
      names: finalIndexes.map(idx => idx.name)
    });

    logger.info('Index creation completed successfully');

  } catch (error) {
    logger.error('Index creation failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log('✅ Indexes created successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Index creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createIndexes };
```

### Step 4: 添加迁移命令到 package.json

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",

    "migrate:optimization-history": "node src/db/migrations/add-optimization-history.js",
    "migrate:indexes": "node src/db/migrations/create-indexes.js",
    "migrate:all": "npm run migrate:optimization-history && npm run migrate:indexes"
  }
}
```

### Step 5: Schema 测试

```javascript
// backend/src/db/__tests__/workspace-schema.test.js
const mongoose = require('mongoose');
const { Workspace } = require('../mongodb');

describe('Workspace Schema v2.0', () => {
  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker-test'
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Workspace.deleteMany({});
  });

  it('should create workspace with optimization_history field', async () => {
    const workspace = await Workspace.create({
      order_index: 1,
      image_path: '/uploads/test.jpg',
      image_url: 'http://localhost/test.jpg',
      form_data: { motion_intensity: 3 }
    });

    expect(workspace.optimization_history).toBeDefined();
    expect(workspace.optimization_history).toEqual([]);
  });

  it('should add optimization record to history', async () => {
    const workspace = await Workspace.create({
      order_index: 1,
      image_path: '/uploads/test.jpg',
      image_url: 'http://localhost/test.jpg',
      form_data: { motion_intensity: 3 }
    });

    const optimizationRecord = {
      timestamp: new Date(),
      intent_report: {
        user_intent: {
          scene_description: 'Test scene',
          desired_mood: 'calm',
          key_elements: ['person'],
          motion_expectation: 'slow'
        },
        confidence: 0.85
      },
      video_analysis: {
        content_match_score: 0.75,
        issues: [],
        technical_quality: {
          clarity_score: 0.85,
          fluency_score: 0.75
        },
        overall_assessment: 'Good'
      },
      optimization_result: {
        ng_reasons: ['Motion too fast'],
        optimized_params: { motion_intensity: 2 },
        changes: [
          {
            field: 'motion_intensity',
            old_value: 3,
            new_value: 2,
            reason: 'Reduce speed'
          }
        ],
        confidence: 0.85
      },
      user_action: 'applied'
    };

    await Workspace.findByIdAndUpdate(
      workspace._id,
      { $push: { optimization_history: optimizationRecord } }
    );

    const updated = await Workspace.findById(workspace._id);
    expect(updated.optimization_history).toHaveLength(1);
    expect(updated.optimization_history[0].intent_report.confidence).toBe(0.85);
  });

  it('should work with v1.x workspaces (backward compatibility)', async () => {
    // 模拟 v1.x workspace (没有 optimization_history)
    const collection = mongoose.connection.collection('workspaces');

    await collection.insertOne({
      order_index: 1,
      image_path: '/uploads/test.jpg',
      image_url: 'http://localhost/test.jpg',
      form_data: { motion_intensity: 3 },
      video: { status: 'pending' }
      // 注意: 没有 optimization_history 字段
    });

    const workspaces = await Workspace.find({});
    expect(workspaces).toHaveLength(1);

    // Mongoose 会自动处理缺失字段
    const workspace = workspaces[0];
    expect(workspace.optimization_history).toBeUndefined(); // 或 []
  });

  it('should query optimization history by timestamp', async () => {
    const workspace = await Workspace.create({
      order_index: 1,
      image_path: '/uploads/test.jpg',
      image_url: 'http://localhost/test.jpg',
      form_data: { motion_intensity: 3 },
      optimization_history: [
        {
          timestamp: new Date('2025-01-01'),
          intent_report: { confidence: 0.8 },
          video_analysis: { content_match_score: 0.7 },
          optimization_result: { confidence: 0.8 }
        },
        {
          timestamp: new Date('2025-01-15'),
          intent_report: { confidence: 0.9 },
          video_analysis: { content_match_score: 0.8 },
          optimization_result: { confidence: 0.9 }
        }
      ]
    });

    // 查询最近的优化记录
    const result = await Workspace.findOne(
      { _id: workspace._id },
      { optimization_history: { $slice: -1 } }
    );

    expect(result.optimization_history).toHaveLength(1);
    expect(result.optimization_history[0].intent_report.confidence).toBe(0.9);
  });
});
```

---

## 验收标准

- [ ] `optimization_history` 字段添加到 Workspace schema
- [ ] 字段结构完整 (intent_report, video_analysis, optimization_result)
- [ ] 向后兼容 v1.x workspaces
- [ ] 迁移脚本可正常运行
- [ ] 索引创建脚本可正常运行
- [ ] 可以查询和更新优化历史
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
# 运行 Schema 测试
cd backend
npm test -- workspace-schema.test.js

# 运行迁移 (可选)
npm run migrate:all
```

---

## 参考文档

- `context/tasks/v2/v2-database-schema.md` - 数据库设计
- `context/tasks/v2/v2-backend-architecture.md` - 数据库层设计
