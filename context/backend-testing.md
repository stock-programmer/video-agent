# 测试策略文档

## 文档信息
- **版本号**：v1.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段设计

---

## 测试策略概述

### MVP 阶段测试重点

**核心原则：** 保证核心功能可用，不追求100%覆盖率

**测试优先级：**
1. ⭐⭐⭐ **核心功能测试**：图片上传、视频生成、状态同步
2. ⭐⭐ **集成测试**：API + 数据库 + 第三方服务
3. ⭐ **单元测试**：关键工具函数

---

## 测试分类

### 1. 功能测试（手动）

**目的：** 验证用户操作流程

**测试清单：**

#### 工作空间管理
- [ ] 创建工作空间
- [ ] 刷新页面后状态恢复
- [ ] 删除工作空间
- [ ] 调整工作空间顺序

---

#### 图片上传
- [ ] 上传 JPEG 图片（< 10MB）
- [ ] 上传 PNG 图片（< 10MB）
- [ ] 上传 WebP 图片（< 10MB）
- [ ] 上传超过 10MB 的图片（应失败）
- [ ] 上传不支持的文件类型（如 GIF，应失败）
- [ ] 上传后图片正确显示

---

#### 表单自动保存
- [ ] 选择运镜方式，自动保存
- [ ] 选择景别，自动保存
- [ ] 选择光线，自动保存
- [ ] 填写提示词，300ms 后自动保存
- [ ] 刷新页面后表单数据恢复

---

#### 视频生成
- [ ] 提交生成请求，状态变为「生成中」
- [ ] 轮询期间页面刷新，状态仍为「生成中」
- [ ] 视频生成完成，自动显示视频播放器
- [ ] 视频生成失败，显示错误提示
- [ ] 多个工作空间同时生成视频

---

#### AI 协作
- [ ] 输入请求，生成建议
- [ ] 建议历史正确保存
- [ ] 刷新页面后历史恢复

---

#### WebSocket 连接
- [ ] 页面加载时建立连接
- [ ] 网络断开后自动重连
- [ ] 重连后状态正确恢复
- [ ] 心跳检测正常工作

---

### 2. API 集成测试（自动化）

**工具：** Jest + Supertest

**测试目标：** 验证 API 端点功能

#### 图片上传 API

**测试用例：**
- 成功上传 JPEG 图片
- 成功上传 PNG 图片
- 文件过大返回 413 错误
- 不支持的文件类型返回 415 错误
- 未提供文件返回 400 错误

---

#### 获取工作空间 API

**测试用例：**
- 空数据库返回空数组
- 返回所有工作空间
- 按 order_index 排序
- 数据库错误返回 500

---

#### 视频生成 API

**测试用例：**
- 缺少参数返回 400 错误
- 工作空间不存在返回 404 错误
- 成功提交返回 task_id
- MongoDB 状态更新为 'generating'
- 第三方 API 失败返回 500 错误

---

#### AI 建议 API

**测试用例：**
- 缺少参数返回 400 错误
- 成功生成建议
- AI 协作历史正确保存到 MongoDB
- LLM API 失败返回 500 错误

---

### 3. WebSocket 集成测试（自动化）

**工具：** Jest + ws (WebSocket客户端)

**测试目标：** 验证 WebSocket 协议

#### 创建工作空间协议

**测试用例：**
- 发送 workspace.create 消息
- 收到 workspace.created 确认
- MongoDB 中创建了新文档

---

#### 更新工作空间协议

**测试用例：**
- 发送 workspace.update 消息
- 收到 workspace.sync_confirm 确认
- MongoDB 正确更新字段
- 嵌套字段（如 form_data.camera_movement）正确更新

---

#### 删除工作空间协议

**测试用例：**
- 发送 workspace.delete 消息
- 收到 workspace.deleted 确认
- MongoDB 中文档已删除

---

#### 排序工作空间协议

**测试用例：**
- 发送 workspace.reorder 消息
- 收到 workspace.reorder_confirm 确认
- MongoDB 中 order_index 批量更新成功

---

### 4. 服务层测试（Mock 第三方 API）

**工具：** Jest + nock (HTTP Mock)

**测试目标：** 验证服务层逻辑，不实际调用第三方 API

#### 视频生成服务测试

**测试用例：**
- Mock Runway API 返回成功
- 轮询任务启动
- 模拟完成状态，MongoDB 正确更新
- 模拟失败状态，MongoDB 正确更新
- 模拟超时，标记为失败

---

#### LLM 服务测试

**测试用例：**
- Mock OpenAI API 返回建议
- 解析 JSON 结果
- API 超时处理
- API 返回非 JSON 数据处理

---

### 5. 数据库测试

**工具：** Jest + mongodb-memory-server (内存数据库)

**测试目标：** 验证 MongoDB 操作

#### Workspace Model 测试

**测试用例：**
- 创建工作空间
- 增量更新（$set 操作）
- 批量更新（bulkWrite）
- 删除工作空间
- 查询并排序
- Schema 验证（如 status 枚举值）

---

## 测试环境配置

### 测试数据库

**使用内存数据库：** mongodb-memory-server

**优点：**
- 不影响开发数据库
- 测试速度快
- 每次测试独立环境

**配置：**
```
使用独立的 MongoDB 连接
测试前清空数据
测试后关闭连接
```

---

### 测试环境变量

**创建 `.env.test` 文件：**
```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/video-maker-test
SERVER_PORT=3002
WS_PORT=3003

# Mock API Keys（测试用）
RUNWAY_API_KEY=test_runway_key
OPENAI_API_KEY=test_openai_key

VIDEO_PROVIDER=runway
LLM_PROVIDER=openai
```

---

## Mock 策略

### Mock 第三方 API

**工具：** nock

**场景：**
- 视频生成 API 调用
- LLM API 调用

**好处：**
- 不消耗真实配额
- 测试速度快
- 可模拟各种响应（成功/失败/超时）

---

### Mock WebSocket 广播

**策略：** 替换 `websocket/server.js` 的 `broadcast` 方法

**目的：** 验证是否正确调用广播，但不实际发送消息

---

## 测试数据准备

### Fixture 数据

**目的：** 提供测试用的标准数据

**内容：**
```
测试工作空间数据
测试图片文件（Base64）
测试 AI 建议响应
测试视频生成响应
```

---

### 数据工厂

**工具：** faker.js 或手写工厂函数

**用途：** 生成随机测试数据

**示例：**
```
createWorkspace({ order_index, image_url })
createVideoResponse({ task_id, status })
```

---

## 压力测试

### 并发测试

**场景：**
- 多个客户端同时连接 WebSocket
- 多个工作空间同时生成视频
- 大量图片同时上传

**工具：** Artillery 或 k6

**指标：**
- 响应时间
- 成功率
- 资源占用（内存/CPU）

---

### 长连接稳定性测试

**场景：**
- WebSocket 连接保持1小时
- 定期发送消息
- 检查是否断线

---

## 错误场景测试

### 网络错误

**测试场景：**
- 第三方 API 超时
- 第三方 API 返回 500 错误
- MongoDB 连接断开
- WebSocket 连接断开

**预期行为：**
- 正确的错误处理
- 错误日志记录
- 用户友好的错误提示

---

### 数据异常

**测试场景：**
- 工作空间不存在
- 文件格式错误
- JSON 格式错误
- 超大文件上传

**预期行为：**
- 返回明确的错误码
- 不崩溃
- 错误日志记录

---

## 测试覆盖率目标

**MVP 阶段目标：**
- API 层：>= 80%
- WebSocket 协议层：>= 80%
- 服务层：>= 70%
- 工具函数：>= 90%

**不强制要求：**
- 整体覆盖率 100%（过度追求覆盖率降低开发效率）

---

## 持续集成（CI）

### GitHub Actions 配置

**触发条件：**
- Push 到 main 分支
- 创建 Pull Request

**流程：**
1. 安装依赖（npm install）
2. 启动测试数据库（mongodb-memory-server）
3. 运行测试（npm test）
4. 生成覆盖率报告
5. 上传到 Codecov（可选）

---

## 测试脚本配置

### package.json

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:api": "jest tests/api",
    "test:ws": "jest tests/websocket",
    "test:services": "jest tests/services",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e"
  }
}
```

---

## 测试文件组织

```
backend/
└── tests/
    ├── unit/                       # 单元测试
    │   ├── utils/
    │   │   └── logger.test.js
    │   └── services/
    │       └── video-runway.test.js
    │
    ├── integration/                # 集成测试
    │   ├── api/
    │   │   ├── upload-image.test.js
    │   │   ├── get-workspaces.test.js
    │   │   ├── generate-video.test.js
    │   │   └── ai-suggest.test.js
    │   │
    │   └── websocket/
    │       ├── workspace-create.test.js
    │       ├── workspace-update.test.js
    │       ├── workspace-delete.test.js
    │       └── workspace-reorder.test.js
    │
    ├── e2e/                        # 端到端测试
    │   └── video-generation-flow.test.js
    │
    ├── fixtures/                   # 测试数据
    │   ├── workspaces.json
    │   ├── images/
    │   └── responses/
    │
    └── helpers/                    # 测试工具
        ├── db-setup.js             # 数据库初始化
        ├── mock-apis.js            # API Mock
        └── factories.js            # 数据工厂
```

---

## 测试最佳实践

### 1. 测试隔离

**原则：**
- 每个测试独立运行
- 不依赖其他测试的执行结果
- 使用 beforeEach 清理数据

---

### 2. 测试命名

**格式：** `describe > it` 清晰描述测试内容

**示例：**
```
describe('POST /api/upload/image')
  it('成功上传 JPEG 图片')
  it('文件过大返回 413 错误')
  it('不支持的文件类型返回 415 错误')
```

---

### 3. 断言明确

**使用具体的断言：**
- ✅ `expect(response.status).toBe(200)`
- ❌ `expect(response.status).toBeTruthy()`

---

### 4. 测试数据清理

**原则：**
- 测试前清空测试数据库
- 测试后清理创建的文件
- 使用 afterEach 或 afterAll 清理

---

### 5. Mock 合理使用

**Mock 场景：**
- 第三方 API 调用
- 时间相关操作（Date.now）
- 随机数生成

**不 Mock 场景：**
- 业务逻辑
- 数据库操作（使用测试数据库）

---

## 测试工具栈

| 工具 | 用途 |
|------|------|
| Jest | 测试框架 |
| Supertest | HTTP API 测试 |
| ws | WebSocket 客户端（测试用） |
| nock | HTTP Mock |
| mongodb-memory-server | 内存数据库 |
| faker.js | 生成随机测试数据 |
| Artillery / k6 | 压力测试 |

---

## 测试报告

### 覆盖率报告

**生成方式：** `npm test -- --coverage`

**输出：**
- 控制台显示覆盖率表格
- 生成 `coverage/` 目录（HTML 报告）

---

### 测试结果报告

**格式：**
- 通过/失败的测试数量
- 执行时间
- 失败测试的详细信息

---

## 测试优先级（MVP阶段）

### 高优先级（必须测试）
1. 图片上传 API
2. 视频生成 API
3. WebSocket 状态同步
4. 数据库 CRUD 操作

### 中优先级（建议测试）
1. AI 建议 API
2. WebSocket 重连机制
3. 错误处理

### 低优先级（可选）
1. 日志功能
2. 配置加载
3. 性能测试

---

## 回归测试

### 定义

**目的：** 确保新功能不破坏已有功能

**策略：**
- 每次发布前运行完整测试套件
- 修复 Bug 后添加对应测试用例

---

## 总结

MVP 阶段测试策略的核心：

✅ **核心功能优先**：重点测试图片上传、视频生成、状态同步
✅ **集成测试为主**：验证 API + 数据库 + 第三方服务的完整流程
✅ **Mock 第三方 API**：避免消耗配额，提高测试速度
✅ **自动化关键流程**：API 和 WebSocket 协议自动化测试
✅ **手动测试补充**：用户操作流程手动验证

适合快速迭代的 MVP 阶段，后续可逐步提高测试覆盖率和引入更多自动化测试。
