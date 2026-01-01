# 任务 5.4 - WebSocket排序工作空间协议
## 层级: 第5层
## 依赖: backend-dev-plan-2.4-database-setup.md, backend-dev-plan-3.2-websocket-server.md
## 并行: backend-dev-plan-5.1-ws-workspace-create.md, backend-dev-plan-5.2-ws-workspace-update.md, backend-dev-plan-5.3-ws-workspace-delete.md

创建 src/websocket/workspace-reorder.js:
```javascript
import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

export async function handleReorder(ws, data) {
  try {
    const { new_order } = data; // [{id, order_index}, ...]

    const bulkOps = new_order.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order_index: item.order_index } }
      }
    }));

    await Workspace.bulkWrite(bulkOps);

    logger.info(`工作空间排序完成: ${new_order.length}个`);

    ws.send(JSON.stringify({
      type: 'workspace.reorder_confirm'
    }));
  } catch (error) {
    logger.error('排序失败:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}
```

验收: 发送 workspace.reorder 消息,返回 workspace.reorder_confirm
