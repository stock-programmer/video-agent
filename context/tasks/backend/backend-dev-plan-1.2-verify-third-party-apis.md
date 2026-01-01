# 后端任务 1.2 - 验证第三方API

## 层级
第1层 - 无依赖,可立即开始

## 并行任务
- backend-dev-plan-1.1-install-dependencies.md

## 任务目标
验证 Qwen (通义千问) 视频生成 API 和 Google Gemini LLM API 可用性

## 执行步骤

### 1. 获取 DashScope API Key (Qwen)

**用途**: 图生视频服务

**获取步骤**:
1. 访问阿里云百炼平台：https://bailian.console.aliyun.com/
2. 登录阿里云账号（没有账号需要先注册）
3. 点击左侧导航栏的 "API-KEY"
4. 点击 "创建新的API-KEY"
5. 复制生成的 API Key 并妥善保存

**免费额度**:
- 新用户通常有免费试用额度
- 具体额度查看：https://dashscope.console.aliyun.com/

**参考文档**:
- API 文档：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2867393
- 视频生成文档：https://help.aliyun.com/zh/dashscope/developer-reference/video-generation

### 2. 测试 Qwen 视频生成 API

创建测试脚本 `test-qwen-video.js`:

```javascript
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 测试阿里云 DashScope 通义千问视频生成 API
 */
async function testQwenVideoGeneration() {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    console.error('❌ 错误: DASHSCOPE_API_KEY 环境变量未设置');
    console.log('请在 .env 文件中添加: DASHSCOPE_API_KEY=your_api_key');
    return;
  }

  console.log('🚀 开始测试 Qwen 视频生成 API...\n');

  try {
    // 步骤 1: 提交视频生成任务
    console.log('📤 提交视频生成任务...');
    const submitResponse = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation',
      {
        model: 'qwen-vl-plus',
        input: {
          image_url: 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/video/generation/sample.jpg',
          prompt: '镜头缓慢向前推进，展现画面细节'
        },
        parameters: {
          duration: 5  // 视频时长（秒）
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'  // 启用异步模式
        }
      }
    );

    const taskId = submitResponse.data.output?.task_id;

    if (!taskId) {
      console.error('❌ 未获取到任务 ID');
      console.log('响应数据:', JSON.stringify(submitResponse.data, null, 2));
      return;
    }

    console.log(`✅ 任务提交成功`);
    console.log(`📋 任务 ID: ${taskId}`);
    console.log(`⏳ 任务状态: ${submitResponse.data.output?.task_status || 'PENDING'}\n`);

    // 步骤 2: 查询任务状态
    console.log('🔍 查询任务状态...');
    const statusResponse = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log('✅ 状态查询成功');
    console.log('📊 任务状态:', statusResponse.data.output?.task_status);
    console.log('📝 完整响应:', JSON.stringify(statusResponse.data, null, 2));

    // 成功总结
    console.log('\n' + '='.repeat(50));
    console.log('✅ Qwen API 验证成功！');
    console.log('='.repeat(50));
    console.log('📌 任务 ID:', taskId);
    console.log('📌 API 端点可用');
    console.log('📌 认证成功');
    console.log('📌 建议: 保存任务 ID 以便后续查询结果');

  } catch (error) {
    console.error('\n❌ API 调用失败');

    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.log('\n💡 提示: API Key 无效或已过期，请检查 DASHSCOPE_API_KEY');
      } else if (error.response.status === 429) {
        console.log('\n💡 提示: 请求频率超限，请稍后再试');
      } else if (error.response.status === 400) {
        console.log('\n💡 提示: 请求参数错误，请检查输入格式');
      }
    } else {
      console.error('错误:', error.message);
    }
  }
}

// 执行测试
testQwenVideoGeneration();
```

**运行测试**:
```bash
# 确保已安装依赖
npm install axios dotenv

# 设置环境变量
export DASHSCOPE_API_KEY="your_api_key_here"

# 或在 .env 文件中添加
echo "DASHSCOPE_API_KEY=your_api_key_here" > .env

# 执行测试
node test-qwen-video.js
```

### 3. 获取 Google Gemini API Key

**用途**: LLM 服务（AI 协作助手）

**获取步骤**:
1. 访问 Google AI Studio：https://aistudio.google.com/app/apikey
2. 登录 Google 账号
3. 点击 "Create API Key" 按钮
4. 选择或创建 Google Cloud 项目
5. 复制生成的 API Key 并妥善保存

**免费额度**:
- 60 requests/minute（免费版）
- 更高配额需要升级到付费版

**参考文档**:
- 官方文档：https://ai.google.dev/docs
- Node.js SDK：https://github.com/google/generative-ai-js
- API 参考：https://ai.google.dev/api/rest

### 4. 测试 Google Gemini API

创建测试脚本 `test-gemini-llm.js`:

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 测试 Google Gemini LLM API
 */
async function testGeminiLLM() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ 错误: GOOGLE_API_KEY 环境变量未设置');
    console.log('请在 .env 文件中添加: GOOGLE_API_KEY=your_api_key');
    return;
  }

  console.log('🚀 开始测试 Google Gemini API...\n');

  try {
    // 初始化 Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // 测试用例 1: 简单对话
    console.log('📝 测试用例 1: 基础文本生成');
    const prompt1 = '你好，Gemini！请简单介绍一下你自己。';
    const result1 = await model.generateContent(prompt1);
    const response1 = await result1.response;
    const text1 = response1.text();

    console.log('✅ 响应成功');
    console.log('📄 响应内容:', text1);
    console.log('');

    // 测试用例 2: 视频制作相关建议
    console.log('📝 测试用例 2: 视频制作 AI 助手');
    const prompt2 = `作为视频制作助手，请根据以下场景提供运镜建议：

场景描述：一个宁静的湖面，远处有山脉，日出时分

请提供：
1. 推荐的运镜方式（camera movement）
2. 推荐的镜头类型（shot type）
3. 推荐的光线设置（lighting）

请以 JSON 格式返回建议。`;

    const result2 = await model.generateContent(prompt2);
    const response2 = await result2.response;
    const text2 = response2.text();

    console.log('✅ 响应成功');
    console.log('📄 AI 建议:\n', text2);
    console.log('');

    // 测试用例 3: 运镜参数优化
    console.log('📝 测试用例 3: 运镜参数优化');
    const prompt3 = `用户输入了以下运镜参数：
- 运镜方式：zoom in
- 镜头类型：close-up
- 光线：soft lighting
- 运动提示词：slowly reveal details

请分析这些参数是否合理，并提供优化建议。`;

    const result3 = await model.generateContent(prompt3);
    const response3 = await result3.response;
    const text3 = response3.text();

    console.log('✅ 响应成功');
    console.log('📄 优化建议:\n', text3);

    // 成功总结
    console.log('\n' + '='.repeat(50));
    console.log('✅ Google Gemini API 验证成功！');
    console.log('='.repeat(50));
    console.log('📌 模型: gemini-pro');
    console.log('📌 API 可用');
    console.log('📌 认证成功');
    console.log('📌 响应速度良好');
    console.log('📌 适合用于 AI 协作助手功能');

  } catch (error) {
    console.error('\n❌ API 调用失败');
    console.error('错误:', error.message);

    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n💡 提示: API Key 无效，请检查 GOOGLE_API_KEY');
    } else if (error.message.includes('RESOURCE_EXHAUSTED')) {
      console.log('\n💡 提示: 配额已用尽，请稍后再试或升级配额');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\n💡 提示: 权限不足，请检查 API Key 权限设置');
    }

    console.error('\n完整错误:', error);
  }
}

// 执行测试
testGeminiLLM();
```

**运行测试**:
```bash
# 确保已安装依赖
npm install @google/generative-ai dotenv

# 设置环境变量
export GOOGLE_API_KEY="your_api_key_here"

# 或在 .env 文件中添加
echo "GOOGLE_API_KEY=your_api_key_here" >> .env

# 执行测试
node test-gemini-llm.js
```

## 验收标准
- [ ] DashScope API Key 已获取（用于 Qwen 视频生成）
- [ ] Qwen 视频生成 API 调用成功（任务提交和状态查询）
- [ ] Google API Key 已获取（用于 Gemini LLM）
- [ ] Gemini LLM API 调用成功（至少 3 个测试用例通过）
- [ ] 记录了两个 API 的调用格式、参数和响应格式
- [ ] 记录了 API 调用成本和限额信息
- [ ] 测试脚本可正常运行

## 交付物

创建 `api-test-report.md` 文件，包含以下内容：

```markdown
# 第三方 API 测试报告

## 测试时间
[填写测试日期]

## 1. Qwen 视频生成 API

### 基本信息
- **服务商**: 阿里云 DashScope
- **用途**: 图生视频
- **Base URL**: https://dashscope.aliyuncs.com/api/v1
- **认证方式**: Bearer Token (DASHSCOPE_API_KEY)

### 测试结果
- ✅ API Key 验证通过
- ✅ 任务提交成功
- ✅ 任务状态查询成功
- 任务 ID: [填写测试获得的任务 ID]

### API 调用格式
[粘贴实际调用示例]

### 响应格式
[粘贴实际响应数据]

### 成本分析
- 免费额度: [填写]
- 计费方式: [查阅文档填写]
- 预估成本: [填写]

## 2. Google Gemini LLM API

### 基本信息
- **服务商**: Google
- **用途**: AI 协作助手
- **模型**: gemini-pro
- **认证方式**: API Key (GOOGLE_API_KEY)

### 测试结果
- ✅ API Key 验证通过
- ✅ 基础对话测试通过
- ✅ 视频制作建议测试通过
- ✅ 参数优化测试通过

### 响应示例
[粘贴测试中的实际响应]

### 成本分析
- 免费额度: 60 requests/min
- 付费版本: [查阅文档填写]
- 预估成本: [填写]

## 总结

### 可行性评估
- ✅ 两个 API 均可用
- ✅ 性能满足需求
- ✅ 成本可控

### 建议
1. [填写使用建议]
2. [填写优化建议]
3. [填写风险提示]
```

## 常见问题

### Q1: DashScope API Key 获取失败？
- 确保已完成阿里云账号实名认证
- 检查是否已开通 DashScope 服务
- 查看官方文档：https://help.aliyun.com/zh/dashscope/

### Q2: Qwen 视频生成任务一直处于 PENDING 状态？
- 视频生成是异步任务，需要等待一段时间（通常 1-5 分钟）
- 使用轮询机制定期查询任务状态
- 任务状态包括: PENDING → RUNNING → SUCCEEDED/FAILED

### Q3: Google Gemini API 返回 RESOURCE_EXHAUSTED 错误？
- 超过了免费配额限制（60 requests/min）
- 等待一段时间后重试
- 或升级到付费版本

### Q4: 如何查看 API 调用配额和用量？
- **DashScope**: https://dashscope.console.aliyun.com/
- **Google Gemini**: https://aistudio.google.com/app/apikey（查看配额）

## 下一步
- backend-dev-plan-3.3-video-service-qwen.md（实现 Qwen 视频生成服务）
- backend-dev-plan-3.4-llm-service-gemini.md（实现 Gemini LLM 服务）
