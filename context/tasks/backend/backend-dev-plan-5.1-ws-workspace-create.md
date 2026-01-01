# 任务 5.1 - WebSocket创建工作空间协议
## 层级: 第5层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.2-websocket-server.md
## 并行: backend-dev-plan-5.2-ws-workspace-update.md, backend-dev-plan-5.3-ws-workspace-delete.md, backend-dev-plan-5.4-ws-workspace-reorder.md

创建 src/websocket/workspace-create.js:
```javascript
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleCreate(ws, data) {
  try {
    // 计算新的 order_index
    const maxOrder = await Workspace.findOne().sort({ order_index: -1 });
    const newOrder = (maxOrder?.order_index || 0) + 1;

    const workspace = await Workspace.create({
      order_index: newOrder,
      ...data
    });

    logger.info(`工作空间创建成功: ${workspace._id}`);

    ws.send(JSON.stringify({
      type: 'workspace.created',
      data: workspace
    }));
  } catch (error) {
    logger.error('创建失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
```

在 websocket/server.js 中添加:
```javascript
import { handleCreate } from './workspace-create.js';

case 'workspace.create':
  await handleCreate(ws, message.data);
  break;
```

验收: 发送 workspace.create 消息,返回 workspace.created
