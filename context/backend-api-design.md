# API 和 WebSocket 通信设计

## 文档信息
- **版本号**：v1.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段设计

---

## 设计原则

1. **REST API 用于初始加载和资源操作**
2. **WebSocket 用于近实时状态同步**
3. **增量更新策略**：只发送变化的字段
4. **确认机制**：保证数据不丢失

---

## REST API 端点设计

### 1. 图片上传

```
POST /api/upload/image
功能：上传图片
Content-Type: multipart/form-data

请求参数：
  - image (File): 图片文件

响应：
{
  "success": true,
  "data": {
    "image_path": "uploads/abc123.jpg",
    "image_url": "/api/uploads/abc123.jpg"
  }
}

错误响应：
{
  "success": false,
  "error": "文件类型不支持"
}
```

**限制：**
- 文件大小：10MB
- 支持类型：image/jpeg, image/png, image/webp

---

### 2. 工作空间管理

#### 获取所有工作空间

```
GET /api/workspaces
功能：获取所有工作空间（页面初始加载）

响应：
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "_id": "xxx",
        "order_index": 0,
        "image_path": "uploads/abc.jpg",
        "image_url": "/api/uploads/abc.jpg",
        "form_data": {
          "camera_movement": "推进",
          "shot_type": "特写",
          "lighting": "自然光",
          "motion_prompt": "人物转身",
          "checkboxes": {}
        },
        "video": {
          "status": "completed",
          "task_id": "task_123",
          "url": "https://cdn.example.com/video.mp4",
          "error": null
        },
        "ai_collaboration": [],
        "created_at": "2025-12-24T00:00:00.000Z",
        "updated_at": "2025-12-24T01:00:00.000Z"
      }
    ]
  }
}
```

---

### 3. 图片访问

```
GET /api/uploads/:filename
功能：访问上传的图片

响应：图片文件流
Content-Type: image/jpeg | image/png | image/webp
```

---

### 4. 视频生成

```
POST /api/generate/video
功能：触发视频生成任务

请求：
{
  "workspace_id": "xxx",
  "image_url": "/api/uploads/abc.jpg",
  "params": {
    "camera_movement": "推进",
    "shot_type": "特写",
    "lighting": "自然光",
    "motion_prompt": "人物转身"
  }
}

响应：
{
  "success": true,
  "data": {
    "task_id": "task_123",
    "status": "generating"
  }
}

错误响应：
{
  "success": false,
  "error": "第三方API调用失败: 超时"
}
```

**说明：**
- 后端调用第三方API获取 task_id
- 立即更新 MongoDB 状态为 'generating'
- 启动后台轮询任务
- 通过 WebSocket 推送状态更新

---

### 5. AI 协作

```
POST /api/ai/suggest
功能：生成AI协作建议

请求：
{
  "workspace_id": "xxx",
  "user_input": "帮我优化运镜",
  "context": {
    "current_params": {
      "camera_movement": "推进",
      "shot_type": "特写"
    }
  }
}

响应：
{
  "success": true,
  "data": {
    "suggestions": {
      "camera_movement": "环绕",
      "reasoning": "环绕运镜可以更好地展现主体的空间感"
    }
  }
}
```

---

## WebSocket 通信设计

### 连接管理

**连接URL：**
```
ws://localhost:3001
```

**心跳检测：**
- 客户端每30秒发送 ping
- 服务器返回 pong
- 超时60秒未收到心跳则断开连接

**重连机制：**
- 断线后自动重连（指数退避：1s, 2s, 4s, 8s, ...）
- 最大重连次数：10次
- 重连成功后重新同步状态

---

### 消息格式

**统一格式：**
```json
{
  "type": "事件类型",
  "data": { 数据对象 },
  "timestamp": 1703433600000
}
```

---

### 客户端 → 服务器事件

#### 1. 创建工作空间

```json
{
  "type": "workspace.create",
  "data": {
    "order_index": 0
  }
}
```

**服务器响应：**
```json
{
  "type": "workspace.created",
  "data": {
    "workspace_id": "xxx",
    "order_index": 0,
    "created_at": "2025-12-24T00:00:00.000Z"
  }
}
```

---

#### 2. 增量更新工作空间

```json
{
  "type": "workspace.update",
  "data": {
    "workspace_id": "xxx",
    "updates": {
      "form_data.camera_movement": "推进",
      "form_data.motion_prompt": "人物转身"
    }
  }
}
```

**说明：**
- 使用点号路径表示嵌套字段
- 只发送变化的字段（增量更新）
- 前端使用 debounce（300ms）避免频繁发送

**服务器确认：**
```json
{
  "type": "workspace.sync_confirm",
  "data": {
    "workspace_id": "xxx",
    "updated_at": "2025-12-24T00:00:00.000Z"
  }
}
```

---

#### 3. 删除工作空间

```json
{
  "type": "workspace.delete",
  "data": {
    "workspace_id": "xxx"
  }
}
```

**服务器确认：**
```json
{
  "type": "workspace.deleted",
  "data": {
    "workspace_id": "xxx"
  }
}
```

---

#### 4. 调整工作空间顺序

```json
{
  "type": "workspace.reorder",
  "data": {
    "reorder_map": {
      "workspace_id_1": 0,
      "workspace_id_2": 1,
      "workspace_id_3": 2
    }
  }
}
```

**服务器确认：**
```json
{
  "type": "workspace.reorder_confirm",
  "data": {
    "success": true
  }
}
```

---

### 服务器 → 客户端事件

#### 1. 同步确认

```json
{
  "type": "workspace.sync_confirm",
  "data": {
    "workspace_id": "xxx",
    "updated_at": "2025-12-24T00:00:00.000Z"
  }
}
```

---

#### 2. 视频生成状态更新（主动推送）

```json
{
  "type": "video.status_update",
  "data": {
    "workspace_id": "xxx",
    "status": "completed",
    "video_url": "https://cdn.example.com/video.mp4",
    "updated_at": "2025-12-24T01:00:00.000Z"
  }
}
```

**状态枚举：**
- `pending`: 未开始
- `generating`: 生成中
- `completed`: 已完成
- `failed`: 失败

**失败时包含错误信息：**
```json
{
  "type": "video.status_update",
  "data": {
    "workspace_id": "xxx",
    "status": "failed",
    "error": "第三方API超时",
    "updated_at": "2025-12-24T01:00:00.000Z"
  }
}
```

---

#### 3. 错误通知

```json
{
  "type": "error",
  "data": {
    "message": "工作空间不存在",
    "code": "WORKSPACE_NOT_FOUND",
    "context": {
      "workspace_id": "xxx"
    }
  }
}
```

**错误代码：**
- `WORKSPACE_NOT_FOUND`: 工作空间不存在
- `INVALID_DATA`: 数据验证失败
- `DB_ERROR`: 数据库操作失败
- `THIRD_PARTY_ERROR`: 第三方API错误

---

## 近实时同步机制

### 工作流程

```
用户操作（填写表单）
  ↓
前端 State 更新
  ↓
debounce 300ms
  ↓
WebSocket 发送增量更新
  ↓
后端接收 WebSocket 消息
  ↓
解析增量更新字段
  ↓
MongoDB 写入（立即持久化）
  ↓
WebSocket 返回同步确认
  ↓
前端显示"已保存"提示
```

---

### 增量更新示例

**场景：** 用户修改运镜方式和提示词

**前端只发送变化的字段：**
```json
{
  "type": "workspace.update",
  "data": {
    "workspace_id": "abc123",
    "updates": {
      "form_data.camera_movement": "推进",
      "form_data.motion_prompt": "人物转身看向镜头"
    }
  }
}
```

**后端使用 MongoDB $set 操作：**
```javascript
await Workspace.updateOne(
  { _id: workspace_id },
  {
    $set: {
      'form_data.camera_movement': '推进',
      'form_data.motion_prompt': '人物转身看向镜头',
      'updated_at': new Date()
    }
  }
);
```

**优点：**
- 减少网络传输量
- 避免覆盖其他字段
- 提高更新效率

---

## 视频生成异步通知流程

```
1. 用户点击「提交生成」
   ↓
2. 前端调用 POST /api/generate/video
   ↓
3. 后端调用第三方API
   - 获取 task_id
   - 更新 MongoDB: video.status = 'generating'
   ↓
4. WebSocket 推送给前端
   {
     "type": "video.status_update",
     "data": {
       "workspace_id": "xxx",
       "status": "generating"
     }
   }
   ↓
5. 后端启动轮询任务（每5秒查询第三方API状态）
   ↓
6. 视频生成完成
   - 后端收到完成通知
   - 更新 MongoDB: video.status = 'completed', video.url = '...'
   ↓
7. WebSocket 推送给前端
   {
     "type": "video.status_update",
     "data": {
       "workspace_id": "xxx",
       "status": "completed",
       "video_url": "https://..."
     }
   }
   ↓
8. 前端自动更新UI，显示视频播放器
```

---

## 数据一致性保证

### 1. 乐观锁 + 时间戳

**机制：**
- 每次更新记录 `updated_at` 时间戳
- 前端发送更新时携带当前时间戳
- 后端检查时间戳，避免覆盖更新的数据

**实现：**
```javascript
// 前端发送
{
  "workspace_id": "xxx",
  "updates": { ... },
  "client_timestamp": 1703433600000
}

// 后端检查
const workspace = await Workspace.findById(workspace_id);
if (workspace.updated_at > client_timestamp) {
  // 数据已被更新，返回冲突错误
  return { type: 'error', data: { code: 'CONFLICT' } };
}
```

**MVP 阶段简化：**
- 单用户场景，冲突概率极低
- 直接覆盖更新，不做时间戳检查
- 未来多用户时再启用完整机制

---

### 2. WebSocket 确认机制

**流程：**
```
客户端发送更新 → 启动5秒超时计时器
  ↓
服务器处理完成 → 返回 sync_confirm
  ↓
客户端收到确认 → 清除计时器 → 显示"已保存"
  ↓
超时未收到确认 → 重试（最多3次）→ 显示"保存失败"
```

---

### 3. 断线重连策略

**前端行为：**
```javascript
// 检测断线
socket.on('close', () => {
  // 启动重连（指数退避）
  reconnect();
});

// 重连成功后
socket.on('open', () => {
  // 重新加载最新数据
  fetch('/api/workspaces').then(data => {
    // 更新本地状态
  });
});
```

**后端行为：**
- 清理断开的连接
- 停止该连接相关的推送任务
- 新连接建立时重新注册

---

## API 错误处理

### 统一错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "用户友好的错误提示",
    "details": { ... }  // 可选：详细信息
  }
}
```

---

### 错误类型

#### 客户端错误（4xx）

| HTTP状态码 | 错误代码 | 说明 |
|-----------|---------|------|
| 400 | INVALID_PARAMS | 参数验证失败 |
| 404 | WORKSPACE_NOT_FOUND | 工作空间不存在 |
| 413 | FILE_TOO_LARGE | 文件过大 |
| 415 | UNSUPPORTED_FILE_TYPE | 文件类型不支持 |

---

#### 服务器错误（5xx）

| HTTP状态码 | 错误代码 | 说明 |
|-----------|---------|------|
| 500 | DB_ERROR | 数据库操作失败 |
| 502 | THIRD_PARTY_ERROR | 第三方API调用失败 |
| 503 | SERVICE_UNAVAILABLE | 服务暂时不可用 |

---

## 性能优化

### 1. 消息节流（前端）

```javascript
// 使用 lodash debounce
const debouncedUpdate = debounce((updates) => {
  socket.send({
    type: 'workspace.update',
    data: { workspace_id, updates }
  });
}, 300);

// 用户输入时
onInputChange((field, value) => {
  debouncedUpdate({ [field]: value });
});
```

---

### 2. 批量更新（前端）

```javascript
// 累积变化
let pendingUpdates = {};

onInputChange((field, value) => {
  pendingUpdates[field] = value;
});

// 300ms 后发送所有累积的变化
debounce(() => {
  if (Object.keys(pendingUpdates).length > 0) {
    socket.send({
      type: 'workspace.update',
      data: { workspace_id, updates: pendingUpdates }
    });
    pendingUpdates = {};
  }
}, 300);
```

---

### 3. 连接池管理（后端）

```javascript
// 维护活跃连接Map
const activeConnections = new Map();

// 新连接
ws.on('connection', (socket) => {
  const connectionId = generateId();
  activeConnections.set(connectionId, socket);

  socket.on('close', () => {
    activeConnections.delete(connectionId);
  });
});

// 广播消息
function broadcast(message) {
  activeConnections.forEach(socket => {
    socket.send(JSON.stringify(message));
  });
}
```

---

## 总结

本设计的核心特点：

✅ **REST API 负责资源操作**：上传、查询、视频生成
✅ **WebSocket 负责状态同步**：增量更新、实时推送
✅ **确认机制保证可靠性**：超时重试、断线重连
✅ **增量更新提高效率**：只发送变化字段
✅ **统一错误处理**：清晰的错误代码和提示

适合快速迭代的 MVP 阶段，后续可根据实际使用情况优化。
