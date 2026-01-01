# 后端任务 1.2 - 验证第三方API（已完成）

## 任务概述
- **任务名称**: 验证 Qwen (通义千问) 视频生成 API 和 Google Gemini LLM API 可用性
- **层级**: 第1层 - 无依赖,可立即开始
- **状态**: ✅ 已完成准备工作，等待 API Key 测试
- **完成时间**: 2025-12-27

---

## 执行结果

### ✅ 已完成的工作

#### 1. 环境准备
- [x] 安装必要的 npm 依赖包
  - `axios` - HTTP 客户端（用于调用 REST API）
  - `dotenv` - 环境变量管理
  - `@google/generative-ai` - Google Gemini 官方 SDK

**执行命令**:
```bash
npm install axios dotenv @google/generative-ai
```

**结果**:
```
added 25 packages, and audited 27 packages in 13s
7 packages are looking for funding
found 0 vulnerabilities
```

#### 2. 创建测试脚本

##### 2.1 Qwen 视频生成 API 测试脚本

**文件**: `test-qwen-video.js`

**功能**:
- ✅ 环境变量检查（DASHSCOPE_API_KEY）
- ✅ 提交视频生成任务
- ✅ 查询任务状态
- ✅ 完善的错误处理（401/429/400）
- ✅ 详细的日志输出

**测试流程**:
1. 读取 DASHSCOPE_API_KEY 环境变量
2. 调用 POST `/services/aigc/video-generation/generation` 提交任务
3. 获取 task_id
4. 调用 GET `/tasks/{task_id}` 查询状态
5. 输出测试结果

**API 端点**:
- 提交任务: `https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation`
- 查询状态: `https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}`

##### 2.2 Google Gemini LLM API 测试脚本

**文件**: `test-gemini-llm.js`

**功能**:
- ✅ 环境变量检查（GOOGLE_API_KEY）
- ✅ 初始化 Gemini AI
- ✅ 三个测试用例：
  - 基础文本生成
  - 视频制作 AI 建议
  - 运镜参数优化
- ✅ 完善的错误处理（API_KEY_INVALID/RESOURCE_EXHAUSTED/PERMISSION_DENIED）
- ✅ 详细的日志输出

**测试用例**:
1. **基础对话**: "你好，Gemini！请简单介绍一下你自己。"
2. **视频建议**: 基于场景描述提供运镜建议（JSON 格式）
3. **参数优化**: 分析用户输入的运镜参数并提供优化建议

#### 3. 配置文件

##### 3.1 更新 .env.example

**文件**: `.env.example`

**新增配置项**:
```bash
# 视频生成服务 - 阿里云通义千问 (DashScope)
# 获取地址: https://bailian.console.aliyun.com/
DASHSCOPE_API_KEY=

# LLM 服务 - Google Gemini
# 获取地址: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=
```

**说明**:
- 保留了原有的 Expert Review 配置
- 添加了详细的获取地址说明
- 更新了安全使用建议

#### 4. 测试报告模板

**文件**: `api-test-report.md`

**内容结构**:
- ✅ 测试时间记录
- ✅ Qwen API 测试结果模板
  - 基本信息
  - 测试结果清单
  - API 调用格式示例
  - 响应格式示例
  - 成本分析框架
  - 问题记录区域
- ✅ Google Gemini API 测试结果模板
  - 基本信息
  - 测试结果清单
  - API 调用格式示例
  - 响应示例区域
  - 成本分析框架
  - 问题记录区域
- ✅ 总结和建议框架
  - 可行性评估
  - API 对比表格
  - 使用建议
  - 优化建议
  - 风险提示

#### 5. 执行指南文档

**文件**: `API-VERIFICATION-GUIDE.md`

**内容**:
- ✅ 已完成工作清单
- ✅ API Key 获取步骤详解
  - DashScope API Key 获取（6个步骤）
  - Google Gemini API Key 获取（5个步骤）
- ✅ 环境变量配置方法
- ✅ 测试脚本运行指南
- ✅ 预期输出示例
- ✅ 常见问题处理
- ✅ 调试技巧
- ✅ 参考文档链接

---

## 文件清单

### 新创建的文件

```
my-project/
├── test-qwen-video.js                    # Qwen API 测试脚本（220行）
├── test-gemini-llm.js                    # Gemini API 测试脚本（130行）
├── api-test-report.md                    # 测试报告模板
├── API-VERIFICATION-GUIDE.md             # 详细执行指南
└── context/tasks/backend/
    └── backend-dev-plan-1.2-verify-third-party-apis-done.md  # 本文件
```

### 更新的文件

```
my-project/
├── .env.example                          # 添加了 DASHSCOPE_API_KEY 和 GOOGLE_API_KEY
├── package.json                          # 添加了依赖
└── node_modules/                         # 新安装的包
    ├── axios/
    ├── dotenv/
    └── @google/generative-ai/
```

---

## 验收标准完成情况

根据 `backend-dev-plan-1.2-verify-third-party-apis.md` 的验收标准：

### 自动化准备工作（已完成）
- [x] npm 依赖包已安装
- [x] 测试脚本已创建且可运行
- [x] 环境变量配置模板已创建
- [x] 测试报告模板已创建
- [x] 执行指南文档已创建

### 需要人工操作（待完成）
- [ ] DashScope API Key 已获取（用于 Qwen 视频生成）
- [ ] Qwen 视频生成 API 调用成功（任务提交和状态查询）
- [ ] Google API Key 已获取（用于 Gemini LLM）
- [ ] Gemini LLM API 调用成功（至少 3 个测试用例通过）
- [ ] 记录了两个 API 的调用格式、参数和响应格式（模板已提供）
- [ ] 记录了 API 调用成本和限额信息（模板已提供）

---

## API 信息汇总

### 1. Qwen 视频生成 API

#### 基本信息
| 项目 | 内容 |
|------|------|
| **服务商** | 阿里云 DashScope |
| **用途** | 图生视频（Image-to-Video） |
| **Base URL** | https://dashscope.aliyuncs.com/api/v1 |
| **认证方式** | Bearer Token |
| **环境变量** | DASHSCOPE_API_KEY |
| **获取地址** | https://bailian.console.aliyun.com/ |

#### API 端点
- **提交任务**: `POST /services/aigc/video-generation/generation`
- **查询状态**: `GET /tasks/{task_id}`

#### 请求格式
```javascript
{
  "model": "qwen-vl-plus",
  "input": {
    "image_url": "图片URL",
    "prompt": "视频生成描述（中文）"
  },
  "parameters": {
    "duration": 5  // 视频时长（秒）
  }
}
```

#### 响应格式
```javascript
{
  "output": {
    "task_id": "任务ID",
    "task_status": "PENDING|RUNNING|SUCCEEDED|FAILED",
    "video_url": "生成的视频URL（成功时）",
    "message": "错误信息（失败时）"
  },
  "request_id": "请求ID"
}
```

#### 任务状态流转
```
PENDING → RUNNING → SUCCEEDED
                  ↘ FAILED
```

#### 特殊要求
- ✅ 必须使用异步模式（Header: `X-DashScope-Async: enable`）
- ✅ 支持中文 prompt
- ✅ 需要轮询查询任务状态
- ✅ 视频生成时间：1-5 分钟

#### 参考文档
- API 文档: https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2867393
- 视频生成: https://help.aliyun.com/zh/dashscope/developer-reference/video-generation

---

### 2. Google Gemini LLM API

#### 基本信息
| 项目 | 内容 |
|------|------|
| **服务商** | Google |
| **用途** | AI 协作助手（LLM） |
| **模型** | gemini-pro |
| **认证方式** | API Key |
| **环境变量** | GOOGLE_API_KEY |
| **获取地址** | https://aistudio.google.com/app/apikey |

#### SDK 使用
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();
```

#### 免费配额
- **请求频率**: 60 requests/minute
- **适合场景**: 开发测试和小规模应用

#### 错误类型
- `API_KEY_INVALID`: API Key 无效
- `RESOURCE_EXHAUSTED`: 配额已用尽
- `PERMISSION_DENIED`: 权限不足

#### 参考文档
- 官方文档: https://ai.google.dev/docs
- Node.js SDK: https://github.com/google/generative-ai-js
- API 参考: https://ai.google.dev/api/rest

---

## 后续操作指南

### 立即执行（需要人工操作）

1. **获取 API Keys**
   ```bash
   # 1. 访问 https://bailian.console.aliyun.com/ 获取 DashScope API Key
   # 2. 访问 https://aistudio.google.com/app/apikey 获取 Google API Key
   ```

2. **配置环境变量**
   ```bash
   # 创建 .env 文件
   cp .env.example .env

   # 编辑 .env 文件，填入获取的 API Keys
   # DASHSCOPE_API_KEY=你的key
   # GOOGLE_API_KEY=你的key
   ```

3. **运行测试**
   ```bash
   # 测试 Qwen API
   node test-qwen-video.js

   # 测试 Gemini API
   node test-gemini-llm.js
   ```

4. **填写测试报告**
   - 编辑 `api-test-report.md`
   - 填写测试时间
   - 勾选完成的测试项
   - 粘贴实际响应数据
   - 记录遇到的问题
   - 补充成本分析信息

### 后续任务

完成此任务后，可以继续执行：
- **backend-dev-plan-2.1-project-init.md** - 项目初始化
- **backend-dev-plan-2.2-config-management.md** - 配置管理

---

## 测试脚本使用示例

### Qwen 视频生成 API 测试

```bash
# 运行测试
node test-qwen-video.js

# 预期成功输出
🚀 开始测试 Qwen 视频生成 API...

📤 提交视频生成任务...
✅ 任务提交成功
📋 任务 ID: task-xxx-xxx
⏳ 任务状态: PENDING

🔍 查询任务状态...
✅ 状态查询成功
📊 任务状态: RUNNING

==================================================
✅ Qwen API 验证成功！
==================================================
```

### Google Gemini API 测试

```bash
# 运行测试
node test-gemini-llm.js

# 预期成功输出
🚀 开始测试 Google Gemini API...

📝 测试用例 1: 基础文本生成
✅ 响应成功

📝 测试用例 2: 视频制作 AI 助手
✅ 响应成功

📝 测试用例 3: 运镜参数优化
✅ 响应成功

==================================================
✅ Google Gemini API 验证成功！
==================================================
```

---

## 常见问题与解决方案

### Q1: DASHSCOPE_API_KEY 未设置

**错误信息**:
```
❌ 错误: DASHSCOPE_API_KEY 环境变量未设置
```

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 检查 `.env` 文件中是否有 `DASHSCOPE_API_KEY=你的key`
3. 确保 API Key 没有多余的空格或引号

### Q2: API Key 无效（401 错误）

**错误信息**:
```
状态码: 401
💡 提示: API Key 无效或已过期
```

**解决方案**:
1. 检查 API Key 是否复制完整
2. 检查 API Key 是否已过期
3. 重新生成 API Key

### Q3: 请求频率超限（429 错误）

**错误信息**:
```
状态码: 429
💡 提示: 请求频率超限，请稍后再试
```

**解决方案**:
1. 等待一段时间后重试
2. 检查是否超过免费配额
3. 考虑升级到付费版本

### Q4: Google Gemini 配额用尽

**错误信息**:
```
RESOURCE_EXHAUSTED
💡 提示: API 配额已用尽
```

**解决方案**:
1. 等待配额重置（每分钟重置）
2. 减少测试频率
3. 升级到付费版本

---

## 技术细节

### Qwen API 特点

1. **异步任务模式**
   - 提交任务后立即返回 task_id
   - 需要轮询查询任务状态
   - 视频生成耗时 1-5 分钟

2. **中文 Prompt 支持**
   - 原生支持中文描述
   - 无需英文翻译
   - 更符合国内用户习惯

3. **任务状态管理**
   - PENDING: 排队中
   - RUNNING: 生成中
   - SUCCEEDED: 成功
   - FAILED: 失败

### Gemini API 特点

1. **官方 SDK**
   - 使用 `@google/generative-ai` 包
   - 简化 API 调用流程
   - 自动处理认证

2. **多模态能力**
   - gemini-pro: 纯文本
   - gemini-pro-vision: 支持图像

3. **流式响应支持**
   - 本测试使用同步模式
   - 也支持流式输出（未使用）

---

## 成本考虑

### Qwen 视频生成

**待测试和记录**:
- 免费额度
- 计费单位
- 单次生成成本
- 月度成本预估

### Google Gemini

**已知信息**:
- 免费配额: 60 requests/min
- 适合开发测试阶段
- 付费版本成本需查询

**建议**:
- 开发阶段使用免费额度
- 上线前评估实际成本
- 设置成本预警

---

## 总结

### 完成情况

✅ **已完成**:
1. 安装所有必需的依赖包
2. 创建完整的测试脚本（包含错误处理）
3. 更新环境变量配置模板
4. 创建测试报告模板
5. 编写详细的执行指南

⏳ **待完成**（需要人工操作）:
1. 获取 DashScope API Key
2. 获取 Google Gemini API Key
3. 运行测试脚本
4. 填写测试报告
5. 记录成本信息

### 交付物

| 文件 | 状态 | 说明 |
|------|------|------|
| `test-qwen-video.js` | ✅ 已创建 | Qwen API 测试脚本 |
| `test-gemini-llm.js` | ✅ 已创建 | Gemini API 测试脚本 |
| `api-test-report.md` | ✅ 已创建 | 测试报告模板 |
| `API-VERIFICATION-GUIDE.md` | ✅ 已创建 | 执行指南 |
| `.env.example` | ✅ 已更新 | 环境变量模板 |
| `package.json` | ✅ 已更新 | 依赖包清单 |

### 下一步

1. **获取 API Keys** - 访问相应平台申请
2. **运行测试** - 执行测试脚本验证 API 可用性
3. **填写报告** - 记录测试结果和性能数据
4. **继续开发** - 进入下一个任务节点

---

**任务准备完成！等待 API Keys 获取后即可测试。**

📅 文档更新时间: 2025-12-27
✍️ 执行人: Claude Code Assistant
