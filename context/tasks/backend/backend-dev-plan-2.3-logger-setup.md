# 后端任务 2.3 - 日志系统设置

## 层级
第2层

## 依赖
- backend-dev-plan-1.1-install-dependencies.md

## 并行任务
- backend-dev-plan-2.1-project-init.md
- backend-dev-plan-2.2-config-management.md
- backend-dev-plan-2.4-database-setup.md

## 任务目标
使用 Winston 实现日志系统

## 执行步骤

### 1. 创建 src/utils/logger.js
```javascript
import winston from 'winston';
import path from 'path';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) return `[${timestamp}] ${level}: ${message}\n${stack}`;
    return `[${timestamp}] ${level}: ${message}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        format
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format
    })
  ]
});

export default logger;
```

### 2. 测试日志
创建 `test-logger.js`:
```javascript
import logger from './src/utils/logger.js';

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

运行:
```bash
node test-logger.js
cat logs/combined.log
```

## 验收标准
- [ ] `src/utils/logger.js` 已创建
- [ ] 支持 debug/info/warn/error 级别
- [ ] 控制台输出带颜色
- [ ] 日志文件正常写入
- [ ] `node test-logger.js` 测试通过

## 下一步
- backend-dev-plan-3.1-express-server.md
- backend-dev-plan-3.2-websocket-server.md
- backend-dev-plan-3.3-video-service-runway.md
