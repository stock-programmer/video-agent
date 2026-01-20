// backend/src/services/__tests__/qwen-vl.test.js
import { jest } from '@jest/globals';

// Mock axios before importing the module
const mockAxios = {
  post: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Use unstable_mockModule for ES modules
jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger
}));

// Import after mocking
const { analyzeVideoWithQwenVL } = await import('../qwen-vl.js');

describe('Qwen VL Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeVideoWithQwenVL', () => {
    it('should successfully analyze video', async () => {
      const mockResponse = {
        status: 200,
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

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await analyzeVideoWithQwenVL(
        'http://localhost:3000/uploads/test.mp4',
        'Describe this video'
      );

      expect(result.description).toBe('A person walking slowly in a park');
      expect(result.raw_response).toBe('A person walking slowly in a park');
      expect(result.parsed_analysis).toBeNull();
      expect(mockAxios.post).toHaveBeenCalledTimes(1);

      // Verify API call parameters
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        expect.objectContaining({
          model: 'qwen-vl-max',
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  { video: 'http://localhost:3000/uploads/test.mp4' },
                  { text: 'Describe this video' }
                ]
              }
            ]
          },
          parameters: {
            result_format: 'message'
          }
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          timeout: 60000
        })
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting Qwen VL video analysis',
        expect.objectContaining({
          videoUrl: 'http://localhost:3000/uploads/test.mp4'
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Qwen VL analysis completed successfully',
        expect.any(Object)
      );
    });

    it('should parse JSON from response content', async () => {
      const mockResponse = {
        status: 200,
        data: {
          output: {
            choices: [
              {
                message: {
                  content: 'Video analysis: {"scene": "park", "action": "walking", "speed": "slow"}'
                }
              }
            ]
          }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await analyzeVideoWithQwenVL(
        'http://localhost:3000/uploads/test.mp4',
        'Describe this video as JSON'
      );

      expect(result.parsed_analysis).toEqual({
        scene: 'park',
        action: 'walking',
        speed: 'slow'
      });
      expect(result.description).toContain('Video analysis:');
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockError = new Error('Network error');
      const mockResponse = {
        status: 200,
        data: {
          output: {
            choices: [
              {
                message: {
                  content: 'Success after retry'
                }
              }
            ]
          }
        }
      };

      mockAxios.post
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const result = await analyzeVideoWithQwenVL(
        'http://localhost:3000/uploads/test.mp4',
        'Describe this video'
      );

      expect(result.description).toBe('Success after retry');
      expect(mockAxios.post).toHaveBeenCalledTimes(3);

      // Verify retry logging
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrying Qwen VL API call',
        expect.objectContaining({
          nextAttempt: 2
        })
      );
    });

    it('should throw error after max retries', async () => {
      const mockError = new Error('API error');
      mockAxios.post.mockRejectedValue(mockError);

      await expect(
        analyzeVideoWithQwenVL(
          'http://localhost:3000/uploads/test.mp4',
          'Describe this video'
        )
      ).rejects.toThrow('Video analysis failed after 3 retries: API error');

      expect(mockAxios.post).toHaveBeenCalledTimes(3);

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Qwen VL analysis failed after all retries',
        expect.objectContaining({
          videoUrl: 'http://localhost:3000/uploads/test.mp4',
          retries: 3
        })
      );
    });

    it('should handle API error with response data', async () => {
      const mockError = {
        message: 'API request failed',
        code: 'ERR_BAD_REQUEST',
        response: {
          status: 400,
          data: {
            error: 'Invalid video URL'
          }
        }
      };

      mockAxios.post.mockRejectedValue(mockError);

      await expect(
        analyzeVideoWithQwenVL(
          'http://localhost:3000/uploads/invalid.mp4',
          'Describe this video'
        )
      ).rejects.toThrow();

      // Verify detailed error logging
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Qwen VL API call failed',
        expect.objectContaining({
          errorMessage: 'API request failed',
          errorCode: 'ERR_BAD_REQUEST',
          responseStatus: 400,
          responseData: {
            error: 'Invalid video URL'
          }
        })
      );
    });

    it('should use exponential backoff for retries', async () => {
      jest.useFakeTimers();

      const mockError = new Error('Temporary error');
      const mockResponse = {
        status: 200,
        data: {
          output: {
            choices: [{ message: { content: 'Success' } }]
          }
        }
      };

      mockAxios.post
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const promise = analyzeVideoWithQwenVL('test.mp4', 'prompt');

      // First retry: 2000ms delay (2000 * 1)
      await jest.advanceTimersByTimeAsync(2000);

      // Second retry: 4000ms delay (2000 * 2)
      await jest.advanceTimersByTimeAsync(4000);

      const result = await promise;

      expect(result.description).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrying Qwen VL API call',
        expect.objectContaining({
          delay: 2000,
          nextAttempt: 2
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrying Qwen VL API call',
        expect.objectContaining({
          delay: 4000,
          nextAttempt: 3
        })
      );

      jest.useRealTimers();
    });

    it('should handle timeout correctly', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxios.post.mockRejectedValue(timeoutError);

      await expect(
        analyzeVideoWithQwenVL('test.mp4', 'prompt')
      ).rejects.toThrow();

      // Verify timeout was set in axios call
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 60000
        })
      );
    });

    it('should handle malformed JSON in response gracefully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          output: {
            choices: [
              {
                message: {
                  content: 'Analysis: {invalid json here} more text'
                }
              }
            ]
          }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await analyzeVideoWithQwenVL('test.mp4', 'prompt');

      // Should fall back to plain text parsing
      expect(result.parsed_analysis).toBeNull();
      expect(result.description).toBe('Analysis: {invalid json here} more text');

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to parse JSON from response',
        expect.any(Object)
      );
    });
  });
});
