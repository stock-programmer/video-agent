# v2.0 WebSocket 协议设计

## 文档概述

本文档定义 v2.0 优化流程中的 WebSocket 消息类型、格式、时序。

---

## 消息类型总览

### 服务器 → 客户端 (Server-to-Client)

| 消息类型 | 触发时机 | 用途 |
|---------|---------|------|
| `agent_start` | Agent 启动时 | 通知前端某个 Agent 开始执行 |
| `agent_progress` | Agent 执行过程中 | 流式推送 Agent 工作进度 |
| `agent_complete` | Agent 完成时 | 通知 Agent 执行完毕 |
| `intent_report` | Intent Analysis 完成 | 发送意图分析报告给用户确认 |
| `human_loop_pending` | 等待人工确认 | 提示用户需要确认意图 |
| `video_analysis` | Video Analysis 完成 | 发送视频分析结果 |
| `optimization_result` | 优化流程完成 | 发送最终优化方案 |
| `optimization_error` | 发生错误 | 通知优化失败 |

### 客户端 → 服务器 (Client-to-Server)

| 消息类型 | 触发时机 | 用途 |
|---------|---------|------|
| `human_confirm` | 用户确认意图后 | 发送确认/拒绝信号,继续或终止流程 |

---

## 消息格式详细定义

### 1. agent_start

**方向**: Server → Client

**时机**: Master Agent 或 Sub-Agent 启动时

**格式**:
```typescript
{
  type: 'agent_start',
  workspace_id: string,
  agent: 'master' | 'intent_analysis' | 'video_analysis',
  timestamp: string  // ISO 8601 format
}
```

**示例**:
```json
{
  "type": "agent_start",
  "workspace_id": "507f1f77bcf86cd799439011",
  "agent": "intent_analysis",
  "timestamp": "2025-01-15T10:30:15.000Z"
}
```

**前端处理**:
```typescript
case 'agent_start':
  addProgressMessage(data.workspace_id, {
    type: 'agent_start',
    agent: data.agent,
    message: getAgentStartMessage(data.agent),
    timestamp: data.timestamp
  });
```

**显示效果**:
```
🚀 [10:30:15] 意图分析 Agent 启动...
```

---

### 2. agent_progress

**方向**: Server → Client

**时机**: Agent 执行过程中的关键步骤

**格式**:
```typescript
{
  type: 'agent_progress',
  workspace_id: string,
  agent: string,
  message: string,
  timestamp: string
}
```

**示例**:
```json
{
  "type": "agent_progress",
  "workspace_id": "507f1f77bcf86cd799439011",
  "agent": "intent_analysis",
  "message": "正在分析用户输入参数...",
  "timestamp": "2025-01-15T10:30:16.500Z"
}
```

**前端处理**:
```typescript
case 'agent_progress':
  addProgressMessage(data.workspace_id, {
    type: 'agent_progress',
    agent: data.agent,
    message: data.message,
    timestamp: data.timestamp
  });
```

**显示效果**:
```
⚙️ [10:30:16] 正在分析用户输入参数...
⚙️ [10:30:18] 正在推断用户真实意图...
```

---

### 3. agent_complete

**方向**: Server → Client

**时机**: Agent 执行完成

**格式**:
```typescript
{
  type: 'agent_complete',
  workspace_id: string,
  agent: string,
  timestamp: string
}
```

**示例**:
```json
{
  "type": "agent_complete",
  "workspace_id": "507f1f77bcf86cd799439011",
  "agent": "intent_analysis",
  "timestamp": "2025-01-15T10:30:20.000Z"
}
```

**前端处理**:
```typescript
case 'agent_complete':
  addProgressMessage(data.workspace_id, {
    type: 'agent_complete',
    agent: data.agent,
    message: `${getAgentName(data.agent)} 完成`,
    timestamp: data.timestamp
  });
```

**显示效果**:
```
✅ [10:30:20] 意图分析完成
```

---

### 4. intent_report

**方向**: Server → Client

**时机**: Intent Analysis Sub-Agent 完成分析后

**格式**:
```typescript
{
  type: 'intent_report',
  workspace_id: string,
  data: {
    user_intent: {
      scene_description: string,
      desired_mood: string,
      key_elements: string[],
      motion_expectation: string,
      energy_level?: string
    },
    parameter_analysis?: {
      aligned: string[],
      potential_issues: string[]
    },
    confidence: number  // 0-1
  },
  timestamp: string
}
```

**示例**:
```json
{
  "type": "intent_report",
  "workspace_id": "507f1f77bcf86cd799439011",
  "data": {
    "user_intent": {
      "scene_description": "一个人站在公园里,周围有树木和自然光线,画面宁静舒适",
      "desired_mood": "平静、放松、悠闲",
      "key_elements": ["人物", "户外环境", "自然光", "树木背景"],
      "motion_expectation": "缓慢的步行动作,没有突然的快速移动",
      "energy_level": "低到中等(放松节奏)"
    },
    "parameter_analysis": {
      "aligned": ["自然光照设置与户外场景匹配"],
      "potential_issues": ["运动强度=3 可能与'slowly'不匹配"]
    },
    "confidence": 0.85
  },
  "timestamp": "2025-01-15T10:30:21.000Z"
}
```

**前端处理**:
```typescript
case 'intent_report':
  // 1. 存储意图报告到 Zustand store
  setIntentReport(data.workspace_id, data.data);

  // 2. 显示 IntentReportModal 弹窗
  showIntentConfirmationModal(data.workspace_id, data.data);
```

---

### 5. human_loop_pending

**方向**: Server → Client

**时机**: 发送意图报告后,等待用户确认

**格式**:
```typescript
{
  type: 'human_loop_pending',
  workspace_id: string,
  message: string,
  timestamp: string
}
```

**示例**:
```json
{
  "type": "human_loop_pending",
  "workspace_id": "507f1f77bcf86cd799439011",
  "message": "请确认意图分析结果是否准确",
  "timestamp": "2025-01-15T10:30:22.000Z"
}
```

**前端处理**:
```typescript
case 'human_loop_pending':
  addProgressMessage(data.workspace_id, {
    type: 'human_loop',
    message: data.message,
    timestamp: data.timestamp
  });
```

**显示效果**:
```
⏸️ [10:30:22] 等待用户确认意图分析结果...
```

---

### 6. human_confirm (Client → Server)

**方向**: Client → Server

**时机**: 用户在 IntentReportModal 中点击确认/拒绝按钮

**格式**:
```typescript
{
  type: 'human_confirm',
  workspace_id: string,
  confirmed: boolean,
  corrections?: {
    user_intent?: {
      scene_description?: string,
      desired_mood?: string,
      // ... 其他可修正字段
    }
  }
}
```

**示例 1: 确认无修正**
```json
{
  "type": "human_confirm",
  "workspace_id": "507f1f77bcf86cd799439011",
  "confirmed": true
}
```

**示例 2: 确认并修正**
```json
{
  "type": "human_confirm",
  "workspace_id": "507f1f77bcf86cd799439011",
  "confirmed": true,
  "corrections": {
    "user_intent": {
      "desired_mood": "欢快、活力"  // 用户修正了氛围
    }
  }
}
```

**示例 3: 拒绝**
```json
{
  "type": "human_confirm",
  "workspace_id": "507f1f77bcf86cd799439011",
  "confirmed": false
}
```

**前端发送**:
```typescript
// IntentReportModal.tsx
const handleConfirm = (confirmed: boolean) => {
  wsClient.send(JSON.stringify({
    type: 'human_confirm',
    workspace_id: workspaceId,
    confirmed,
    corrections: isEditing ? editedIntent : null
  }));
};
```

**后端处理**:
```javascript
// websocket/prompt-optimization.js
ws.on('message', (message) => {
  const data = JSON.parse(message);

  if (data.type === 'human_confirm') {
    const resolver = pendingConfirmations.get(data.workspace_id);
    if (resolver) {
      resolver({
        confirmed: data.confirmed,
        corrections: data.corrections
      });
      pendingConfirmations.delete(data.workspace_id);
    }
  }
});
```

---

### 7. video_analysis

**方向**: Server → Client

**时机**: Video Analysis Sub-Agent 完成分析后

**格式**:
```typescript
{
  type: 'video_analysis',
  workspace_id: string,
  data: {
    content_match_score: number,  // 1-10
    issues: Array<{
      category: string,
      description: string,
      severity: 'high' | 'medium' | 'low',
      affected_parameter?: string
    }>,
    technical_quality: {
      resolution: string,
      clarity_score: number,
      fluency_score: number,
      artifacts?: string
    },
    strengths?: string[],
    overall_assessment: string
  },
  timestamp: string
}
```

**示例**:
```json
{
  "type": "video_analysis",
  "workspace_id": "507f1f77bcf86cd799439011",
  "data": {
    "content_match_score": 6.5,
    "issues": [
      {
        "category": "motion_speed_mismatch",
        "description": "人物步行速度明显快于'slowly'所暗示的缓慢节奏",
        "severity": "high",
        "affected_parameter": "motion_intensity"
      },
      {
        "category": "camera_movement_conflict",
        "description": "推进运镜(push_in)强调感过强",
        "severity": "medium",
        "affected_parameter": "camera_movement"
      }
    ],
    "technical_quality": {
      "resolution": "1080p",
      "clarity_score": 8.2,
      "fluency_score": 7.8,
      "artifacts": "轻微的运动模糊"
    },
    "strengths": ["自然光照效果良好", "人物动作流畅"],
    "overall_assessment": "视频技术质量良好,但运动速度和运镜方式与用户意图存在偏差"
  },
  "timestamp": "2025-01-15T10:31:00.000Z"
}
```

**前端处理**:
```typescript
case 'video_analysis':
  setVideoAnalysis(data.workspace_id, data.data);

  addProgressMessage(data.workspace_id, {
    type: 'agent_complete',
    message: '视频分析完成',
    timestamp: data.timestamp
  });
```

**显示效果**:
```
✅ [10:31:00] 视频分析完成
   发现 2 个问题: 运动速度不匹配 (严重), 运镜方式冲突 (中等)
```

---

### 8. optimization_result

**方向**: Server → Client

**时机**: Master Agent 完成决策,生成最终优化方案

**格式**:
```typescript
{
  type: 'optimization_result',
  workspace_id: string,
  data: {
    ng_reasons: string[],
    optimized_params: Partial<VideoFormData>,
    changes: Array<{
      field: string,
      old_value: any,
      new_value: any,
      reason: string
    }>,
    confidence: number
  },
  timestamp: string
}
```

**示例**:
```json
{
  "type": "optimization_result",
  "workspace_id": "507f1f77bcf86cd799439011",
  "data": {
    "ng_reasons": [
      "运动强度设置为 3 (中等),但用户意图是缓慢散步,实际生成视频过快",
      "推进运镜 (push_in) 不适合悠闲场景,建议使用跟随运镜"
    ],
    "optimized_params": {
      "motion_intensity": 2,
      "camera_movement": "follow",
      "motion_prompt": "person walking very slowly in the park, relaxed and leisurely"
    },
    "changes": [
      {
        "field": "motion_intensity",
        "old_value": 3,
        "new_value": 2,
        "reason": "降低运动强度以匹配'缓慢散步'意图"
      },
      {
        "field": "camera_movement",
        "old_value": "push_in",
        "new_value": "follow",
        "reason": "跟随运镜更适合展现悠闲步行场景"
      },
      {
        "field": "motion_prompt",
        "old_value": "person walking slowly",
        "new_value": "person walking very slowly in the park, relaxed and leisurely",
        "reason": "增强提示词细节,突出放松氛围"
      }
    ],
    "confidence": 0.82
  },
  "timestamp": "2025-01-15T10:31:30.000Z"
}
```

**前端处理**:
```typescript
case 'optimization_result':
  // 1. 存储最终结果
  setFinalResult(data.workspace_id, data.data);

  // 2. 自动应用优化参数到表单
  applyOptimization(data.workspace_id, data.data.optimized_params);

  // 3. 显示优化结果组件
  showOptimizationResult(data.workspace_id, data.data);

  // 4. 标记优化完成
  setOptimizationComplete(data.workspace_id);
```

**显示效果**: 见前端架构文档中的 `OptimizationResult` 组件

---

### 9. optimization_error

**方向**: Server → Client

**时机**: 优化流程中发生错误

**格式**:
```typescript
{
  type: 'optimization_error',
  workspace_id: string,
  error: string,
  phase?: 'intent_analysis' | 'video_analysis' | 'master_decision',
  timestamp: string
}
```

**示例**:
```json
{
  "type": "optimization_error",
  "workspace_id": "507f1f77bcf86cd799439011",
  "error": "Qwen VL API 调用失败: Rate limit exceeded",
  "phase": "video_analysis",
  "timestamp": "2025-01-15T10:31:00.000Z"
}
```

**前端处理**:
```typescript
case 'optimization_error':
  setOptimizationError(data.workspace_id, data.error);

  addProgressMessage(data.workspace_id, {
    type: 'error',
    message: `❌ 优化失败: ${data.error}`,
    timestamp: data.timestamp
  });
```

**显示效果**:
```
❌ [10:31:00] 优化失败: Qwen VL API 调用失败
```

---

## 消息时序图

```
用户点击"一键优化"
    ↓
[前端] POST /api/optimize-prompt { workspace_id }
    ↓
[后端] 响应 200 OK
    ↓
━━━━━━━━━━━━━━ WebSocket 流式通信开始 ━━━━━━━━━━━━━━
    ↓
[后端 → 前端] agent_start { agent: 'master' }
    ↓
[后端 → 前端] agent_start { agent: 'intent_analysis' }
    ↓
[后端 → 前端] agent_progress { message: '正在分析用户输入...' }
    ↓
[后端 → 前端] agent_progress { message: '正在推断用户意图...' }
    ↓
[后端 → 前端] agent_complete { agent: 'intent_analysis' }
    ↓
[后端 → 前端] intent_report { data: {...} }
    ↓
[后端 → 前端] human_loop_pending { message: '请确认意图...' }
    ↓
━━━━━━━━━━━━━━ 等待用户确认 (异步阻塞) ━━━━━━━━━━━━━━
    ↓
[前端显示弹窗] IntentReportModal
    ↓
[用户确认]
    ↓
[前端 → 后端] human_confirm { confirmed: true }
    ↓
[后端恢复执行]
    ↓
━━━━━━━━━━━━━━ 继续 Agent 流程 ━━━━━━━━━━━━━━
    ↓
[后端 → 前端] agent_start { agent: 'video_analysis' }
    ↓
[后端 → 前端] agent_progress { message: '正在分析视频内容...' }
    ↓
[后端 → 前端] agent_complete { agent: 'video_analysis' }
    ↓
[后端 → 前端] video_analysis { data: {...} }
    ↓
[后端 → 前端] agent_progress { message: '正在生成优化方案...' }
    ↓
[后端 → 前端] optimization_result { data: {...} }
    ↓
━━━━━━━━━━━━━━ 优化流程完成 ━━━━━━━━━━━━━━
    ↓
[前端] 自动更新表单参数
    ↓
[前端] 显示优化结果
```

---

## 错误处理

### 超时机制

**场景**: 用户长时间不确认意图

**方案**: 后端 5 分钟超时自动终止

```javascript
// 后端
function waitForHumanConfirmation(workspaceId) {
  return new Promise((resolve) => {
    wsHandler.pendingConfirmations.set(workspaceId, resolve);

    // 5 分钟超时
    setTimeout(() => {
      if (wsHandler.pendingConfirmations.has(workspaceId)) {
        wsHandler.pendingConfirmations.delete(workspaceId);

        // 发送超时错误
        wsHandler.broadcast({
          type: 'optimization_error',
          workspace_id: workspaceId,
          error: '用户确认超时 (5分钟),优化流程已终止'
        });

        resolve({ confirmed: false, timeout: true });
      }
    }, 5 * 60 * 1000);
  });
}
```

### WebSocket 断开重连

**场景**: 优化过程中 WebSocket 连接断开

**方案**: 前端自动重连 (已有机制)

```typescript
// frontend/src/services/websocket.ts
class WebSocketClient {
  // v1.x 已有重连逻辑
  reconnect() {
    // 自动重连
  }
}
```

**注意**: 重连后无法恢复 Agent 执行状态 (无状态设计)

**建议**: 添加任务状态持久化 (可选,v2.1 增强)

---

## 安全性

### 消息验证

**问题**: 恶意客户端发送伪造消息

**方案**: 后端验证 `workspace_id` 所有权 (MVP 阶段单用户,暂不实现)

### 消息大小限制

**问题**: 超大消息导致内存溢出

**方案**: WebSocket 消息大小限制 (1MB)

```javascript
ws.on('message', (message) => {
  if (message.length > 1024 * 1024) {
    logger.warn('Message too large, rejected');
    ws.send(JSON.stringify({ error: 'Message too large' }));
    return;
  }
  // ...
});
```

---

## 测试

### Mock WebSocket 消息

```typescript
// __tests__/websocket-protocol.test.ts
describe('WebSocket Protocol', () => {
  it('should handle intent_report message', () => {
    const mockMessage = {
      type: 'intent_report',
      workspace_id: 'test-id',
      data: { /* ... */ }
    };

    // Trigger handler
    handleWebSocketMessage(mockMessage);

    // Assert store updated
    expect(getIntentReport('test-id')).toBeDefined();
  });

  it('should send human_confirm message', () => {
    const mockWs = { send: jest.fn() };

    sendHumanConfirmation('test-id', true);

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'human_confirm',
        workspace_id: 'test-id',
        confirmed: true
      })
    );
  });
});
```

---

## 下一步

阅读相关文档:
- **API 设计**: `v2-api-design.md`
- **数据库变更**: `v2-database-schema.md`
- **开发计划**: `v2-development-plan.md`
