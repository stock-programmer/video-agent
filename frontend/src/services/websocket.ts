/**
 * v2.0 WebSocket 客户端
 *
 * 功能：
 * - 处理 v1.x 现有消息（workspace.sync_confirm, video.status_update）
 * - 处理 v2.0 优化流程消息（agent_start, intent_report, etc.）
 * - 发送 Human-in-the-Loop 确认消息
 * - 自动重连机制
 */

import type { WSHumanConfirmMessage } from '../types/workspace';

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;
  private url: string;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  connect() {
    // 防止重复连接
    if (this.isConnected || this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] Already connected or connecting, skipping');
      return;
    }

    console.log('[WS] Connecting to', this.url);

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected successfully');
      this.reconnectAttempts = 0;
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WS] Message received:', message.type, message);

        // 调用统一的消息处理器
        this.handleMessage(message);

        // 调用注册的事件监听器（v1.x 兼容）
        const handlers = this.handlers.get(message.type) || [];
        handlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WS] Connection closed');
      this.isConnected = false;
      this.reconnect();
    };
  }

  /**
   * 统一的消息处理器（v2.0 新增）
   */
  private handleMessage(message: any) {
    // 动态导入 store 以避免循环依赖
    import('../stores/workspaceStore').then(({ useWorkspaceStore }) => {
      const store = useWorkspaceStore.getState();
      const workspaceId = message.workspace_id || this.getCurrentWorkspaceId();

      switch (message.type) {
        // ========== v1.x 现有消息类型 ==========
        case 'workspace.sync_confirm':
          console.log('[WS] Workspace sync confirmed');
          break;

        case 'video.status_update':
          console.log('[WS] Video status updated');
          break;

        // ========== v2.0 新增消息类型 ==========
        case 'agent_start':
          console.log('[WS] Agent started:', message.agent);
          if (store.optimizationStates[workspaceId]) {
            store.addProgressMessage(workspaceId, {
              type: 'agent_start',
              agent: message.agent,
              message: this.getAgentStartMessage(message.agent),
              timestamp: message.timestamp || new Date().toISOString()
            });
          }
          break;

        case 'agent_step':
          console.log('[WS] Agent step:', message.step?.title || message.step?.phase);
          if (store.optimizationStates[workspaceId]) {
            store.addAnalysisStep(workspaceId, {
              agent: message.agent,
              phase: message.step.phase,
              title: message.step.title,
              description: message.step.description,
              status: message.step.status,
              result: message.step.result,
              timestamp: message.step.timestamp || message.timestamp || new Date().toISOString()
            });
          }
          break;

        case 'agent_thought':
          console.log('[WS] Agent thought:', message.thought?.substring(0, 50));
          if (store.optimizationStates[workspaceId]) {
            store.addThought(workspaceId, {
              agent: message.agent,
              thought: message.thought,
              timestamp: message.timestamp || new Date().toISOString()
            });
          }
          break;

        case 'agent_progress':
          console.log('[WS] Agent progress:', message.message);
          if (store.optimizationStates[workspaceId]) {
            store.addProgressMessage(workspaceId, {
              type: 'agent_progress',
              agent: message.agent,
              message: message.message,
              timestamp: message.timestamp || new Date().toISOString()
            });
          }
          break;

        case 'agent_complete':
          console.log('[WS] Agent completed:', message.agent);
          if (store.optimizationStates[workspaceId]) {
            store.addProgressMessage(workspaceId, {
              type: 'agent_complete',
              agent: message.agent,
              message: `${this.getAgentName(message.agent)} 完成`,
              timestamp: message.timestamp || new Date().toISOString()
            });
          }
          break;

        case 'intent_report':
          console.log('[WS] Intent report received, confidence:', message.data.confidence);
          if (store.optimizationStates[workspaceId]) {
            store.setIntentReport(workspaceId, message.data);
          }
          break;

        case 'human_loop_pending':
          console.log('[WS] Waiting for human confirmation');
          if (store.optimizationStates[workspaceId]) {
            store.addProgressMessage(workspaceId, {
              type: 'human_loop',
              message: message.message,
              timestamp: message.timestamp || new Date().toISOString()
            });
          }
          break;

        case 'video_analysis':
          console.log('[WS] Video analysis received, score:', message.data.content_match_score);
          if (store.optimizationStates[workspaceId]) {
            store.setVideoAnalysis(workspaceId, message.data);
          }
          break;

        case 'optimization_result':
          console.log('[WS] Optimization result received, changes:', message.data.changes.length);
          if (store.optimizationStates[workspaceId]) {
            store.setFinalResult(workspaceId, message.data);
            store.applyOptimization(workspaceId, message.data.optimized_params);
            store.setOptimizationComplete(workspaceId);
          }
          break;

        case 'optimization_error':
          console.error('[WS] Optimization error:', message.error);
          if (store.optimizationStates[workspaceId]) {
            store.setOptimizationError(workspaceId, message.error);
          }
          break;

        default:
          console.warn('[WS] Unknown message type:', message.type);
      }
    }).catch(err => {
      console.error('[WS] Failed to import store:', err);
    });
  }

  /**
   * v2.0: 发送 Human-in-the-Loop 确认消息
   */
  sendHumanConfirmation(
    workspaceId: string,
    confirmed: boolean,
    corrections?: WSHumanConfirmMessage['corrections']
  ) {
    console.log('[WS] Sending human confirmation', { workspaceId, confirmed, corrections });

    this.send({
      type: 'human_confirm',
      workspace_id: workspaceId,
      confirmed,
      corrections
    });
  }

  /**
   * v1.x: 发送消息 (现有方法)
   */
  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Message sent:', message.type || message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[WS] Cannot send message: not connected. Status:', this.ws?.readyState);
    }
  }

  /**
   * v1.x: 注册事件监听器
   */
  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    // 防止重复添加相同的 handler
    const handlers = this.handlers.get(event)!;
    if (!handlers.includes(handler)) {
      handlers.push(handler);
    }
  }

  /**
   * v1.x: 移除事件监听器
   */
  off(event: string, handler?: MessageHandler) {
    if (!handler) {
      // 如果没有指定 handler，移除该事件的所有监听器
      this.handlers.delete(event);
    } else {
      const handlers = this.handlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  /**
   * 自动重连
   */
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = 1000 * this.reconnectAttempts;

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
   * 简化实现: 从 store 获取第一个优化中的 workspace
   */
  private getCurrentWorkspaceId(): string {
    // 这里返回占位值，实际应该从路由或其他状态获取
    // 在实际使用中，消息应该包含 workspace_id
    return '';
  }

  /**
   * 获取 Agent 启动消息
   */
  private getAgentStartMessage(agent: string): string {
    const messages: Record<string, string> = {
      'master': 'Master Agent 启动...',
      'intent_analysis': '意图分析 Agent 启动...',
      'video_analysis': '视频分析 Agent 启动...'
    };
    return messages[agent] || `${agent} 启动...`;
  }

  /**
   * 获取 Agent 名称
   */
  private getAgentName(agent: string): string {
    const names: Record<string, string> = {
      'master': 'Master Agent',
      'intent_analysis': '意图分析',
      'video_analysis': '视频分析'
    };
    return names[agent] || agent;
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      console.log('[WS] Disconnecting...');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// 导出单例
export const wsClient = new WebSocketClient(
  typeof window !== 'undefined' && import.meta.env?.VITE_WS_URL
    ? import.meta.env.VITE_WS_URL
    : 'ws://localhost:3001'
);
