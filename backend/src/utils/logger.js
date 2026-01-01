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
