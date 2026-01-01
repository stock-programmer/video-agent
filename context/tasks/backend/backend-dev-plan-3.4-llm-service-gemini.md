# 后端任务 3.4 - Google Gemini LLM服务

## 层级
第3层

## 依赖
- backend-dev-plan-1.2-verify-third-party-apis.md
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.3-logger-setup.md
- backend-dev-plan-2.4-database-setup.md

## 并行任务
- backend-dev-plan-3.1-express-server.md
- backend-dev-plan-3.2-websocket-server.md
- backend-dev-plan-3.3-video-service-qwen.md

## 任务目标
实现 Google Gemini AI协作建议服务

## 参考文档
- `context/backend-architecture-modules.md`
- Google Gemini 官方文档: https://ai.google.dev/docs
- Node.js SDK: https://github.com/google/generative-ai-js

## 执行步骤

### 1. 安装 Google Gemini SDK

```bash
npm install @google/generative-ai
```

### 2. 创建 src/services/llm-gemini.js

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Google Gemini LLM 服务
 * 用于 AI 协作助手功能，提供视频参数优化建议
 */

// 初始化 Gemini AI
let genAI;
let model;

function initializeGemini() {
  if (!genAI) {
    const apiKey = config.apiKeys.google;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY 未配置');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: config.gemini.model || 'gemini-pro'
    });

    logger.info('Gemini AI 初始化成功');
  }
  return model;
}

// 获取AI建议
export async function suggest(workspaceData, userInput) {
  try {
    const model = initializeGemini();
    const prompt = buildPrompt(workspaceData, userInput);

    logger.info('请求 Gemini AI 建议', { userInput });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    logger.info('Gemini AI 建议获取成功');
    logger.debug('AI 响应内容', { content });

    // 解析返回的建议
    const suggestion = parseAISuggestion(content);

    return suggestion;
  } catch (error) {
    logger.error('Gemini AI 建议获取失败:', error);

    // 处理特定错误
    if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Google API Key 无效，请检查配置');
    } else if (error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API 配额已用尽，请稍后再试');
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      throw new Error('API 权限不足，请检查 API Key 权限');
    }

    throw error;
  }
}

// 构建 prompt
function buildPrompt(workspaceData, userInput) {
  const currentParams = {
    image: workspaceData.image_url || '未上传',
    cameraMovement: workspaceData.form_data?.camera_movement || '未设置',
    shotType: workspaceData.form_data?.shot_type || '未设置',
    lighting: workspaceData.form_data?.lighting || '未设置',
    motionPrompt: workspaceData.form_data?.motion_prompt || '未设置',
    hasVideo: !!workspaceData.video?.url
  };

  return `你是一个专业的视频制作助手，帮助用户优化图生视频的参数配置。

【当前视频参数】
- 图片: ${currentParams.image}
- 运镜方式: ${currentParams.cameraMovement}
- 景别: ${currentParams.shotType}
- 光线: ${currentParams.lighting}
- 主体运动: ${currentParams.motionPrompt}
${currentParams.hasVideo ? `- 已生成视频: ${workspaceData.video.url}` : '- 尚未生成视频'}

【用户需求】
${userInput}

【请提供建议】
请分析用户的需求，基于当前参数给出优化建议。

返回格式要求（必须是有效的 JSON）:
{
  "camera_movement": "建议的运镜方式（如: push_forward, pull_back, pan_left, pan_right, zoom_in, zoom_out, static 等）",
  "shot_type": "建议的景别（如: close_up, medium_shot, wide_shot, extreme_close_up, full_shot 等）",
  "lighting": "建议的光线（如: natural, soft, hard, backlight, golden_hour 等）",
  "motion_prompt": "建议的主体运动描述（详细描述画面中的动作和变化，中文描述）",
  "explanation": "为什么这样建议（中文解释）"
}

注意：
1. 所有字段都必须提供，不能为空
2. camera_movement, shot_type, lighting 必须使用英文下划线格式（如 push_forward）
3. motion_prompt 和 explanation 使用中文详细描述
4. 确保返回的是有效的 JSON 格式`;
}

// 解析AI返回的建议
function parseAISuggestion(content) {
  try {
    // 尝试提取 JSON 部分（可能被 markdown 代码块包裹）
    let jsonStr = content;

    // 移除可能的 markdown 代码块标记
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // 尝试找到 JSON 对象
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // 验证必需字段
      const requiredFields = [
        'camera_movement',
        'shot_type',
        'lighting',
        'motion_prompt',
        'explanation'
      ];

      const missingFields = requiredFields.filter(field => !parsed[field]);
      if (missingFields.length > 0) {
        logger.warn('AI 返回缺少字段:', missingFields);
      }

      // 返回结构化建议
      return {
        camera_movement: parsed.camera_movement || null,
        shot_type: parsed.shot_type || null,
        lighting: parsed.lighting || null,
        motion_prompt: parsed.motion_prompt || null,
        explanation: parsed.explanation || '建议已生成'
      };
    }

    // 如果无法解析为 JSON，尝试从文本中提取信息
    logger.warn('无法解析 JSON，返回纯文本建议');
    return {
      camera_movement: null,
      shot_type: null,
      lighting: null,
      motion_prompt: null,
      explanation: content
    };
  } catch (error) {
    logger.error('AI 返回格式解析失败:', error);
    logger.debug('原始内容:', content);

    // 返回原文作为 explanation
    return {
      camera_movement: null,
      shot_type: null,
      lighting: null,
      motion_prompt: null,
      explanation: content
    };
  }
}

// 获取快速建议（基于场景预设）
export async function quickSuggest(sceneType) {
  const presets = {
    dramatic: {
      camera_movement: 'zoom_in',
      shot_type: 'close_up',
      lighting: 'hard',
      motion_prompt: '情绪激烈的动作，快速变化',
      explanation: '戏剧性场景适合使用特写和硬光，配合放大镜头增强情绪张力'
    },
    peaceful: {
      camera_movement: 'static',
      shot_type: 'wide_shot',
      lighting: 'soft',
      motion_prompt: '缓慢柔和的动作，宁静祥和',
      explanation: '平静场景适合使用远景和柔光，静止镜头营造安宁氛围'
    },
    dynamic: {
      camera_movement: 'push_forward',
      shot_type: 'medium_shot',
      lighting: 'natural',
      motion_prompt: '活力四射的运动，充满能量',
      explanation: '动感场景适合推进镜头和中景，自然光线展现真实感'
    }
  };

  const preset = presets[sceneType];
  if (preset) {
    logger.info(`返回预设建议: ${sceneType}`);
    return preset;
  }

  throw new Error(`未知场景类型: ${sceneType}`);
}
```

### 3. 更新配置文件 src/config.js

确保配置文件包含 Gemini 相关配置：

```javascript
// Gemini LLM 配置
gemini: {
  model: process.env.GEMINI_MODEL || 'gemini-pro'
},

// API Keys
apiKeys: {
  dashscope: process.env.DASHSCOPE_API_KEY,
  google: process.env.GOOGLE_API_KEY
}
```

### 4. 测试服务

创建 `test-llm-service.js`:

```javascript
import { suggest, quickSuggest } from './src/services/llm-gemini.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    console.log('=== 测试 Gemini LLM 服务 ===\n');

    // 测试 1: 基于现有参数的优化建议
    console.log('测试 1: 优化建议');
    const workspaceData = {
      image_url: 'http://example.com/test.jpg',
      form_data: {
        camera_movement: 'static',
        shot_type: 'medium_shot',
        lighting: 'natural',
        motion_prompt: 'person standing still'
      }
    };

    const userInput = '视频太静态了，想要更有动感和戏剧性';

    const suggestion = await suggest(workspaceData, userInput);
    console.log('✅ AI 建议:');
    console.log(JSON.stringify(suggestion, null, 2));
    console.log('');

    // 测试 2: 快速预设建议
    console.log('测试 2: 快速预设建议');
    const dramaticSuggestion = await quickSuggest('dramatic');
    console.log('✅ 戏剧性场景建议:');
    console.log(JSON.stringify(dramaticSuggestion, null, 2));
    console.log('');

    const peacefulSuggestion = await quickSuggest('peaceful');
    console.log('✅ 平静场景建议:');
    console.log(JSON.stringify(peacefulSuggestion, null, 2));

    console.log('\n=== 所有测试通过 ===');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

test();
```

运行测试:
```bash
node test-llm-service.js
```

### 5. 测试不同场景

创建 `test-llm-scenarios.js` 测试更多场景:

```javascript
import { suggest } from './src/services/llm-gemini.js';
import dotenv from 'dotenv';

dotenv.config();

const scenarios = [
  {
    name: '增加动感',
    workspace: {
      form_data: {
        camera_movement: 'static',
        shot_type: 'wide_shot',
        lighting: 'natural',
        motion_prompt: '静止的风景'
      }
    },
    userInput: '让画面更有动感'
  },
  {
    name: '优化光线',
    workspace: {
      form_data: {
        camera_movement: 'push_forward',
        shot_type: 'close_up',
        lighting: 'hard',
        motion_prompt: '人物特写'
      }
    },
    userInput: '光线太硬了，想要柔和一些'
  },
  {
    name: '调整景别',
    workspace: {
      form_data: {
        camera_movement: 'zoom_in',
        shot_type: 'extreme_close_up',
        lighting: 'soft',
        motion_prompt: '细节展示'
      }
    },
    userInput: '想要展示更多的环境背景'
  }
];

async function testScenarios() {
  for (const scenario of scenarios) {
    console.log(`\n=== 场景: ${scenario.name} ===`);
    console.log('用户输入:', scenario.userInput);

    try {
      const result = await suggest(scenario.workspace, scenario.userInput);
      console.log('AI 建议:');
      console.log(`  运镜: ${result.camera_movement}`);
      console.log(`  景别: ${result.shot_type}`);
      console.log(`  光线: ${result.lighting}`);
      console.log(`  主体运动: ${result.motion_prompt}`);
      console.log(`  说明: ${result.explanation}`);
    } catch (error) {
      console.error('❌ 失败:', error.message);
    }
  }
}

testScenarios();
```

## 验收标准
- [ ] `@google/generative-ai` 包已安装
- [ ] `src/services/llm-gemini.js` 已创建
- [ ] `suggest()` 方法调用成功
- [ ] Gemini AI 初始化正常
- [ ] Prompt 构建正确且详细
- [ ] AI 返回结构化建议（JSON 格式）
- [ ] JSON 解析正常，支持多种格式
- [ ] 错误处理完善（API Key 错误、配额错误、权限错误等）
- [ ] 快速预设建议功能正常
- [ ] 日志记录完整
- [ ] 测试脚本运行成功

## 常见问题

### Q1: 为什么使用 Gemini 而不是其他 LLM？
- **免费额度**: 60 requests/min 的免费配额
- **响应速度**: 快速响应，适合实时交互
- **多语言支持**: 支持中文提示词和响应
- **易于集成**: 官方 Node.js SDK 简单易用

### Q2: 如何确保 AI 返回 JSON 格式？
在 prompt 中明确要求 JSON 格式，并提供示例。解析时支持多种格式（纯 JSON、markdown 代码块包裹的 JSON）。

### Q3: 如果 API 配额用尽怎么办？
- 使用快速预设建议功能 (`quickSuggest`) 作为降级方案
- 捕获 `RESOURCE_EXHAUSTED` 错误并提示用户稍后再试
- 或升级到付费版本

### Q4: 如何优化 prompt 质量？
- 提供清晰的上下文（当前参数、用户需求）
- 明确输出格式要求
- 给出具体的参数选项和示例
- 使用中英文混合以提高准确性

### Q5: Gemini 支持哪些模型？
- `gemini-pro`: 文本生成（本项目使用）
- `gemini-pro-vision`: 多模态模型（支持图像理解）
- 可通过 `GEMINI_MODEL` 环境变量配置

## 性能优化建议

1. **缓存常见建议**: 对于相同的用户输入，可以缓存结果
2. **并发控制**: 限制同时请求数量，避免超过配额
3. **超时设置**: 设置合理的请求超时时间（建议 30 秒）
4. **降级策略**: 准备预设建议作为 API 失败时的备选方案

## 下一步
- backend-dev-plan-4.4-api-ai-suggest.md（实现 AI 建议 API 端点）
- backend-dev-plan-6.1-integration-testing.md（集成测试）
