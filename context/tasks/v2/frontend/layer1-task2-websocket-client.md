# Frontend Layer 1 Task 2: 扩展 WebSocket Client

## 任务元数据

- **任务 ID**: `frontend-v2-layer1-task2`
- **任务名称**: 扩展 WebSocket Client
- **所属层级**: Layer 1 - 状态管理
- **预计工时**: 2 小时
- **依赖任务**: 无 (Layer 1 起始任务)
- **可并行任务**: `layer1-task1` (Zustand Store)

---

## 任务目标

扩展现有 `websocket.ts`,添加 v2.0 优化流程的 WebSocket 消息处理。

**核心功能**:
- 处理服务端优化流程消息 (agent_start, agent_progress, etc.)
- 发送 Human-in-the-Loop 确认消息
- 调用 Zustand store actions 更新状态
- 保持 v1.x 消息处理兼容

---

## 实现文件

**文件路径**: `frontend/src/services/websocket.ts`

---

## 实现步骤

### Step 1: 定义 v2.0 WebSocket 消息类型

```typescript
// frontend/src/types/workspace.ts (新增类型)

/**
 * v2.0: WebSocket 消息类型定义
 */

// 服务端 → 客户端消息
export interface WSAgentStartMessage {
  type: 'agent_start';
  agent: 'intent_analysis' | 'video_analysis' | 'master_agent';
  message: string;
}

export interface WSAgentProgressMessage {
  type: 'agent_progress';
  agent: string;
  message: string;
}

export interface WSAgentCompleteMessage {
  type: 'agent_complete';
  agent: string;
  message: string;
}

export interface WSIntentReportMessage {
  type: 'intent_report';
  data: IntentReport;
}

export interface WSHumanLoopPendingMessage {
  type: 'human_loop_pending';
  message: string;
}

export interface WSVideoAnalysisMessage {
  type: 'video_analysis';
  data: VideoAnalysis;
}

export interface WSOptimizationResultMessage {
  type: 'optimization_result';
  data: OptimizationResult;
}

export interface WSOptimizationErrorMessage {
  type: 'optimization_error';
  error: string;
}

// 客户端 → 服务端消息
export interface WSHumanConfirmMessage {
  type: 'human_confirm';
  data: {
    workspace_id: string;
    confirmed: boolean;
  };
}

export type WSMessage =
  | WSAgentStartMessage
  | WSAgentProgressMessage
  | WSAgentCompleteMessage
  | WSIntentReportMessage
  | WSHumanLoopPendingMessage
  | WSVideoAnalysisMessage
  | WSOptimizationResultMessage
  | WSOptimizationErrorMessage
  | WSHumanConfirmMessage;
```

### Step 2: 扩展 WebSocket Client

```typescript
// frontend/src/services/websocket.ts (扩展)

import { useWorkspaceStore } from '../stores/workspaceStore';
import type { WSMessage } from '../types/workspace';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    console.log('[WS] Connecting to', this.url);

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected successfully');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log('[WS] Message received:', message.type, message);

        this.handleMessage(message);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WS] Connection closed');
      this.handleReconnect();
    };
  }

  private handleMessage(message: WSMessage) {
    const store = useWorkspaceStore.getState();

    switch (message.type) {
      // ========== v1.x 现有消息类型 ==========
      case 'workspace.sync_confirm':
        // 现有处理逻辑
        console.log('[WS] Workspace sync confirmed');
        break;

      case 'video.status_update':
        // 现有处理逻辑
        console.log('[WS] Video status updated');
        break;

      // ========== v2.0 新增消息类型 ==========
      case 'agent_start':
        console.log('[WS] Agent started:', message.agent);
        store.addProgressMessage(this.getCurrentWorkspaceId(), {
          type: 'agent_start',
          agent: message.agent,
          message: message.message,
          timestamp: new Date().toISOString()
        });
        break;

      case 'agent_progress':
        console.log('[WS] Agent progress:', message.message);
        store.addProgressMessage(this.getCurrentWorkspaceId(), {
          type: 'agent_progress',
          agent: message.agent,
          message: message.message,
          timestamp: new Date().toISOString()
        });
        break;

      case 'agent_complete':
        console.log('[WS] Agent completed:', message.agent);
        store.addProgressMessage(this.getCurrentWorkspaceId(), {
          type: 'agent_complete',
          agent: message.agent,
          message: message.message,
          timestamp: new Date().toISOString()
        });
        break;

      case 'intent_report':
        console.log('[WS] Intent report received, confidence:', message.data.confidence);
        store.setIntentReport(this.getCurrentWorkspaceId(), message.data);
        break;

      case 'human_loop_pending':
        console.log('[WS] Waiting for human confirmation');
        store.addProgressMessage(this.getCurrentWorkspaceId(), {
          type: 'human_loop',
          message: message.message,
          timestamp: new Date().toISOString()
        });
        break;

      case 'video_analysis':
        console.log('[WS] Video analysis received, score:', message.data.content_match_score);
        store.setVideoAnalysis(this.getCurrentWorkspaceId(), message.data);
        break;

      case 'optimization_result':
        console.log('[WS] Optimization result received, changes:', message.data.changes.length);
        store.setFinalResult(this.getCurrentWorkspaceId(), message.data);
        store.setOptimizationComplete(this.getCurrentWorkspaceId());
        break;

      case 'optimization_error':
        console.error('[WS] Optimization error:', message.error);
        store.setOptimizationError(this.getCurrentWorkspaceId(), message.error);
        break;

      default:
        console.warn('[WS] Unknown message type:', (message as any).type);
    }
  }

  /**
   * v2.0: 发送 Human-in-the-Loop 确认消息
   */
  sendHumanConfirmation(workspaceId: string, confirmed: boolean) {
    console.log('[WS] Sending human confirmation', { workspaceId, confirmed });

    this.send({
      type: 'human_confirm',
      data: {
        workspace_id: workspaceId,
        confirmed
      }
    });
  }

  /**
   * v1.x: 发送消息 (现有方法)
   */
  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('[WS] Message sent:', message.type || message);
    } else {
      console.error('[WS] Cannot send message: not connected');
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;

      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('[WS] Max reconnect attempts reached');
    }
  }

  /**
   * 获取当前活跃的 workspace ID
   * (简化实现:从 URL 或 store 获取)
   */
  private getCurrentWorkspaceId(): string {
    // TODO: 从路由或其他状态获取当前 workspace ID
    // 这里返回占位值,实际应该从应用状态获取
    const store = useWorkspaceStore.getState();
    const activeWorkspaces = Object.keys(store.optimizationStates);
    return activeWorkspaces[0] || '';
  }

  disconnect() {
    if (this.ws) {
      console.log('[WS] Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
  }
}

// 导出单例
export const wsClient = new WebSocketClient(
  import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
);
```

### Step 3: 环境变量配置

```bash
# frontend/.env

# WebSocket URL
VITE_WS_URL=ws://localhost:3001

# API Base URL
VITE_API_URL=http://localhost:3000
```

### Step 4: 单元测试

```typescript
// frontend/src/services/__tests__/websocket.test.ts
import { wsClient } from '../websocket';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import WS from 'jest-websocket-mock';

describe('WebSocket Client v2.0', () => {
  let server: WS;

  beforeEach(() => {
    server = new WS('ws://localhost:3001');

    // 重置 store
    useWorkspaceStore.setState({
      optimizationStates: {}
    });
  });

  afterEach(() => {
    WS.clean();
    wsClient.disconnect();
  });

  it('should connect to WebSocket server', async () => {
    wsClient.connect();
    await server.connected;

    expect(server).toBeTruthy();
  });

  it('should handle agent_start message', async () => {
    wsClient.connect();
    await server.connected();

    // 初始化优化状态
    useWorkspaceStore.getState().startOptimization('test-id');

    // 服务端发送消息
    server.send(JSON.stringify({
      type: 'agent_start',
      agent: 'intent_analysis',
      message: '开始分析用户意图...'
    }));

    // 等待处理
    await new Promise(resolve => setTimeout(resolve, 100));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.progressMessages).toHaveLength(1);
    expect(state.progressMessages[0].type).toBe('agent_start');
    expect(state.progressMessages[0].agent).toBe('intent_analysis');
  });

  it('should handle intent_report message', async () => {
    wsClient.connect();
    await server.connected;

    useWorkspaceStore.getState().startOptimization('test-id');

    const intentReport = {
      user_intent: {
        scene_description: 'Test scene',
        desired_mood: 'calm',
        key_elements: ['person'],
        motion_expectation: 'slow'
      },
      confidence: 0.85
    };

    server.send(JSON.stringify({
      type: 'intent_report',
      data: intentReport
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.intentReport).toEqual(intentReport);
    expect(state.currentStep).toBe('waiting');
  });

  it('should send human_confirm message', async () => {
    wsClient.connect();
    await server.connected;

    wsClient.sendHumanConfirmation('test-id', true);

    await expect(server).toReceiveMessage(JSON.stringify({
      type: 'human_confirm',
      data: {
        workspace_id: 'test-id',
        confirmed: true
      }
    }));
  });

  it('should handle optimization_error message', async () => {
    wsClient.connect();
    await server.connected;

    useWorkspaceStore.getState().startOptimization('test-id');

    server.send(JSON.stringify({
      type: 'optimization_error',
      error: 'Intent analysis failed'
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.error).toBe('Intent analysis failed');
    expect(state.isActive).toBe(false);
  });

  it('should reconnect after connection loss', async () => {
    wsClient.connect();
    await server.connected;

    server.close();

    // 等待重连
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 验证重连尝试
    // (实际验证需要 mock setTimeout)
  });
});
```

---

## 验收标准

- [ ] 所有 v2.0 WebSocket 消息类型定义完整
- [ ] 正确处理 8 种服务端消息 (agent_start, agent_complete, etc.)
- [ ] 能发送 `human_confirm` 消息到服务端
- [ ] 调用正确的 Zustand store actions 更新状态
- [ ] 保持 v1.x WebSocket 消息兼容
- [ ] 完整的控制台日志输出
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd frontend
npm test -- websocket.test.ts
```

---

## 参考文档

- `context/tasks/v2/v2-websocket-protocol.md` - WebSocket 协议定义
- `context/tasks/v2/v2-frontend-architecture.md` - WebSocket 客户端设计
- `frontend/src/types/workspace.ts` - 类型定义
