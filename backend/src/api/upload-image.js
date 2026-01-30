import multer from 'multer';
import path from 'path';
import config from '../config.js';
import logger from '../utils/logger.js';
import { uploadImage as uploadImageToOSS } from '../utils/oss.js';

// ============================================================
// Multer Storage Configuration
// ============================================================

/**
 * 使用 memoryStorage 将文件保存到内存
 * 之后上传到阿里云 OSS，不再写入本地磁盘
 */
const storage = multer.memoryStorage();

// ============================================================
// File Filter (Validation)
// ============================================================

/**
 * Filter uploaded files by MIME type
 * Only allowed image types can be uploaded
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = config.upload.allowedImageTypes;

  if (allowedTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file
    const error = new Error(
      `Unsupported file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`
    );
    error.status = 400;
    cb(error, false);
  }
};

// ============================================================
// Multer Upload Middleware
// ============================================================

/**
 * Configure multer upload middleware
 * - Single file upload with field name 'image'
 * - File size limit from config
 * - MIME type validation
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
  },
});

// ============================================================
// API Handler Functions
// ============================================================

/**
 * Multer middleware for single image upload
 * Field name: 'image'
 */
export const uploadImage = upload.single('image');

/**
 * Handle image upload response
 * 上传到阿里云 OSS，返回 OSS 公开 URL
 */
export async function handleUpload(req, res) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an image file with field name "image"',
      });
    }

    // 生成唯一文件名: timestamp-random-extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).slice(2, 10);
    const ext = path.extname(req.file.originalname);
    const filename = `${timestamp}-${randomString}${ext}`;

    logger.info(`图片上传中: filename=${filename}, size=${req.file.size} bytes, mimetype=${req.file.mimetype}`);

    // 上传到 OSS
    const imageUrl = await uploadImageToOSS(req.file.buffer, filename, req.file.mimetype);

    // Response data
    const result = {
      success: true,
      image_path: filename,          // 仅存储文件名，不再是本地路径
      image_url: imageUrl,           // OSS 公开 URL (前端和 Qwen API 均可访问)
      filename: filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    logger.info(`图片上传到 OSS 成功: filename=${filename}, url=${imageUrl}`);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Image upload failed:', error);

    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
}

/**
 * Error handler for multer errors
 * Catches file size and validation errors
 */
export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${config.upload.maxSize / 1024 / 1024}MB`,
        maxSize: config.upload.maxSize,
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Use field name "image" for file upload',
      });
    }

    // Other multer errors
    return res.status(400).json({
      error: 'Upload error',
      message: err.message,
    });
  }

  // File filter errors (MIME type validation)
  if (err && err.status === 400) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: err.message,
    });
  }

  // Pass other errors to global error handler
  next(err);
}
