// backend/src/services/qwen-vl.js
import axios from 'axios';
import logger from '../utils/logger.js';

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
      let content = response.data.output.choices[0].message.content;

      // Handle array response format (content can be array of {text: "..."})
      if (Array.isArray(content)) {
        logger.debug('Content is array, extracting text from first element', {
          arrayLength: content.length
        });

        // Extract text from first element if it exists
        if (content.length > 0 && content[0].text) {
          content = content[0].text;
        } else {
          throw new Error('Invalid content array format: missing text property');
        }
      }

      logger.info('Qwen VL analysis completed successfully', {
        contentLength: content.length,
        duration
      });

      // Return the raw text content directly (callers will parse it themselves)
      return content;

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

/**
 * 辅助函数: Sleep
 * @param {number} ms - 等待毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export {
  analyzeVideoWithQwenVL
};
