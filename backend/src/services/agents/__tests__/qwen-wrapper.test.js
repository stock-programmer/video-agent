import { jest } from '@jest/globals';

// Mock the ChatAlibabaTongyi class before importing
const mockInvoke = jest.fn().mockResolvedValue({ content: 'test response' });

class MockChatAlibabaTongyi {
  constructor(config) {
    this.model = config.model;
    this.temperature = config.temperature;
    this.alibabaApiKey = config.alibabaApiKey;
  }

  // Use the shared mock invoke for all instances
  async invoke(input, options) {
    return mockInvoke(input, options);
  }
}

// Mock the module
jest.unstable_mockModule('@langchain/community/chat_models/alibaba_tongyi', () => ({
  ChatAlibabaTongyi: MockChatAlibabaTongyi
}));

// Import after mocking
const { QwenWithTools } = await import('../qwen-wrapper.js');

describe('QwenWithTools', () => {
  let qwen;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      model: 'qwen-plus',
      temperature: 0.3,
      alibabaApiKey: 'test-key-123'
    };

    qwen = new QwenWithTools(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with empty bound tools', () => {
      expect(qwen._boundTools).toEqual([]);
    });

    it('should store config properties', () => {
      expect(qwen.model).toBe('qwen-plus');
      expect(qwen.temperature).toBe(0.3);
      expect(qwen.alibabaApiKey).toBe('test-key-123');
    });
  });

  describe('bindTools', () => {
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
      expect(bound._boundTools[0].name).toBe('test_tool');
    });

    it('should not modify original instance', () => {
      const tools = [
        {
          name: 'test_tool',
          description: 'A test tool'
        }
      ];

      const bound = qwen.bindTools(tools);

      expect(bound._boundTools).toHaveLength(1);
      expect(qwen._boundTools).toHaveLength(0); // Original unchanged
    });

    it('should preserve model config in new instance', () => {
      const tools = [{ name: 'tool1', description: 'desc1' }];
      const bound = qwen.bindTools(tools);

      expect(bound.model).toBe('qwen-plus');
      expect(bound.temperature).toBe(0.3);
      expect(bound.alibabaApiKey).toBe('test-key-123');
    });

    it('should handle multiple tools', () => {
      const tools = [
        { name: 'tool1', description: 'desc1' },
        { name: 'tool2', description: 'desc2' },
        { name: 'tool3', description: 'desc3' }
      ];

      const bound = qwen.bindTools(tools);

      expect(bound._boundTools).toHaveLength(3);
    });

    it('should handle tools with func property', () => {
      const tools = [
        {
          func: {
            name: 'test_func',
            description: 'A test function',
            schema: { type: 'object' }
          }
        }
      ];

      const bound = qwen.bindTools(tools);

      expect(bound._boundTools).toHaveLength(1);
    });
  });

  describe('invoke', () => {
    beforeEach(() => {
      mockInvoke.mockClear();
    });

    it('should call parent invoke without tools', async () => {
      const input = [{ role: 'user', content: 'test message' }];

      await qwen.invoke(input);

      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should inject tool descriptions for array input', async () => {
      const tools = [
        {
          name: 'tool1',
          description: 'desc1',
          schema: { type: 'object', properties: { param1: { type: 'string' } } }
        }
      ];

      const bound = qwen.bindTools(tools);
      const input = [{ role: 'user', content: 'test' }];

      await bound.invoke(input);

      expect(mockInvoke).toHaveBeenCalled();
      const callArgs = mockInvoke.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs[0].role).toBe('system');
      expect(callArgs[0].content).toContain('You have access to the following tools');
      expect(callArgs[0].content).toContain('tool1');
      expect(callArgs[0].content).toContain('desc1');
      expect(callArgs[1]).toEqual({ role: 'user', content: 'test' });
    });

    it('should inject tool descriptions for object input', async () => {
      const tools = [{ name: 'tool2', description: 'desc2' }];
      const bound = qwen.bindTools(tools);
      const input = {
        messages: [{ role: 'user', content: 'test' }]
      };

      await bound.invoke(input);

      expect(mockInvoke).toHaveBeenCalled();
      const callArgs = mockInvoke.mock.calls[0][0];
      expect(callArgs.messages).toBeDefined();
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[0].content).toContain('You have access to the following tools');
      expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'test' });
    });

    it('should handle tools with no schema', async () => {
      const tools = [
        {
          name: 'simple_tool',
          description: 'A simple tool without schema'
        }
      ];

      const bound = qwen.bindTools(tools);
      const input = [{ role: 'user', content: 'test' }];

      await bound.invoke(input);

      expect(mockInvoke).toHaveBeenCalled();
      const callArgs = mockInvoke.mock.calls[0][0];
      expect(callArgs[0].content).toContain('No parameters');
    });

    it('should handle multiple tools in system message', async () => {
      const tools = [
        { name: 'tool1', description: 'desc1', schema: { type: 'object' } },
        { name: 'tool2', description: 'desc2', schema: { type: 'object' } },
        { name: 'tool3', description: 'desc3', schema: { type: 'object' } }
      ];

      const bound = qwen.bindTools(tools);
      const input = [{ role: 'user', content: 'test' }];

      await bound.invoke(input);

      const callArgs = mockInvoke.mock.calls[0][0];
      expect(callArgs[0].content).toContain('Tool 1: tool1');
      expect(callArgs[0].content).toContain('Tool 2: tool2');
      expect(callArgs[0].content).toContain('Tool 3: tool3');
    });

    it('should return response from parent invoke', async () => {
      const expectedResponse = { content: 'test response from LLM' };
      mockInvoke.mockResolvedValueOnce(expectedResponse);

      const input = [{ role: 'user', content: 'test' }];
      const result = await qwen.invoke(input);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors from parent invoke', async () => {
      const error = new Error('API call failed');
      error.code = 'API_ERROR';
      mockInvoke.mockRejectedValueOnce(error);

      const input = [{ role: 'user', content: 'test' }];

      await expect(qwen.invoke(input)).rejects.toThrow('API call failed');
    });

    it('should not inject tools if no tools are bound', async () => {
      const input = [{ role: 'user', content: 'test' }];

      await qwen.invoke(input);

      const callArgs = mockInvoke.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs[0].role).not.toBe('system');
      expect(callArgs[0].role).toBe('user');
    });

    it('should handle tools with func property', async () => {
      const tools = [
        {
          func: {
            name: 'func_tool',
            description: 'A tool defined with func',
            schema: { type: 'string' }
          }
        }
      ];

      const bound = qwen.bindTools(tools);
      const input = [{ role: 'user', content: 'test' }];

      await bound.invoke(input);

      const callArgs = mockInvoke.mock.calls[0][0];
      expect(callArgs[0].content).toContain('func_tool');
      expect(callArgs[0].content).toContain('A tool defined with func');
    });
  });

  describe('integration with parent class', () => {
    it('should be instance of MockChatAlibabaTongyi', () => {
      expect(qwen).toBeInstanceOf(MockChatAlibabaTongyi);
    });

    it('should be instance of QwenWithTools', () => {
      expect(qwen).toBeInstanceOf(QwenWithTools);
    });
  });
});
