# 后端任务 2.4 - 数据库连接设置

## 层级
第2层

## 依赖
- backend-dev-plan-1.1-install-dependencies.md

## 并行任务
- backend-dev-plan-2.1-project-init.md
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.3-logger-setup.md

## 任务目标
创建 MongoDB 连接和 Workspace Model

## 参考文档
- `context/backend-database-design.md`

## 执行步骤

### 1. 创建 src/db/mongodb.js
```javascript
import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../utils/logger.js';

// Workspace Schema
const workspaceSchema = new mongoose.Schema({
  order_index: { type: Number, required: true, index: true },
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
      default: 'pending',
      index: true
    },
    task_id: String,
    url: String,
    error: String
  },
  ai_collaboration: [{
    user_input: String,
    ai_suggestion: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// 创建索引
workspaceSchema.index({ order_index: 1 });
workspaceSchema.index({ 'video.status': 1 });

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
```

### 2. 测试数据库连接
创建 `test-db.js`:
```javascript
import { connectDB, Workspace } from './src/db/mongodb.js';

async function test() {
  await connectDB();

  // 创建测试数据
  const workspace = await Workspace.create({
    order_index: 1,
    image_url: 'http://test.jpg',
    form_data: { motion_prompt: 'test' }
  });
  console.log('创建成功:', workspace._id);

  // 查询
  const all = await Workspace.find().sort({ order_index: 1 });
  console.log('查询结果:', all.length);

  // 清理
  await Workspace.deleteMany({});
  process.exit(0);
}

test();
```

运行:
```bash
node test-db.js
```

## 验收标准
- [ ] `src/db/mongodb.js` 已创建
- [ ] Workspace Schema 定义正确
- [ ] 索引创建成功
- [ ] 数据库连接成功
- [ ] CRUD 操作测试通过

## 下一步
- backend-dev-plan-4.1-api-upload-image.md
- backend-dev-plan-4.2-api-get-workspaces.md
- backend-dev-plan-4.3-api-generate-video.md
- backend-dev-plan-5.1-ws-workspace-create.md
