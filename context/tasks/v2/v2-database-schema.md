# v2.0 数据库变更文档

## 文档概述

本文档描述 v2.0 版本对 MongoDB 数据库 Schema 的变更,包括新增字段、索引、迁移策略。

---

## Schema 变更

### Workspace Collection

**集合名**: `workspaces`

**变更类型**: 新增字段 (向后兼容)

---

#### 新增字段: optimization_history

**字段名**: `optimization_history`

**类型**: `Array<OptimizationRecord>`

**默认值**: `[]` (空数组)

**说明**: 存储工作空间的提示词优化历史记录

**Schema 定义**:
```javascript
optimization_history: [
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },

    // 意图分析结果
    intent_report: {
      user_intent: {
        scene_description: { type: String, required: true },
        desired_mood: { type: String, required: true },
        key_elements: [{ type: String }],
        motion_expectation: { type: String, required: true },
        energy_level: String
      },
      parameter_analysis: {
        aligned: [String],
        potential_issues: [String]
      },
      confidence: { type: Number, min: 0, max: 1 }
    },

    // 视频分析结果
    video_analysis: {
      content_match_score: { type: Number, min: 0, max: 10 },
      issues: [
        {
          category: String,
          description: String,
          severity: { type: String, enum: ['high', 'medium', 'low'] },
          affected_parameter: String
        }
      ],
      technical_quality: {
        resolution: String,
        clarity_score: Number,
        fluency_score: Number,
        artifacts: String
      },
      strengths: [String],
      overall_assessment: String
    },

    // 优化变更列表
    changes: [
      {
        field: { type: String, required: true },
        old_value: mongoose.Schema.Types.Mixed,
        new_value: mongoose.Schema.Types.Mixed,
        reason: { type: String, required: true }
      }
    ],

    // NG 原因
    ng_reasons: [String],

    // 优化置信度
    confidence: { type: Number, min: 0, max: 1 },

    // 是否已应用到 form_data
    applied: { type: Boolean, default: false }
  }
]
```

---

#### 完整 Workspace Schema (v2.0)

```javascript
// backend/src/db/mongodb.js
const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  // ========== v1.0 字段 ==========
  order_index: {
    type: Number,
    required: true
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
    // v1.0 字段
    camera_movement: String,
    shot_type: String,
    lighting: String,
    motion_prompt: String,
    checkboxes: Object,

    // v1.1 字段
    duration: {
      type: Number,
      default: 5,
      enum: [5, 10, 15]
    },
    aspect_ratio: {
      type: String,
      default: '16:9',
      enum: ['16:9', '9:16', '1:1', '4:3']
    },
    motion_intensity: {
      type: Number,
      default: 3,
      min: 1,
      max: 5
    },
    quality_preset: {
      type: String,
      default: 'standard',
      enum: ['draft', 'standard', 'high']
    }
  },

  video: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    task_id: String,
    url: String,
    error: String
  },

  ai_collaboration: [
    {
      suggestion: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // ========== v2.0 新增字段 ==========
  optimization_history: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
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
      video_analysis: {
        content_match_score: Number,
        issues: [
          {
            category: String,
            description: String,
            severity: String,
            affected_parameter: String
          }
        ],
        technical_quality: {
          resolution: String,
          clarity_score: Number,
          fluency_score: Number,
          artifacts: String
        },
        strengths: [String],
        overall_assessment: String
      },
      changes: [
        {
          field: String,
          old_value: mongoose.Schema.Types.Mixed,
          new_value: mongoose.Schema.Types.Mixed,
          reason: String
        }
      ],
      ng_reasons: [String],
      confidence: Number,
      applied: {
        type: Boolean,
        default: false
      }
    }
  ]
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});

// 索引
WorkspaceSchema.index({ order_index: 1 });
WorkspaceSchema.index({ 'video.status': 1 });
WorkspaceSchema.index({ 'optimization_history.timestamp': -1 });  // v2.0 新增

const Workspace = mongoose.model('Workspace', WorkspaceSchema);

module.exports = { Workspace };
```

---

## 索引设计

### 现有索引 (v1.x)

```javascript
// 排序查询
{ order_index: 1 }

// 视频生成任务轮询
{ 'video.status': 1 }
```

### 新增索引 (v2.0)

```javascript
// 按时间查询优化历史
{ 'optimization_history.timestamp': -1 }
```

**创建索引 (自动)**:
```javascript
// MongoDB 启动时自动创建
WorkspaceSchema.index({ 'optimization_history.timestamp': -1 });
```

**手动创建 (生产环境)**:
```javascript
// 使用 MongoDB Shell
db.workspaces.createIndex({ 'optimization_history.timestamp': -1 });
```

---

## 数据迁移

### 向后兼容性

**设计原则**: 新增字段为可选,默认空数组

**无需迁移**: 现有 v1.x 工作空间自动兼容 v2.0

**字段初始化**:
```javascript
// 查询时自动补全
const workspace = await Workspace.findById(workspace_id);

// 如果 optimization_history 不存在,Mongoose 自动返回 []
console.log(workspace.optimization_history);  // [] (空数组)
```

### 迁移脚本 (可选)

**场景**: 显式初始化所有现有工作空间的 `optimization_history` 字段

**脚本**: `backend/migrate-v2.js`

```javascript
// backend/migrate-v2.js
const mongoose = require('mongoose');
const { Workspace } = require('./src/db/mongodb');
require('dotenv').config();

async function migrateToV2() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 更新所有没有 optimization_history 字段的工作空间
    const result = await Workspace.updateMany(
      { optimization_history: { $exists: false } },
      { $set: { optimization_history: [] } }
    );

    console.log(`Migration complete. Updated ${result.modifiedCount} workspaces.`);

    // 验证
    const count = await Workspace.countDocuments({ optimization_history: { $exists: true } });
    console.log(`Total workspaces with optimization_history: ${count}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrateToV2();
```

**运行迁移**:
```bash
cd backend
node migrate-v2.js
```

---

## 数据操作示例

### 1. 保存优化结果

```javascript
// backend/src/services/prompt-optimizer.js
async function saveOptimizationResult(workspaceId, optimizationResult) {
  const { intent_report, video_analysis, changes, ng_reasons, confidence } = optimizationResult;

  await Workspace.findByIdAndUpdate(
    workspaceId,
    {
      // 应用优化后的参数到 form_data
      $set: {
        'form_data.motion_intensity': changes.find(c => c.field === 'motion_intensity')?.new_value,
        'form_data.camera_movement': changes.find(c => c.field === 'camera_movement')?.new_value,
        'form_data.motion_prompt': changes.find(c => c.field === 'motion_prompt')?.new_value
      },

      // 追加优化历史记录
      $push: {
        optimization_history: {
          timestamp: new Date(),
          intent_report,
          video_analysis,
          changes,
          ng_reasons,
          confidence,
          applied: true
        }
      }
    }
  );

  console.log(`Optimization result saved for workspace ${workspaceId}`);
}
```

### 2. 查询优化历史

```javascript
// 获取工作空间最近一次优化
const workspace = await Workspace.findById(workspace_id);
const latestOptimization = workspace.optimization_history[workspace.optimization_history.length - 1];

console.log('Latest optimization:', latestOptimization);
```

```javascript
// 获取最近 N 次优化
const workspace = await Workspace.findById(workspace_id)
  .select('optimization_history')
  .sort({ 'optimization_history.timestamp': -1 })
  .limit(5);
```

### 3. 统计优化次数

```javascript
// 统计某工作空间的优化次数
const workspace = await Workspace.findById(workspace_id);
const optimizationCount = workspace.optimization_history.length;

console.log(`Workspace ${workspace_id} optimized ${optimizationCount} times`);
```

### 4. 删除优化历史 (可选)

```javascript
// 清空某工作空间的优化历史
await Workspace.findByIdAndUpdate(
  workspace_id,
  { $set: { optimization_history: [] } }
);
```

---

## 数据大小估算

### 单条优化记录大小

```
intent_report: ~500 bytes
video_analysis: ~800 bytes
changes: ~300 bytes (3个字段)
ng_reasons: ~200 bytes
metadata: ~100 bytes
─────────────────────────
Total: ~2KB per record
```

### 存储容量预估

**假设**:
- 每个工作空间平均优化 3 次
- 1000 个工作空间

**存储大小**:
```
1000 workspaces × 3 optimizations × 2KB = 6MB
```

**结论**: 存储开销极小,无需担心

---

## 数据清理策略 (可选)

**场景**: 长期运行后优化历史过多

**方案 1**: 限制历史记录数量
```javascript
// 只保留最近 10 次优化
WorkspaceSchema.pre('save', function(next) {
  if (this.optimization_history.length > 10) {
    this.optimization_history = this.optimization_history.slice(-10);
  }
  next();
});
```

**方案 2**: TTL 索引自动删除
```javascript
// 90 天后自动删除优化记录
WorkspaceSchema.index(
  { 'optimization_history.timestamp': 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);
```

**推荐**: v2.0 暂不实现,v2.1+ 根据实际需求添加

---

## 数据验证

### Mongoose Schema Validation

**自动验证**:
- `timestamp`: 必填,自动生成
- `changes[].field`: 必填
- `changes[].reason`: 必填
- `confidence`: 0-1 范围
- `video_analysis.content_match_score`: 0-10 范围

**手动验证 (业务层)**:
```javascript
function validateOptimizationResult(result) {
  if (!result.ng_reasons || result.ng_reasons.length === 0) {
    throw new Error('ng_reasons is required');
  }

  if (!result.changes || result.changes.length === 0) {
    throw new Error('changes is required');
  }

  if (result.confidence < 0 || result.confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }
}
```

---

## 备份与恢复

### 备份策略

**生产环境**: 使用 MongoDB Atlas 自动备份

**本地开发**: 手动备份

```bash
# 备份 workspaces 集合
mongodump --uri="mongodb://localhost:27017/video-maker" --collection=workspaces --out=backup/

# 恢复
mongorestore --uri="mongodb://localhost:27017/video-maker" backup/video-maker/workspaces.bson
```

---

## 测试

### 数据库操作测试

```javascript
// __tests__/db/optimization-history.test.js
const mongoose = require('mongoose');
const { Workspace } = require('../../src/db/mongodb');

describe('Optimization History Storage', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should save optimization result to history', async () => {
    // 创建测试工作空间
    const workspace = await Workspace.create({
      order_index: 0,
      image_path: '/uploads/test.jpg',
      image_url: '/uploads/test.jpg',
      form_data: { motion_intensity: 3 },
      video: { status: 'completed', url: '/uploads/test.mp4' }
    });

    // 添加优化历史
    workspace.optimization_history.push({
      timestamp: new Date(),
      intent_report: { /* ... */ },
      changes: [
        { field: 'motion_intensity', old_value: 3, new_value: 2, reason: 'test' }
      ],
      ng_reasons: ['Test reason'],
      confidence: 0.8,
      applied: true
    });

    await workspace.save();

    // 验证
    const updated = await Workspace.findById(workspace._id);
    expect(updated.optimization_history).toHaveLength(1);
    expect(updated.optimization_history[0].ng_reasons[0]).toBe('Test reason');
  });

  it('should support multiple optimizations', async () => {
    const workspace = await Workspace.create({ /* ... */ });

    // 添加多次优化
    for (let i = 0; i < 3; i++) {
      workspace.optimization_history.push({
        timestamp: new Date(),
        changes: [],
        ng_reasons: [`Reason ${i}`],
        confidence: 0.8
      });
    }

    await workspace.save();

    const updated = await Workspace.findById(workspace._id);
    expect(updated.optimization_history).toHaveLength(3);
  });
});
```

---

## 性能影响

### 查询性能

**影响**: 微小
- `optimization_history` 数组通常 < 10 条记录
- 查询时不默认加载历史 (可使用 `.select()` 排除)

**优化**:
```javascript
// 查询时排除优化历史 (节省带宽)
const workspace = await Workspace.findById(workspace_id)
  .select('-optimization_history');
```

### 写入性能

**影响**: 微小
- `$push` 操作高效 (O(1))
- 索引数量不变

---

## 下一步

阅读相关文档:
- **开发计划**: `v2-development-plan.md`
- **架构总览**: `v2-architecture-overview.md`
