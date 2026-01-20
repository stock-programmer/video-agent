# Backend Layer 5 Task 1: 完善错误处理和日志

## 任务元数据

- **任务 ID**: `backend-v2-layer5-task1`
- **任务名称**: 完善错误处理和日志
- **所属层级**: Layer 5 - 错误处理与日志
- **预计工时**: 3 小时
- **依赖任务**: B-L4-T3 (Server Integration)
- **可并行任务**: B-L5-T2 (Database Schema)

---

## 任务目标

完善 v2.0 所有模块的错误处理和日志记录,确保可观测性和可调试性。

**核心功能**:
- 统一错误处理中间件
- 全面的请求/响应日志
- 外部 API 调用日志
- Agent 执行轨迹日志
- 错误分类和上报

---

## 实现文件

**新增文件**:
- `backend/src/utils/error-handler.js`
- `backend/src/utils/error-types.js`

**更新文件**:
- `backend/src/app.js`
- `backend/src/utils/logger.js`

---

## 实现步骤

### Step 1: 定义错误类型

```javascript
// backend/src/utils/error-types.js

/**
 * 基础错误类
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // 区分运营错误和编程错误

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误 (400)
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * 资源未找到 (404)
 */
class NotFoundError extends AppError {
  constructor(resource, identifier) {
    super(`${resource} not found: ${identifier}`, 404, 'NOT_FOUND');
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * 外部 API 错误 (502)
 */
class ExternalAPIError extends AppError {
  constructor(service, message, originalError) {
    super(`${service} API error: ${message}`, 502, 'EXTERNAL_API_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Agent 执行错误 (500)
 */
class AgentExecutionError extends AppError {
  constructor(agent, phase, message, originalError) {
    super(`${agent} failed at ${phase}: ${message}`, 500, 'AGENT_EXECUTION_ERROR');
    this.agent = agent;
    this.phase = phase;
    this.originalError = originalError;
  }
}

/**
 * 超时错误 (408)
 */
class TimeoutError extends AppError {
  constructor(operation, timeout) {
    super(`${operation} timed out after ${timeout}ms`, 408, 'TIMEOUT_ERROR');
    this.operation = operation;
    this.timeout = timeout;
  }
}

/**
 * Human-in-the-Loop 错误 (400)
 */
class HumanLoopError extends AppError {
  constructor(message) {
    super(message, 400, 'HUMAN_LOOP_ERROR');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalAPIError,
  AgentExecutionError,
  TimeoutError,
  HumanLoopError
};
```

### Step 2: 实现错误处理中间件

```javascript
// backend/src/utils/error-handler.js
const logger = require('./logger');
const { AppError } = require('./error-types');

/**
 * 统一错误处理中间件
 */
function errorHandler(err, req, res, next) {
  const startTime = req._startTime || Date.now();
  const duration = Date.now() - startTime;

  // 如果是 AppError,使用预定义的状态码和错误码
  if (err instanceof AppError) {
    logger.error('Operational error', {
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      message: err.message,
      url: req.url,
      method: req.method,
      duration,
      details: err.details || {},
      stack: err.stack
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }

  // 处理 Mongoose 验证错误
  if (err.name === 'ValidationError') {
    logger.error('Mongoose validation error', {
      url: req.url,
      method: req.method,
      errors: err.errors,
      duration
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors
      }
    });
  }

  // 处理 MongoDB duplicate key 错误
  if (err.code === 11000) {
    logger.error('MongoDB duplicate key error', {
      url: req.url,
      method: req.method,
      keyPattern: err.keyPattern,
      keyValue: err.keyValue,
      duration
    });

    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Resource already exists',
        details: { field: Object.keys(err.keyPattern)[0] }
      }
    });
  }

  // 未知错误 (编程错误)
  logger.error('Unexpected error', {
    url: req.url,
    method: req.method,
    error: err.message,
    stack: err.stack,
    duration
  });

  // 生产环境不暴露详细错误
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message
    }
  });
}

/**
 * 404 处理
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`
    }
  });
}

/**
 * 请求日志中间件 (记录开始时间)
 */
function requestLogger(req, res, next) {
  req._startTime = Date.now();

  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - req._startTime;

    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
}

/**
 * 异步路由错误捕获
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
  asyncHandler
};
```

### Step 3: 增强 Logger 配置

```javascript
// backend/src/utils/logger.js (更新)
const winston = require('winston');
const path = require('path');

// 日志级别定义
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Console 格式 (开发环境)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, metadata } = info;
    const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${meta}`;
  })
);

// Transport 配置
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  }),

  // 所有日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format,
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }),

  // 错误日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format,
    maxsize: 10485760,
    maxFiles: 5
  }),

  // v2.0: Agent 执行日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/agent.log'),
    format,
    level: 'info',
    maxsize: 10485760,
    maxFiles: 3
  })
];

// 创建 logger
const logger = winston.createLogger({
  levels,
  format,
  transports,
  exitOnError: false
});

// 添加 Agent 专用日志方法
logger.agent = (phase, message, metadata = {}) => {
  logger.info(`[AGENT] [${phase}] ${message}`, metadata);
};

// 添加外部 API 调用日志方法
logger.externalAPI = (service, action, metadata = {}) => {
  logger.info(`[API] [${service}] ${action}`, metadata);
};

module.exports = logger;
```

### Step 4: 更新 App.js 集成错误处理

```javascript
// backend/src/app.js (更新错误处理部分)

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const {
  errorHandler,
  notFoundHandler,
  requestLogger
} = require('./utils/error-handler');

// ... 导入路由 ...

const app = express();

// ========== 中间件 ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件 (放在最前面)
app.use(requestLogger);

// ========== 路由 ==========
// ... 所有路由 ...

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ========== 错误处理 (放在最后) ==========
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
```

### Step 5: 更新 Agent 模块使用新的错误类型

```javascript
// backend/src/services/prompt-optimizer.js (更新错误处理示例)

const {
  NotFoundError,
  AgentExecutionError,
  HumanLoopError,
  TimeoutError
} = require('../utils/error-types');

async function optimizePrompt(workspaceId, wsBroadcast) {
  logger.info('Starting prompt optimization', { workspaceId });

  try {
    // 获取 workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId);
    }

    // 意图分析
    try {
      const intentReport = await executeIntentAnalysis(workspace);
    } catch (error) {
      throw new AgentExecutionError(
        'IntentAgent',
        'analysis',
        error.message,
        error
      );
    }

    // Human-in-the-Loop
    const userConfirmed = await waitForHumanConfirmation(workspaceId, 300000);
    if (!userConfirmed) {
      throw new HumanLoopError('User did not confirm intent analysis');
    }

    // ... 继续流程 ...

  } catch (error) {
    logger.error('Prompt optimization failed', {
      workspaceId,
      errorType: error.constructor.name,
      error: error.message
    });

    wsBroadcast(workspaceId, {
      type: 'optimization_error',
      error: {
        code: error.errorCode || 'UNKNOWN_ERROR',
        message: error.message
      }
    });

    throw error;
  }
}
```

### Step 6: 测试错误处理

```javascript
// backend/src/utils/__tests__/error-handler.test.js
const { errorHandler, notFoundHandler } = require('../error-handler');
const {
  ValidationError,
  NotFoundError,
  AgentExecutionError
} = require('../error-types');

jest.mock('../logger');

describe('Error Handler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      _startTime: Date.now()
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  it('should handle ValidationError', () => {
    const error = new ValidationError('Invalid input', {
      field: 'workspace_id'
    });

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'workspace_id' }
      }
    });
  });

  it('should handle NotFoundError', () => {
    const error = new NotFoundError('Workspace', 'test-id');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Workspace not found: test-id'
      }
    });
  });

  it('should handle AgentExecutionError', () => {
    const error = new AgentExecutionError(
      'IntentAgent',
      'analysis',
      'Failed to parse',
      new Error('Original error')
    );

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        code: 'AGENT_EXECUTION_ERROR',
        message: expect.stringContaining('IntentAgent failed at analysis')
      })
    });
  });

  it('should handle 404', () => {
    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Cannot GET /api/test'
      }
    });
  });
});
```

---

## 验收标准

- [ ] 所有错误类型定义完整 (7 个自定义错误类)
- [ ] 统一错误处理中间件正常工作
- [ ] 所有 Agent 模块使用新的错误类型
- [ ] 请求/响应日志完整
- [ ] Agent 执行日志单独文件记录
- [ ] 外部 API 调用有专用日志方法
- [ ] 404 和 500 错误正确处理
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd backend
npm test -- error-handler.test.js
npm test -- error-types.test.js
```

---

## 参考文档

- `CLAUDE.md` - Comprehensive Request/Response Logging
- `context/tasks/v2/v2-backend-architecture.md` - 错误处理设计
