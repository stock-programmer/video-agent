# 后端任务 4.1 - 图片上传API

## 层级
第4层

## 依赖
- backend-dev-plan-2.4-database-setup.md
- backend-dev-plan-3.1-express-server.md

## 并行任务
- backend-dev-plan-4.2-api-get-workspaces.md
- backend-dev-plan-4.3-api-generate-video.md
- backend-dev-plan-4.4-api-ai-suggest.md

## 任务目标
实现图片上传API

## 执行步骤

### 创建 src/api/upload-image.js
```javascript
import multer from 'multer';
import path from 'path';
import config from '../config.js';
import logger from '../utils/logger.js';

// 配置存储
const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSize }
});

// API处理函数
export const uploadImage = upload.single('image');

export async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const result = {
      image_path: req.file.path,
      image_url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    };

    logger.info(`图片上传成功: ${req.file.filename}`);
    res.json(result);
  } catch (error) {
    logger.error('图片上传失败:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 在 server.js 中注册路由
```javascript
import { uploadImage, handleUpload } from './api/upload-image.js';

app.post('/api/upload/image', uploadImage, handleUpload);
```

## 验收标准
- [ ] Postman 测试上传成功
- [ ] 文件保存到 uploads/ 目录
- [ ] 返回正确的 URL
- [ ] 文件大小限制生效
- [ ] 文件类型验证生效

## 下一步
- backend-dev-plan-6.1-integration-testing.md
