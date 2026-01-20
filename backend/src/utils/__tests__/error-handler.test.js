import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock modules
jest.unstable_mockModule(new URL('../logger.js', import.meta.url).href, () => ({
  default: mockLogger
}));

jest.unstable_mockModule(new URL('../error-types.js', import.meta.url).href, () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
      super(message);
      this.name = 'AppError';
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
      this.isOperational = true;
    }
    toJSON() {
      return {
        error: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details
      };
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = 'ValidationError';
      this.statusCode = 400;
      this.code = 'VALIDATION_ERROR';
      this.details = details;
      this.isOperational = true;
    }
    toJSON() {
      return {
        error: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details
      };
    }
  },
  isOperationalError: (err) => err.isOperational === true
}));

// Import after mocking
const {
  requestLogger,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  sendSuccess,
  sendError
} = await import('../error-handler.js');

const { AppError, ValidationError } = await import('../error-types.js');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      method: 'GET',
      path: '/api/test',
      query: { foo: 'bar' },
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        return null;
      })
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    // Mock next
    mockNext = jest.fn();
  });

  describe('requestLogger', () => {
    it('should log incoming request', () => {
      requestLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          query: { foo: 'bar' },
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0'
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log outgoing response with duration', () => {
      requestLogger(mockReq, mockRes, mockNext);

      // Simulate response
      mockRes.statusCode = 200;
      mockRes.send('response body');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Outgoing response',
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration: expect.stringMatching(/\d+ms/)
        })
      );
    });

    it('should call next middleware', () => {
      requestLogger(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with proper error format', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Route not found',
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          query: { foo: 'bar' }
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'NotFound',
        message: 'Cannot GET /api/test',
        code: 'ROUTE_NOT_FOUND',
        path: '/api/test'
      });
    });

    it('should handle POST requests', () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/users';

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot POST /api/users'
        })
      );
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle AppError instances', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { foo: 'bar' });

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Operational error',
        expect.objectContaining({
          error: 'AppError',
          message: 'Test error',
          code: 'TEST_ERROR',
          statusCode: 400
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AppError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: { foo: 'bar' }
      });
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'ValidationError',
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should handle Mongoose validation errors', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          name: { message: 'Name is required' }
        }
      };

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          email: 'Email is required',
          name: 'Name is required'
        }
      });
    });

    it('should handle Mongoose CastError', () => {
      const error = {
        name: 'CastError',
        kind: 'ObjectId',
        value: 'invalid-id',
        path: '_id'
      };

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ValidationError',
        message: 'Invalid ObjectId: invalid-id',
        code: 'INVALID_ID',
        details: { field: '_id', value: 'invalid-id' }
      });
    });

    it('should handle Multer errors', () => {
      const error = {
        name: 'MulterError',
        message: 'File too large',
        field: 'image'
      };

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UploadError',
        message: 'File too large',
        code: 'FILE_UPLOAD_ERROR',
        details: { field: 'image' }
      });
    });

    it('should handle unexpected errors', () => {
      const error = new Error('Unexpected error');

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error',
        expect.objectContaining({
          error: 'Error',
          message: 'Unexpected error',
          stack: expect.any(String)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal error');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal Server Error'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Dev error',
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async function and handle success', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        res.json({ success: true });
      });

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward errors to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn(async () => {
        throw error;
      });

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle rejected promises', async () => {
      const error = new Error('Promise rejected');
      const asyncFn = jest.fn(() => Promise.reject(error));

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendSuccess', () => {
    it('should send success response with default status', () => {
      const data = { id: 1, name: 'test' };
      sendSuccess(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      });
    });

    it('should send success with custom status code', () => {
      const data = { id: 1 };
      sendSuccess(mockRes, data, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('sendError', () => {
    it('should send AppError with proper format', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      sendError(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AppError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: {}
      });
    });

    it('should send standard Error with 500 status', () => {
      const error = new Error('Standard error');
      sendError(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error',
        message: 'Standard error',
        code: 'INTERNAL_ERROR'
      });
    });
  });
});
