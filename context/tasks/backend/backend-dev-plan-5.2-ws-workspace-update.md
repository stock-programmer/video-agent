# 任务 5.2 - WebSocket更新工作空间协议
## 层级: 第5层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.2-websocket-server.md
## 并行: backend-dev-plan-5.1-ws-workspace-create.md, backend-dev-plan-5.3-ws-workspace-delete.md, backend-dev-plan-5.4-ws-workspace-reorder.md

创建 src/websocket/workspace-update.js:
```javascript
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleUpdate(ws, data) {
  try {
    const { workspace_id, updates } = data;

    await Workspace.findByIdAndUpdate(
      workspace_id,
      { $set: updates },
      { new: true }
    );

    logger.debug(`工作空间更新: ${workspace_id}`);

    ws.send(JSON.stringify({
      type: 'workspace.sync_confirm',
      workspace_id
    }));
  } catch (error) {
    logger.error('更新失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
```

注册到 websocket/server.js
验收: 发送 workspace.update 消息,返回 workspace.sync_confirm
