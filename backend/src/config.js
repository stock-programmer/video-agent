import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Validate required environment variables
 * Throws error if critical configuration is missing
 */
function validateConfig() {
  const required = ['MONGODB_URI', 'SERVER_PORT', 'WS_PORT'];
  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate video provider has corresponding API key
  const videoProvider = process.env.VIDEO_PROVIDER || 'qwen';
  if (videoProvider === 'qwen' && !process.env.DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is required when VIDEO_PROVIDER is "qwen"');
  }

  // Validate LLM provider has corresponding API key
  const llmProvider = process.env.LLM_PROVIDER || 'gemini';
  if (llmProvider === 'gemini' && !process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required when LLM_PROVIDER is "gemini"');
  }
  if (llmProvider === 'qwen' && !process.env.DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is required when LLM_PROVIDER is "qwen"');
  }
}

// Validate configuration on module load
validateConfig();

/**
 * Application configuration object
 * Centralized configuration management for the entire backend
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server configuration
  server: {
    port: parseInt(process.env.SERVER_PORT, 10),
    wsPort: parseInt(process.env.WS_PORT, 10),
    // Base URL for constructing full URLs (for third-party API access)
    // Defaults to localhost in development, should be set to public URL in production
    baseUrl: process.env.SERVER_BASE_URL || `http://localhost:${parseInt(process.env.SERVER_PORT, 10) || 3000}`,
  },

  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  // Upload configuration
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10485760, // 10MB default
    dir: process.env.UPLOAD_DIR || './uploads',
    allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES
      ? process.env.ALLOWED_IMAGE_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'image/webp'],
  },

  // Logging configuration
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },

  // Video generation configuration
  video: {
    provider: process.env.VIDEO_PROVIDER || 'qwen',
    pollInterval: parseInt(process.env.VIDEO_POLL_INTERVAL, 10) || 5000, // 5 seconds
    timeout: parseInt(process.env.VIDEO_TIMEOUT, 10) || 600000, // 10 minutes
  },

  // LLM configuration
  llm: {
    provider: process.env.LLM_PROVIDER || 'gemini',
  },

  // WebSocket configuration
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) || 30000, // 30 seconds
    heartbeatTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT, 10) || 60000, // 60 seconds
  },

  // Third-party API keys
  apiKeys: {
    // Video generation services
    dashscope: process.env.DASHSCOPE_API_KEY, // Qwen/Alibaba Cloud

    // LLM services
    google: process.env.GOOGLE_API_KEY, // Google Gemini
  },

  // Qwen-specific configuration
  qwen: {
    videoModel: process.env.QWEN_VIDEO_MODEL || 'wan2.6-i2v',
    llmModel: process.env.QWEN_LLM_MODEL || 'qwen-plus', // qwen-plus, qwen-turbo, qwen-max
    baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  },

  // Gemini-specific configuration
  gemini: {
    model: process.env.GEMINI_MODEL || 'gemini-pro',
  },
};

export default config;
