# 数据库设计

## 文档信息
- **版本号**：v1.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段设计

---

## 数据库选型

### MongoDB

**选型理由：**

1. **灵活的Schema设计**
   - 文档型数据库，无需预定义严格的表结构
   - 适合快速迭代和需求变化
   - 嵌套对象和数组支持（form_data, ai_collaboration）

2. **JSON原生支持**
   - 前后端数据格式统一
   - 无需复杂的ORM映射

3. **水平扩展能力**
   - 虽然MVP单机部署，但为未来扩展预留空间
   - 支持分片和副本集

4. **开发效率**
   - Mongoose ODM 提供友好的API
   - 丰富的查询和聚合功能

---

## Collection 设计

### workspaces Collection

**用途：** 存储所有工作空间数据

**Schema 定义（Mongoose）：**

```javascript
const WorkspaceSchema = new mongoose.Schema({
  // 排序顺序
  order_index: {
    type: Number,
    required: true,
    default: 0,
    index: true  // 索引：支持快速排序查询
  },

  // 图片信息
  image_path: {
    type: String,
    required: false,  // 创建时可以没有图片
    comment: '本地存储路径 (uploads/abc123.jpg)'
  },

  image_url: {
    type: String,
    required: false,
    comment: '访问URL (/api/uploads/abc123.jpg)'
  },

  // 表单数据
  form_data: {
    camera_movement: {
      type: String,
      enum: ['推进', '拉远', '环绕', '横移', '升降', '跟随'],
      default: null
    },

    shot_type: {
      type: String,
      enum: ['远景', '全景', '中景', '近景', '特写', '大特写'],
      default: null
    },

    lighting: {
      type: String,
      enum: ['自然光', '柔光', '硬光', '逆光', '顶光', '侧光'],
      default: null
    },

    motion_prompt: {
      type: String,
      maxlength: 500,
      default: ''
    },

    checkboxes: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },

  // 视频生成相关
  video: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending',
      index: true  // 索引：支持按状态筛选（轮询任务管理）
    },

    task_id: {
      type: String,
      default: null,
      comment: '第三方API任务ID'
    },

    url: {
      type: String,
      default: null,
      comment: '生成的视频URL'
    },

    error: {
      type: String,
      default: null,
      comment: '错误信息（如果失败）'
    },

    provider: {
      type: String,
      enum: ['runway', 'pika', 'kling'],
      default: null,
      comment: '使用的服务商'
    },

    generated_at: {
      type: Date,
      default: null,
      comment: '生成完成时间'
    }
  },

  // AI协作历史
  ai_collaboration: [{
    user_input: {
      type: String,
      required: true
    },

    ai_suggestion: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 时间戳
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updated_at: {
    type: Date,
    default: Date.now
  }
});

// 更新时自动修改 updated_at
WorkspaceSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// 自动更新 updated_at（findOneAndUpdate 等操作）
WorkspaceSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: new Date() });
  next();
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
```

---

## 索引设计

### 主键索引

```javascript
// MongoDB 自动创建
_id: ObjectId (unique, indexed)
```

---

### 业务索引

#### 1. order_index 索引

**用途：** 支持快速排序查询

```javascript
{
  order_index: 1
}
```

**查询示例：**
```javascript
// 获取所有工作空间，按顺序排序
Workspace.find().sort({ order_index: 1 });
```

---

#### 2. video.status 索引

**用途：** 支持按状态筛选（轮询任务管理）

```javascript
{
  'video.status': 1
}
```

**查询示例：**
```javascript
// 查询所有正在生成中的任务
Workspace.find({ 'video.status': 'generating' });
```

---

### 复合索引（未来扩展）

**多用户场景：**
```javascript
{
  user_id: 1,
  order_index: 1
}
```

**时间范围查询：**
```javascript
{
  created_at: -1
}
```

---

## 数据示例

### 完整的 Workspace 文档

```json
{
  "_id": "676a12b3c4d5e6f7a8b9c0d1",
  "order_index": 0,

  "image_path": "uploads/abc123-def456.jpg",
  "image_url": "/api/uploads/abc123-def456.jpg",

  "form_data": {
    "camera_movement": "推进",
    "shot_type": "特写",
    "lighting": "自然光",
    "motion_prompt": "人物缓慢转身，眼神看向镜头",
    "checkboxes": {
      "slow_motion": true,
      "loop": false
    }
  },

  "video": {
    "status": "completed",
    "task_id": "runway_task_abc123",
    "url": "https://cdn.runwayml.com/videos/abc123.mp4",
    "error": null,
    "provider": "runway",
    "generated_at": "2025-12-24T01:30:00.000Z"
  },

  "ai_collaboration": [
    {
      "user_input": "帮我优化运镜",
      "ai_suggestion": {
        "camera_movement": "环绕",
        "reasoning": "环绕运镜可以更好地展现主体的空间感和立体感"
      },
      "timestamp": "2025-12-24T00:15:00.000Z"
    },
    {
      "user_input": "提示词怎么写更好",
      "ai_suggestion": {
        "motion_prompt": "人物缓慢转身，眼神坚定地看向镜头，微风吹动头发",
        "reasoning": "增加了动作细节和环境元素，让画面更生动"
      },
      "timestamp": "2025-12-24T00:20:00.000Z"
    }
  ],

  "created_at": "2025-12-24T00:00:00.000Z",
  "updated_at": "2025-12-24T01:30:00.000Z"
}
```

---

### 新创建的空 Workspace

```json
{
  "_id": "676a12b3c4d5e6f7a8b9c0d2",
  "order_index": 1,

  "image_path": null,
  "image_url": null,

  "form_data": {
    "camera_movement": null,
    "shot_type": null,
    "lighting": null,
    "motion_prompt": "",
    "checkboxes": {}
  },

  "video": {
    "status": "pending",
    "task_id": null,
    "url": null,
    "error": null,
    "provider": null,
    "generated_at": null
  },

  "ai_collaboration": [],

  "created_at": "2025-12-24T02:00:00.000Z",
  "updated_at": "2025-12-24T02:00:00.000Z"
}
```

---

### 视频生成失败的 Workspace

```json
{
  "video": {
    "status": "failed",
    "task_id": "runway_task_xyz789",
    "url": null,
    "error": "第三方API超时：等待10分钟后未收到完成通知",
    "provider": "runway",
    "generated_at": null
  }
}
```

---

## 常用查询操作

### 1. 创建工作空间

```javascript
const workspace = new Workspace({
  order_index: 0
});
await workspace.save();
```

---

### 2. 获取所有工作空间（按顺序）

```javascript
const workspaces = await Workspace
  .find()
  .sort({ order_index: 1 })
  .lean();  // 返回普通对象，减少内存占用
```

---

### 3. 增量更新（使用 $set）

```javascript
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $set: {
      'form_data.camera_movement': '推进',
      'form_data.motion_prompt': '人物转身',
      'updated_at': new Date()
    }
  }
);
```

---

### 4. 更新视频状态

```javascript
// 开始生成
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $set: {
      'video.status': 'generating',
      'video.task_id': task_id,
      'video.provider': 'runway',
      'updated_at': new Date()
    }
  }
);

// 生成完成
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $set: {
      'video.status': 'completed',
      'video.url': video_url,
      'video.generated_at': new Date(),
      'updated_at': new Date()
    }
  }
);

// 生成失败
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $set: {
      'video.status': 'failed',
      'video.error': error_message,
      'updated_at': new Date()
    }
  }
);
```

---

### 5. 添加 AI 协作记录

```javascript
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $push: {
      ai_collaboration: {
        user_input: '帮我优化运镜',
        ai_suggestion: { ... },
        timestamp: new Date()
      }
    },
    $set: {
      'updated_at': new Date()
    }
  }
);
```

---

### 6. 删除工作空间

```javascript
await Workspace.deleteOne({ _id: workspace_id });
```

---

### 7. 批量更新排序

```javascript
// 调整多个工作空间的顺序
const bulkOps = reorder_map.map((workspace_id, new_index) => ({
  updateOne: {
    filter: { _id: workspace_id },
    update: { $set: { order_index: new_index, updated_at: new Date() } }
  }
}));

await Workspace.bulkWrite(bulkOps);
```

---

### 8. 查询正在生成的任务

```javascript
const generatingTasks = await Workspace.find({
  'video.status': 'generating'
}).lean();
```

---

## 数据库连接配置

### connection.js

```javascript
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const options = {
      // 连接池配置
      maxPoolSize: 10,
      minPoolSize: 2,

      // 超时配置
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // 自动索引（生产环境建议关闭，手动创建索引）
      autoIndex: process.env.NODE_ENV === 'development'
    };

    await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info('MongoDB 连接成功', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });

    // 连接错误监听
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB 连接错误', { error: err });
    });

    // 断开连接监听
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB 连接断开');
    });

  } catch (error) {
    logger.error('MongoDB 初始连接失败', { error });
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## 性能优化

### 1. 使用 .lean()

**作用：** 返回普通 JavaScript 对象，而非 Mongoose Document

```javascript
// ❌ 返回 Mongoose Document（占用更多内存）
const workspaces = await Workspace.find();

// ✅ 返回普通对象
const workspaces = await Workspace.find().lean();
```

**适用场景：**
- 只读查询
- 不需要 Mongoose 方法（save, validate 等）
- 大量数据查询

---

### 2. 字段投影（Projection）

**作用：** 只查询需要的字段

```javascript
// ❌ 查询所有字段
const workspace = await Workspace.findById(id);

// ✅ 只查询需要的字段
const workspace = await Workspace.findById(id)
  .select('form_data video.status video.url')
  .lean();
```

---

### 3. 索引提示（Index Hints）

**作用：** 强制使用特定索引

```javascript
const workspaces = await Workspace.find({ 'video.status': 'generating' })
  .hint({ 'video.status': 1 })
  .lean();
```

---

### 4. 批量操作

**作用：** 减少网络往返次数

```javascript
// ❌ 多次单独更新
for (const id of workspace_ids) {
  await Workspace.updateOne({ _id: id }, { $set: { ... } });
}

// ✅ 批量操作
const bulkOps = workspace_ids.map(id => ({
  updateOne: {
    filter: { _id: id },
    update: { $set: { ... } }
  }
}));
await Workspace.bulkWrite(bulkOps);
```

---

## 数据一致性

### 1. 原子操作

MongoDB 单文档操作是原子的：

```javascript
// ✅ 原子操作（安全）
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $set: { 'video.status': 'completed' },
    $inc: { view_count: 1 }  // 同时增加浏览次数
  }
);
```

---

### 2. 事务（未来扩展）

多文档操作需要事务保证一致性：

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 删除工作空间
  await Workspace.deleteOne({ _id: workspace_id }, { session });

  // 更新其他工作空间的 order_index
  await Workspace.updateMany(
    { order_index: { $gt: old_index } },
    { $inc: { order_index: -1 } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**MVP 阶段：** 单文档操作为主，暂不引入事务

---

## 备份策略

### 1. 自动备份脚本

```bash
#!/bin/bash
# backup-mongo.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="video-maker"

# 创建备份
mongodump --uri="mongodb://localhost:27017/$DB_NAME" --out="$BACKUP_DIR/$DATE"

# 压缩备份
tar -czf "$BACKUP_DIR/$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# 删除7天前的备份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/$DATE.tar.gz"
```

**定时任务（crontab）：**
```bash
# 每天凌晨2点执行备份
0 2 * * * /path/to/backup-mongo.sh
```

---

### 2. 恢复数据

```bash
# 解压备份
tar -xzf /backups/mongodb/20251224_020000.tar.gz -C /tmp

# 恢复数据
mongorestore --uri="mongodb://localhost:27017/video-maker" /tmp/20251224_020000/video-maker
```

---

## 未来扩展方向

### Phase 2: 多用户支持

**添加 users Collection：**
```javascript
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password_hash: String,
  created_at: { type: Date, default: Date.now }
});
```

**workspaces 添加 user_id 字段：**
```javascript
{
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // ... 其他字段
}
```

**复合索引：**
```javascript
{ user_id: 1, order_index: 1 }
```

---

### Phase 3: 使用历史统计

**添加 usage_stats Collection：**
```javascript
{
  user_id: ObjectId,
  date: Date,
  videos_generated: Number,
  images_uploaded: Number,
  ai_suggestions_used: Number
}
```

---

## 总结

本数据库设计的核心特点：

✅ **灵活的Schema**：文档型数据库，适合快速迭代
✅ **合理的索引**：支持常用查询场景
✅ **增量更新**：使用 $set 只更新变化的字段
✅ **性能优化**：lean(), 字段投影, 批量操作
✅ **扩展友好**：为未来多用户、统计功能预留设计空间

适合 MVP 阶段快速开发，后续可根据业务需求逐步优化。
