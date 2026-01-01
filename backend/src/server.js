import express from 'express';
import cors from 'cors';
import config from './config.js';
import logger from './utils/logger.js';
import { connectDB } from './db/mongodb.js';
import { startWebSocketServer } from './websocket/server.js';
import { uploadImage, handleUpload, handleUploadError } from './api/upload-image.js';
import { getWorkspaces } from './api/get-workspaces.js';
import { generateVideo } from './api/generate-video.js';
import { getAISuggestion } from './api/ai-suggest.js';
import { hardDeleteWorkspace } from './api/hard-delete-workspace.js';

const app = express();

// ============================================================
// Middleware Configuration
// ============================================================

// CORS - Allow cross-origin requests from frontend
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON requests
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded requests

// Request logging middleware (development only)
if (config.isDevelopment) {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================================
// Static File Serving
// ============================================================

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// ============================================================
// Health Check Endpoint
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// ============================================================
// API Routes
// ============================================================

// Image upload API
app.post('/api/upload/image', uploadImage, handleUpload);

// Get workspaces API
app.get('/api/workspaces', getWorkspaces);

// Video generation API
app.post('/api/generate/video', generateVideo);

// AI suggestion API
app.post('/api/ai/suggest', getAISuggestion);

// Hard delete workspace API
app.delete('/api/workspace/:id/hard-delete', hardDeleteWorkspace);

// TODO: Add more API routes here in Layer 4

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Video Maker Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*',
      uploads: '/uploads/*',
    },
  });
});

// ============================================================
// Error Handling Middleware
// ============================================================

// Multer upload error handler (must come before 404 handler)
app.use(handleUploadError);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  // Don't expose internal errors in production
  const message = config.isProduction ? 'Internal Server Error' : err.message;
  const stack = config.isDevelopment ? err.stack : undefined;

  res.status(err.status || 500).json({
    error: err.name || 'Error',
    message,
    ...(stack && { stack }),
  });
});

// ============================================================
// Server Startup
// ============================================================

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Database connection established');

    // Start HTTP server
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 HTTP server started on http://localhost:${config.server.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Log level: ${config.log.level}`);
    });

    // Start WebSocket server
    startWebSocketServer();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export app for testing
export default app;
