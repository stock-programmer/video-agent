# 任务 4.4 - AI建议API
## 层级: 第4层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.1-express-server.md, backend-dev-plan-3.4-llm-service-openai.md
## 并行: backend-dev-plan-4.1-api-upload-image.md, backend-dev-plan-4.2-api-get-workspaces.md, backend-dev-plan-4.3-api-generate-video.md

创建 src/api/ai-suggest.js:
```javascript
import { suggest } from '../services/llm-openai.js';
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function getAISuggestion(req, res) {
  try {
    const { workspace_id, user_input } = req.body;
    
    const workspace = await Workspace.findById(workspace_id);
    if (!workspace) {
      return res.status(404).json({ error: '工作空间不存在' });
    }

    const suggestion = await suggest(workspace, user_input);
    
    // 保存协作历史
    workspace.ai_collaboration.push({
      user_input,
      ai_suggestion: suggestion
    });
    await workspace.save();
    
    logger.info(`AI建议获取成功: ${workspace_id}`);
    res.json(suggestion);
  } catch (error) {
    logger.error('AI建议失败:', error);
    res.status(500).json({ error: error.message });
  }
}
```

注册路由:
```javascript
import { getAISuggestion } from './api/ai-suggest.js';
app.post('/api/ai/suggest', getAISuggestion);
```

验收: POST /api/ai/suggest 返回建议对象
