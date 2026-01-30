import OSS from 'ali-oss';
import path from 'path';
import config from '../config.js';
import logger from './logger.js';

/**
 * 阿里云 OSS 工具模块
 * 封装 ali-oss SDK，提供上传、下载、获取 URL 等操作
 *
 * 支持公开bucket和私有bucket两种模式:
 * - 公开bucket: 返回标准公开URL，任何人都可访问
 * - 私有bucket: 返回签名URL，在有效期内可访问（推荐用于生产环境）
 *
 * 配置项:
 * - OSS_USE_PRIVATE_BUCKET=true: 启用私有bucket模式
 * - OSS_SIGNED_URL_EXPIRY=3600: 签名URL过期时间（秒，默认1小时）
 *
 * Bucket: image-to-video-333
 */

// ============================================================
// OSS Client 初始化
// ============================================================

let ossClient = null;

/**
 * 获取或初始化 OSS Client 单例
 */
function getClient() {
  if (ossClient) return ossClient;

  const { region, accessKeyId, accessKeySecret, bucket } = config.oss;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 未配置，请检查 .env 文件');
  }

  ossClient = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    secure: true,  // 强制使用HTTPS协议（必须！阿里云OSS要求）
  });

  logger.info(`OSS Client 初始化成功: region=${region}, bucket=${bucket}`);
  return ossClient;
}

// ============================================================
// 上传操作
// ============================================================

/**
 * 上传 Buffer 到 OSS
 * @param {Buffer} buffer - 文件内容
 * @param {string} objectName - OSS 中的完整对象路径 (如 uploads/images/xxx.jpg)
 * @param {string} [contentType] - MIME 类型
 * @returns {Promise<string>} 访问 URL（根据配置返回公开URL或签名URL）
 */
export async function uploadBuffer(buffer, objectName, contentType) {
  const client = getClient();

  logger.info(`开始上传到 OSS: objectName=${objectName}, size=${buffer.length} bytes`);

  try {
    const options = {};

    if (contentType) {
      options.headers = { 'Content-Type': contentType };
    }

    // 注意：对象将继承 Bucket 的 ACL 设置
    // 支持公开bucket（public-read）和私有bucket（private）
    await client.put(objectName, buffer, options);

    const url = await getAccessUrl(objectName);
    logger.info(`上传成功: objectName=${objectName}, url=${url}`);
    return url;
  } catch (error) {
    logger.error(`上传到 OSS 失败: objectName=${objectName}`, {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    throw error;
  }
}

/**
 * 上传 Stream 到 OSS (用于视频下载后转传)
 * @param {ReadableStream} stream - 输入流
 * @param {string} objectName - OSS 中的完整对象路径
 * @param {number} [size] - 已知文件大小 (字节)，未知可省略
 * @returns {Promise<string>} 访问 URL（根据配置返回公开URL或签名URL）
 */
export async function uploadStream(stream, objectName, size) {
  const client = getClient();

  logger.info(`开始以 Stream 方式上传到 OSS: objectName=${objectName}`);

  try {
    const options = {};

    if (size) {
      options.headers = { 'Content-Length': size.toString() };
    }

    // 注意：对象将继承 Bucket 的 ACL 设置
    // 支持公开bucket（public-read）和私有bucket（private）
    await client.put(objectName, stream, options);

    const url = await getAccessUrl(objectName);
    logger.info(`Stream 上传成功: objectName=${objectName}, url=${url}`);
    return url;
  } catch (error) {
    logger.error(`Stream 上传到 OSS 失败: objectName=${objectName}`, {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    throw error;
  }
}

/**
 * 上传图片文件到 OSS
 * @param {Buffer} buffer - 图片内容
 * @param {string} filename - 原始文件名 (如 1705123456789-a7f8e9c2.jpg)
 * @param {string} [contentType] - MIME 类型
 * @returns {Promise<string>} 公开访问 URL
 */
export async function uploadImage(buffer, filename, contentType) {
  const objectName = config.oss.imagePath + filename;
  return uploadBuffer(buffer, objectName, contentType);
}

/**
 * 上传视频文件到 OSS
 * @param {Buffer|ReadableStream} data - 视频内容 (Buffer 或 Stream)
 * @param {string} filename - 文件名 (如 workspace_id_timestamp.mp4)
 * @returns {Promise<string>} 公开访问 URL
 */
export async function uploadVideo(data, filename) {
  const objectName = config.oss.videoPath + filename;
  if (Buffer.isBuffer(data)) {
    return uploadBuffer(data, objectName, 'video/mp4');
  }
  return uploadStream(data, objectName);
}

// ============================================================
// URL 构建
// ============================================================

/**
 * 构建 OSS 对象的公开访问 URL
 * @param {string} objectName - OSS 对象路径
 * @returns {string} 完整的公开 URL
 */
export function getPublicUrl(objectName) {
  const { region, bucket } = config.oss;

  // 处理 region 格式：如果已包含 'oss-' 前缀则直接使用，否则添加
  // region 可能是 'oss-cn-beijing' 或 'cn-beijing'
  const regionWithPrefix = region.startsWith('oss-') ? region : `oss-${region}`;

  // 标准公开 URL 格式: https://{bucket}.{region}.aliyuncs.com/{objectName}
  return `https://${bucket}.${regionWithPrefix}.aliyuncs.com/${objectName}`;
}

/**
 * 生成签名URL（用于私有bucket访问）
 * 即使bucket设置为私有，用户也可以通过签名URL在有效期内访问
 * @param {string} objectName - OSS 对象路径
 * @param {number} [expires] - 过期时间（秒），默认使用配置值
 * @returns {Promise<string>} 带签名的临时访问URL
 */
export async function getSignedUrl(objectName, expires) {
  const client = getClient();
  const expiryTime = expires || config.oss.signedUrlExpiry;

  try {
    // signatureUrl 生成带签名的临时访问链接
    // 签名URL格式: https://{bucket}.{region}.aliyuncs.com/{objectName}?Expires=xxx&OSSAccessKeyId=xxx&Signature=xxx
    const signedUrl = client.signatureUrl(objectName, {
      expires: expiryTime,
      method: 'GET',  // 明确指定GET方法
    });

    // 确保URL使用HTTPS协议（双重保险）
    const httpsUrl = signedUrl.replace(/^http:\/\//i, 'https://');

    logger.debug(`生成签名URL: objectName=${objectName}, expires=${expiryTime}s`);
    return httpsUrl;
  } catch (error) {
    logger.error(`生成签名URL失败: objectName=${objectName}`, {
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

/**
 * 根据配置智能返回访问URL
 * - 如果配置为私有bucket，返回签名URL
 * - 如果配置为公开bucket，返回公开URL
 * @param {string} objectName - OSS 对象路径
 * @param {number} [expires] - 签名URL过期时间（仅私有bucket时使用）
 * @returns {Promise<string>} 访问URL
 */
export async function getAccessUrl(objectName, expires) {
  if (config.oss.usePrivateBucket) {
    return await getSignedUrl(objectName, expires);
  }
  return getPublicUrl(objectName);
}

// ============================================================
// 连接测试
// ============================================================

/**
 * 测试 OSS 连接是否正常
 * 用于启动时验证配置
 */
export async function testConnection() {
  const client = getClient();
  try {
    const result = await client.getBucketInfo();
    logger.info(`OSS 连接测试成功: bucket=${result.data?.name || config.oss.bucket}`);
    return true;
  } catch (error) {
    logger.error('OSS 连接测试失败:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    return false;
  }
}
