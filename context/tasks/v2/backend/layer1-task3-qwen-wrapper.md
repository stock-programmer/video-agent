# Backend Layer 1 Task 3: 实现 QwenWithTools Wrapper

## 任务元数据

- **任务 ID**: `backend-v2-layer1-task3`
- **任务名称**: 实现 QwenWithTools Wrapper
- **所属层级**: Layer 1 - 基础工具模块
- **预计工时**: 2 小时
- **依赖任务**: 无 (Layer 1 起始任务)
- **可并行任务**: `layer1-task1`, `layer1-task2`

---

## 任务目标

实现 QwenWithTools 类,封装通义千问 LLM,支持 tool binding 和自定义系统消息注入。

**参考实现**: `context/third-part/job-assistant-qwen.js` (lines 23-71)

---

## 实现文件

**文件路径**: `backend/src/services/agents/qwen-wrapper.js`

---

## 实现代码

```javascript
// backend/src/services/agents/qwen-wrapper.js
const { ChatAlibabaTongyi } = require('@langchain/community/chat_models/alibaba_tongyi');
const logger = require('../../utils/logger');

/**
 * QwenWithTools - 支持 tool binding 的 Qwen LLM wrapper
 *
 * 参考: context/third-part/job-assistant-qwen.js
 */
class QwenWithTools extends ChatAlibabaTongyi {
  constructor(config) {
    super(config);
    this._boundTools = [];

    logger.debug('QwenWithTools initialized', {
      model: config.model,
      temperature: config.temperature
    });
  }

  /**
   * 绑定工具到模型
   * @param {Array} tools - 工具数组
   * @returns {QwenWithTools} 新实例
   */
  bindTools(tools) {
    logger.debug('Binding tools to Qwen model', {
      toolCount: tools.length,
      toolNames: tools.map(t => t.name || t.func?.name)
    });

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
      inputType: Array.isArray(input) ? 'array' : 'object'
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
        responseLength: result.content?.length || 0
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

module.exports = { QwenWithTools };
```

---

## 测试文件

```javascript
// backend/src/services/agents/__tests__/qwen-wrapper.test.js
const { QwenWithTools } = require('../qwen-wrapper');

jest.mock('@langchain/community/chat_models/alibaba_tongyi');

describe('QwenWithTools', () => {
  let qwen;

  beforeEach(() => {
    qwen = new QwenWithTools({
      model: 'qwen-plus',
      temperature: 0.3,
      alibabaApiKey: 'test-key'
    });
  });

  it('should initialize without tools', () => {
    expect(qwen._boundTools).toEqual([]);
  });

  it('should bind tools and return new instance', () => {
    const tools = [
      {
        name: 'test_tool',
        description: 'A test tool',
        schema: { type: 'object', properties: {} }
      }
    ];

    const bound = qwen.bindTools(tools);

    expect(bound).toBeInstanceOf(QwenWithTools);
    expect(bound._boundTools).toHaveLength(1);
    expect(qwen._boundTools).toHaveLength(0); // Original unchanged
  });

  it('should inject tool descriptions in invoke', async () => {
    const mockInvoke = jest.spyOn(Object.getPrototypeOf(QwenWithTools.prototype), 'invoke');
    mockInvoke.mockResolvedValue({ content: 'test response' });

    const tools = [{ name: 'tool1', description: 'desc1' }];
    const bound = qwen.bindTools(tools);

    await bound.invoke([{ role: 'user', content: 'test' }]);

    expect(mockInvoke).toHaveBeenCalled();
    const callArgs = mockInvoke.mock.calls[0][0];
    expect(callArgs[0].role).toBe('system');
    expect(callArgs[0].content).toContain('You have access to the following tools');
  });
});
```

---

## 验收标准

- [ ] QwenWithTools 类继承 ChatAlibabaTongyi
- [ ] bindTools() 返回新实例,不修改原实例
- [ ] invoke() 正确注入工具描述到 system message
- [ ] 完整日志记录 (初始化、绑定、调用、错误)
- [ ] 单元测试覆盖率 ≥ 85%

---

## 参考文档

- `context/third-part/job-assistant-qwen.js` - 原始实现 (lines 23-71)
- `context/tasks/v2/v2-agent-system-design.md` - Agent 通信协议
