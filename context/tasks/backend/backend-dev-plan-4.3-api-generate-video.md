# 任务 4.3 - 视频生成API
## 层级: 第4层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.1-express-server.md, backend-dev-plan-3.3-video-service-runway.md
## 并行: backend-dev-plan-4.1-api-upload-image.md, backend-dev-plan-4.2-api-get-workspaces.md, backend-dev-plan-4.4-api-ai-suggest.md

创建 src/api/generate-video.js:
```javascript
import { generate } from '../services/video-runway.js';
import logger from '../utils/logger.js';

export async function generateVideo(req, res) {
  try {
    const { workspace_id, form_data } = req.body;
    
    if (!workspace_id || !form_data) {
      return res.status(400).json({ error: '缺少参数' });
    }

    const result = await generate(workspace_id, form_data);
    
    logger.info(`视频生成任务创建: ${result.task_id}`);
    res.json(result);
  } catch (error) {
    logger.error('视频生成失败:', error);
    res.status(500).json({ error: error.message });
  }
}
```

注册路由:
```javascript
import { generateVideo } from './api/generate-video.js';
app.post('/api/generate/video', generateVideo);
```

验收: POST /api/generate/video 返回 task_id
