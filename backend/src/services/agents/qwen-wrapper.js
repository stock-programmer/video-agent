import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import logger from '../../utils/logger.js';

/**
 * QwenWithTools - 支持 tool binding 的 Qwen LLM wrapper
 *
 * 封装通义千问 LLM，支持：
 * - Tool binding (工具绑定)
 * - 自动注入工具描述到 system message
 * - 完整的日志记录
 *
 * 参考: context/third-part/job-assistant-qwen.js (lines 23-71)
 */
class QwenWithTools extends ChatAlibabaTongyi {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   * @param {string} config.model - 模型名称 (e.g., 'qwen-plus')
   * @param {number} config.temperature - 温度参数 (0-1)
   * @param {string} config.alibabaApiKey - 阿里云 API Key
   */
  constructor(config) {
    super(config);
    this._boundTools = [];

    logger.debug('QwenWithTools initialized', {
      model: config.model,
      temperature: config.temperature,
      hasApiKey: !!config.alibabaApiKey
    });
  }

  /**
   * 绑定工具到模型
   * @param {Array} tools - 工具数组
   * @returns {QwenWithTools} 新实例 (不修改原实例)
   */
  bindTools(tools) {
    logger.debug('Binding tools to Qwen model', {
      toolCount: tools.length,
      toolNames: tools.map(t => t.name || t.func?.name)
    });

    // 创建新实例，保持不可变性
    const instance = new QwenWithTools({
      model: this.model,
      temperature: this.temperature,
      alibabaApiKey: this.alibabaApiKey
    });

    instance._boundTools = tools;

    logger.info('Tools bound successfully', {
      toolCount: tools.length
    });

    return instance;
  }

  /**
   * 调用模型 (重写父类方法)
   * @param {Array|Object} input - 输入消息
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 模型响应
   */
  async invoke(input, options) {
    const startTime = Date.now();

    logger.debug('QwenWithTools invoke called', {
      hasTools: this._boundTools && this._boundTools.length > 0,
      inputType: Array.isArray(input) ? 'array' : 'object',
      toolCount: this._boundTools?.length || 0
    });

    // 如果有绑定的工具,注入工具描述到 system message
    if (this._boundTools && this._boundTools.length > 0) {
      const toolDescriptions = this._boundTools
        .map((tool, index) => {
          const schema = tool.schema || tool.func?.schema;
          const name = tool.name || tool.func?.name;
          const description = tool.description || tool.func?.description;

          return `Tool ${index + 1}: ${name}
Description: ${description}
Parameters: ${schema ? JSON.stringify(schema, null, 2) : 'No parameters'}`;
        })
        .join('\n\n');

      const systemMessage = `You have access to the following tools:

${toolDescriptions}

When you need to use a tool, respond with a JSON object in this format:
{
  "tool": "tool_name",
  "parameters": { ... }
}`;

      logger.debug('Injecting tool descriptions into system message', {
        toolCount: this._boundTools.length,
        systemMessageLength: systemMessage.length
      });

      // 注入 system message
      if (Array.isArray(input)) {
        input = [{ role: 'system', content: systemMessage }, ...input];
      } else if (input.messages) {
        input.messages = [
          { role: 'system', content: systemMessage },
          ...input.messages
        ];
      }
    }

    // 日志请求
    logger.debug('Calling parent ChatAlibabaTongyi.invoke', {
      model: this.model,
      temperature: this.temperature
    });

    try {
      const result = await super.invoke(input, options);
      const duration = Date.now() - startTime;

      logger.info('Qwen LLM invoke completed', {
        duration,
        responseLength: result.content?.length || 0,
        model: this.model
      });

      logger.debug('Qwen response preview', {
        content: result.content?.substring(0, 200)
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Qwen LLM invoke failed', {
        duration,
        error: error.message,
        model: this.model,
        errorCode: error.code,
        stack: error.stack
      });

      throw error;
    }
  }
}

export { QwenWithTools };
