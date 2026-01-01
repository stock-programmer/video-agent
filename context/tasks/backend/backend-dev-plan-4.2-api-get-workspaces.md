# 任务 4.2 - 获取工作空间列表API
## 层级: 第4层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.1-express-server.md
## 并行: backend-dev-plan-4.1-api-upload-image.md, backend-dev-plan-4.3-api-generate-video.md, backend-dev-plan-4.4-api-ai-suggest.md

创建 src/api/get-workspaces.js:
```javascript
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function getWorkspaces(req, res) {
  try {
    const workspaces = await Workspace.find()
      .sort({ order_index: 1 })
      .lean();
    
    logger.info(`查询工作空间: ${workspaces.length}个`);
    res.json(workspaces);
  } catch (error) {
    logger.error('查询失败:', error);
    res.status(500).json({ error: error.message });
  }
}
```

注册路由:
```javascript
import { getWorkspaces } from './api/get-workspaces.js';
app.get('/api/workspaces', getWorkspaces);
```

验收: GET /api/workspaces 返回数组
