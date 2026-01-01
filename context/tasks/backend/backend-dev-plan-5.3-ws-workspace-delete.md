# 任务 5.3 - WebSocket删除工作空间协议
## 层级: 第5层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.2-websocket-server.md
## 并行: backend-dev-plan-5.1-ws-workspace-create.md, backend-dev-plan-5.2-ws-workspace-update.md, backend-dev-plan-5.4-ws-workspace-reorder.md

创建 src/websocket/workspace-delete.js:
```javascript
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleDelete(ws, data) {
  try {
    const { workspace_id } = data;

    await Workspace.findByIdAndDelete(workspace_id);

    logger.info(`工作空间删除: ${workspace_id}`);

    ws.send(JSON.stringify({
      type: 'workspace.deleted',
      workspace_id
    }));
  } catch (error) {
    logger.error('删除失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
```

验收: 发送 workspace.delete 消息,返回 workspace.deleted
