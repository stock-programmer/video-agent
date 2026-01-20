# Backend Layer 4 Task 3: 服务器集成

## 任务元数据

- **任务 ID**: `backend-v2-layer4-task3`
- **任务名称**: 服务器集成
- **所属层级**: Layer 4 - API 和 WebSocket
- **预计工时**: 1 小时
- **依赖任务**: B-L4-T1 (Optimize API), B-L4-T2 (WebSocket Handler)
- **可并行任务**: 无 (Layer 4 最终任务)

---

## 任务目标

将 v2.0 所有组件集成到现有服务器,确保向后兼容。

**核心功能**:
- 安装新依赖 (langchain, deepagents)
- 更新 package.json
- 验证环境变量
- 集成测试

---

## 实现文件

无新文件创建,主要更新以下文件:
- `backend/package.json`
- `backend/.env.example`
- `backend/README.md`

---

## 实现步骤

### Step 1: 更新 package.json

```json
{
  "name": "video-maker-backend",
  "version": "2.0.0",
  "description": "AI Video Generation Backend with Prompt Optimization",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.0",
    "ws": "^8.14.2",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "morgan": "^1.10.0",

    "langchain": "^0.1.0",
    "@langchain/community": "^0.0.20",
    "deepagents": "^1.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.52.0"
  }
}
```

### Step 2: 更新环境变量模板

```bash
# backend/.env.example

# ============================================================
# Server Configuration
# ============================================================
NODE_ENV=development
SERVER_PORT=3000

# ============================================================
# Database
# ============================================================
MONGODB_URI=mongodb://localhost:27017/video-maker

# ============================================================
# Third-party API Keys (Required)
# ============================================================

# Video Generation Service - Alibaba Cloud Qwen (DashScope)
# Get key from: https://bailian.console.aliyun.com/
DASHSCOPE_API_KEY=your-dashscope-key-here

# LLM Service - Google Gemini (v1.x)
# Get key from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your-google-key-here

# ============================================================
# Service Provider Selection
# ============================================================
VIDEO_PROVIDER=qwen
LLM_PROVIDER=gemini

# ============================================================
# Upload Configuration
# ============================================================
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads

# ============================================================
# v2.0 Configuration (Optional)
# ============================================================

# Optimization timeout (milliseconds)
OPTIMIZATION_TIMEOUT=300000

# Human-in-the-loop confirmation timeout (milliseconds)
HUMAN_CONFIRMATION_TIMEOUT=300000
```

### Step 3: 安装依赖脚本

```bash
#!/bin/bash
# backend/install-v2-deps.sh

echo "Installing v2.0 dependencies..."

cd backend

# 安装新依赖
npm install langchain@^0.1.0
npm install @langchain/community@^0.0.20
npm install deepagents@^1.0.0
npm install zod@^3.22.4

echo "✅ Dependencies installed successfully"

# 验证安装
echo ""
echo "Verifying installations..."

node -e "
try {
  require('langchain');
  console.log('✅ langchain installed');
} catch (e) {
  console.error('❌ langchain not found');
  process.exit(1);
}

try {
  require('@langchain/community');
  console.log('✅ @langchain/community installed');
} catch (e) {
  console.error('❌ @langchain/community not found');
  process.exit(1);
}

try {
  require('deepagents');
  console.log('✅ deepagents installed');
} catch (e) {
  console.error('❌ deepagents not found');
  process.exit(1);
}

try {
  require('zod');
  console.log('✅ zod installed');
} catch (e) {
  console.error('❌ zod not found');
  process.exit(1);
}
"

echo ""
echo "✅ All v2.0 dependencies ready"
```

### Step 4: 环境变量验证脚本

```javascript
// backend/verify-env.js
const logger = require('./src/utils/logger');

/**
 * 验证环境变量
 */
function verifyEnvironment() {
  logger.info('Verifying environment configuration...');

  const required = [
    'DASHSCOPE_API_KEY',
    'MONGODB_URI'
  ];

  const optional = [
    'GOOGLE_API_KEY',
    'OPTIMIZATION_TIMEOUT',
    'HUMAN_CONFIRMATION_TIMEOUT'
  ];

  let hasErrors = false;

  // 检查必需变量
  console.log('\n========== Required Environment Variables ==========');
  for (const key of required) {
    if (process.env[key]) {
      console.log(`✅ ${key}: Set`);
    } else {
      console.error(`❌ ${key}: Missing`);
      hasErrors = true;
    }
  }

  // 检查可选变量
  console.log('\n========== Optional Environment Variables ==========');
  for (const key of optional) {
    if (process.env[key]) {
      console.log(`✅ ${key}: Set (${process.env[key]})`);
    } else {
      console.log(`⚠️  ${key}: Not set (will use default)`);
    }
  }

  // 检查依赖
  console.log('\n========== Package Dependencies ==========');
  const deps = ['langchain', '@langchain/community', 'deepagents', 'zod'];

  for (const dep of deps) {
    try {
      require(dep);
      console.log(`✅ ${dep}: Installed`);
    } catch (e) {
      console.error(`❌ ${dep}: Not installed`);
      hasErrors = true;
    }
  }

  console.log('\n========== Summary ==========');
  if (hasErrors) {
    console.error('❌ Environment verification FAILED');
    console.error('Please fix the errors above before starting the server');
    process.exit(1);
  } else {
    console.log('✅ Environment verification PASSED');
    console.log('Server is ready to start');
  }
}

if (require.main === module) {
  require('dotenv').config();
  verifyEnvironment();
}

module.exports = { verifyEnvironment };
```

### Step 5: 集成测试

```javascript
// backend/src/__tests__/v2-integration.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { Workspace } = require('../db/mongodb');
const { optimizePrompt } = require('../services/prompt-optimizer');

jest.mock('../services/prompt-optimizer');

describe('v2.0 Integration Tests', () => {
  let mockWsBroadcast;

  beforeAll(async () => {
    // 连接测试数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // 清理数据库
    await Workspace.deleteMany({});

    mockWsBroadcast = jest.fn();
    app.set('wsBroadcast', mockWsBroadcast);

    jest.clearAllMocks();
  });

  describe('Full Optimization Flow', () => {
    it('should trigger optimization via API and receive WebSocket updates', async () => {
      // 1. 创建测试 workspace
      const workspace = await Workspace.create({
        image_url: 'http://localhost/test.jpg',
        video: {
          status: 'completed',
          url: 'http://localhost/test-video.mp4'
        },
        form_data: {
          motion_intensity: 3,
          lighting: 'natural'
        }
      });

      // 2. Mock 优化结果
      optimizePrompt.mockResolvedValue({
        success: true,
        intentReport: {
          user_intent: {
            scene_description: 'Test',
            desired_mood: 'calm',
            key_elements: ['person'],
            motion_expectation: 'slow'
          },
          confidence: 0.85
        },
        videoAnalysis: {
          content_match_score: 0.70,
          issues: [],
          technical_quality: {
            clarity_score: 0.85,
            fluency_score: 0.75
          },
          overall_assessment: 'Good'
        },
        optimizationResult: {
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
        }
      });

      // 3. 调用 API
      const response = await request(app)
        .post('/api/optimize-prompt')
        .send({ workspace_id: workspace._id.toString() })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Optimization started',
        workspace_id: workspace._id.toString()
      });

      // 4. 等待异步优化完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. 验证优化函数被调用
      expect(optimizePrompt).toHaveBeenCalledWith(
        workspace._id.toString(),
        mockWsBroadcast
      );
    });

    it('should save optimization result to database', async () => {
      const workspace = await Workspace.create({
        image_url: 'http://localhost/test.jpg',
        video: {
          status: 'completed',
          url: 'http://localhost/test-video.mp4'
        },
        form_data: { motion_intensity: 3 }
      });

      // 模拟保存结果
      await Workspace.findByIdAndUpdate(
        workspace._id,
        {
          $push: {
            optimization_history: {
              timestamp: new Date(),
              intent_report: {},
              video_analysis: {},
              optimization_result: {}
            }
          }
        }
      );

      const updated = await Workspace.findById(workspace._id);
      expect(updated.optimization_history).toHaveLength(1);
    });
  });

  describe('Backward Compatibility', () => {
    it('should not affect v1.x video generation', async () => {
      const workspace = await Workspace.create({
        image_url: 'http://localhost/test.jpg',
        form_data: { motion_intensity: 3 }
      });

      // v1.x 工作空间不应有 optimization_history
      expect(workspace.optimization_history).toBeUndefined();

      // v1.x API 仍然工作
      const response = await request(app)
        .get('/api/workspaces')
        .expect(200);

      expect(response.body).toHaveProperty('workspaces');
    });

    it('should handle workspaces without optimization_history field', async () => {
      const workspace = await Workspace.create({
        image_url: 'http://localhost/test.jpg',
        video: {
          status: 'completed',
          url: 'http://localhost/test-video.mp4'
        },
        form_data: { motion_intensity: 3 }
      });

      // 验证可以添加 optimization_history
      await Workspace.findByIdAndUpdate(
        workspace._id,
        {
          $push: {
            optimization_history: {
              timestamp: new Date()
            }
          }
        }
      );

      const updated = await Workspace.findById(workspace._id);
      expect(updated.optimization_history).toBeDefined();
    });
  });
});
```

---

## 验收标准

- [ ] 所有 v2.0 依赖成功安装 (langchain, deepagents, zod)
- [ ] 环境变量模板更新完整
- [ ] 环境验证脚本可正常运行
- [ ] 集成测试通过
- [ ] v1.x 功能不受影响 (向后兼容)
- [ ] 服务器可正常启动
- [ ] API 和 WebSocket 正常工作

---

## 测试命令

```bash
# 安装依赖
cd backend
npm install

# 验证环境
node verify-env.js

# 运行集成测试
npm test -- v2-integration.test.js

# 启动服务器
npm run dev
```

---

## 参考文档

- `context/tasks/v2/v2-development-plan.md` - 开发计划
- `context/tasks/v2/v2-backend-architecture.md` - 后端架构
- `CLAUDE.md` - 项目说明
