# Backend Layer 1 Task 1: 实现 Qwen VL 视频分析服务

## 任务元数据

- **任务 ID**: `backend-v2-layer1-task1`
- **任务名称**: 实现 Qwen VL 视频分析服务
- **所属层级**: Layer 1 - 基础工具模块
- **预计工时**: 3 小时
- **依赖任务**: 无 (Layer 1 起始任务)
- **可并行任务**: `layer1-task2`, `layer1-task3` (同 Layer 其他任务)

---

## 任务目标

实现 Qwen VL (视觉语言模型) 视频分析服务,用于分析已生成视频的内容、质量和技术指标。

**核心功能**:
- 调用 Qwen VL API 分析视频文件
- 解析 API 返回的视频描述和分析结果
- 实现错误处理和自动重试机制
- 提供完整的请求/响应日志记录

---

## 输入

- **视频 URL**: 已生成视频的访问 URL (本地路径或 OSS URL)
- **分析提示词**: 指导 Qwen VL 分析的 prompt
  - 示例: "Describe this video in detail: what is happening, how fast are movements, what is the camera doing?"

---

## 输出

**成功返回**:
```javascript
{
  description: string,           // 视频内容描述
  parsed_analysis: object,       // 解析后的结构化分析 (可选)
  raw_response: string          // 原始 API 响应
}
```

**错误返回**:
```javascript
{
  error: string,
  retries: number,
  last_error_details: object
}
```

---

## 实现文件

**文件路径**: `backend/src/services/qwen-vl.js`

---

## 实现步骤

### Step 1: 创建文件和基础结构

```javascript
// backend/src/services/qwen-vl.js
const axios = require('axios');
const logger = require('../utils/logger');

const QWEN_VL_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * 使用 Qwen VL 分析视频
 * @param {string} videoUrl - 视频文件 URL
 * @param {string} analysisPrompt - 分析提示词
 * @returns {Promise<object>} 分析结果
 */
async function analyzeVideoWithQwenVL(videoUrl, analysisPrompt) {
  // TODO: 实现
}

module.exports = {
  analyzeVideoWithQwenVL
};
```

### Step 2: 实现 API 调用逻辑

**重点**: 必须记录完整的请求和响应日志

```javascript
async function analyzeVideoWithQwenVL(videoUrl, analysisPrompt) {
  logger.info('Starting Qwen VL video analysis', {
    videoUrl,
    promptLength: analysisPrompt.length
  });

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug('Qwen VL API request attempt', {
        attempt,
        maxRetries: MAX_RETRIES
      });

      // 构建请求 payload
      const requestPayload = {
        model: 'qwen-vl-max',  // 或 qwen-vl-plus
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { video: videoUrl },
                { text: analysisPrompt }
              ]
            }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      };

      // 日志请求参数
      logger.debug('Qwen VL request payload', {
        model: requestPayload.model,
        videoUrl,
        prompt: analysisPrompt
      });

      // 发送请求
      const startTime = Date.now();
      const response = await axios.post(
        QWEN_VL_API_URL,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000  // 60 seconds timeout
        }
      );
      const duration = Date.now() - startTime;

      // 日志响应
      logger.info('Qwen VL API response received', {
        status: response.status,
        duration,
        attempt
      });

      logger.debug('Qwen VL response data', {
        data: response.data
      });

      // 解析结果
      const content = response.data.output.choices[0].message.content;

      logger.info('Qwen VL analysis completed successfully', {
        contentLength: content.length,
        duration
      });

      return parseVideoAnalysisResult(content);

    } catch (error) {
      lastError = error;

      logger.warn('Qwen VL API call failed', {
        attempt,
        maxRetries: MAX_RETRIES,
        errorMessage: error.message,
        errorCode: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      });

      // 如果不是最后一次尝试,等待后重试
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * attempt; // 指数退避
        logger.info('Retrying Qwen VL API call', { delay, nextAttempt: attempt + 1 });
        await sleep(delay);
      }
    }
  }

  // 所有重试失败
  logger.error('Qwen VL analysis failed after all retries', {
    videoUrl,
    retries: MAX_RETRIES,
    lastError: lastError.message,
    stack: lastError.stack
  });

  throw new Error(`Video analysis failed after ${MAX_RETRIES} retries: ${lastError.message}`);
}

// 辅助函数: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Step 3: 实现结果解析

```javascript
/**
 * 解析视频分析结果
 * @param {string} content - Qwen VL 返回的内容
 * @returns {object} 解析后的结果
 */
function parseVideoAnalysisResult(content) {
  logger.debug('Parsing video analysis result', {
    contentLength: content.length,
    preview: content.substring(0, 200)
  });

  // 尝试提取 JSON (如果 prompt 要求 JSON 格式)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      logger.debug('Successfully parsed JSON from response', { parsed });
      return {
        description: content,
        parsed_analysis: parsed,
        raw_response: content
      };
    } catch (e) {
      logger.warn('Failed to parse JSON from response', {
        error: e.message,
        jsonMatch: jsonMatch[0].substring(0, 100)
      });
    }
  }

  // Fallback: 返回原始文本
  return {
    description: content,
    parsed_analysis: null,
    raw_response: content
  };
}
```

### Step 4: 添加单元测试

```javascript
// backend/src/services/__tests__/qwen-vl.test.js
const { analyzeVideoWithQwenVL } = require('../qwen-vl');
const axios = require('axios');

jest.mock('axios');
jest.mock('../utils/logger');

describe('Qwen VL Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully analyze video', async () => {
    const mockResponse = {
      data: {
        output: {
          choices: [
            {
              message: {
                content: 'A person walking slowly in a park'
              }
            }
          ]
        }
      }
    };

    axios.post.mockResolvedValue(mockResponse);

    const result = await analyzeVideoWithQwenVL(
      'http://localhost:3000/uploads/test.mp4',
      'Describe this video'
    );

    expect(result.description).toBe('A person walking slowly in a park');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        data: {
          output: {
            choices: [{ message: { content: 'Success' } }]
          }
        }
      });

    const result = await analyzeVideoWithQwenVL('test.mp4', 'prompt');

    expect(result.description).toBe('Success');
    expect(axios.post).toHaveBeenCalledTimes(3);
  });

  it('should throw error after max retries', async () => {
    axios.post.mockRejectedValue(new Error('API error'));

    await expect(
      analyzeVideoWithQwenVL('test.mp4', 'prompt')
    ).rejects.toThrow('Video analysis failed after 3 retries');

    expect(axios.post).toHaveBeenCalledTimes(3);
  });
});
```

---

## 验收标准

### 功能验收

- [ ] 能够成功调用 Qwen VL API 并获取视频分析结果
- [ ] 正确解析 API 返回的内容 (JSON 或纯文本)
- [ ] 实现 3 次自动重试机制,指数退避延迟
- [ ] 超时设置为 60 秒
- [ ] 所有错误都能被正确捕获和记录

### 日志验收

- [ ] **请求日志**: 记录视频 URL、prompt、model 参数
- [ ] **响应日志**: 记录状态码、耗时、内容长度
- [ ] **错误日志**: 记录错误消息、错误码、响应数据、堆栈跟踪
- [ ] **重试日志**: 记录每次重试的 attempt 和延迟时间
- [ ] **性能日志**: 记录 API 调用总耗时

### 测试验收

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 测试成功调用场景
- [ ] 测试重试场景
- [ ] 测试最终失败场景
- [ ] 测试超时场景
- [ ] 所有测试通过

---

## 测试命令

```bash
# 运行单元测试
cd backend
npm test -- qwen-vl.test.js

# 运行覆盖率测试
npm test -- --coverage qwen-vl.test.js

# 手动测试 (需要真实 API key)
node -e "
const { analyzeVideoWithQwenVL } = require('./src/services/qwen-vl');
analyzeVideoWithQwenVL(
  'http://localhost:3000/uploads/test-video.mp4',
  'Describe this video in detail'
).then(console.log).catch(console.error);
"
```

---

## 参考文档

1. **技术设计**: `context/tasks/v2/v2-backend-architecture.md` - Qwen VL 服务部分
2. **API 文档**: `context/third-part/` (需补充 Qwen VL API 文档)
3. **开发计划**: `context/tasks/v2/v2-development-plan.md` - Phase 2, Layer 1, Task 1
4. **日志规范**: `CLAUDE.md` - Comprehensive Request/Response Logging

---

## 注意事项

### API Key 安全

- 不要在日志中记录完整的 API key
- 使用环境变量 `process.env.DASHSCOPE_API_KEY`
- API key 从不应出现在代码仓库中

### 视频 URL 访问

- 确保视频 URL 可被 Qwen VL API 访问
- 本地开发: 使用 ngrok 或类似工具暴露本地服务
- 生产环境: 使用 OSS 公网 URL

### 性能考虑

- Qwen VL 分析可能需要 10-30 秒
- 设置合理的超时时间 (60秒)
- 考虑添加取消机制 (可选)

---

## 下一步

完成此任务后,可并行进行:
- **Task 2**: 实现 Agent 辅助工具 (`layer1-task2-agent-helpers.md`)
- **Task 3**: 实现 QwenWithTools Wrapper (`layer1-task3-qwen-wrapper.md`)
