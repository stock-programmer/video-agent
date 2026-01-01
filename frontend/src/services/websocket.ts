type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  connect() {
    // 防止重复连接
    if (this.isConnected || this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocket] 已经连接或正在连接，跳过');
      return;
    }

    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handlers = this.handlers.get(message.type) || [];
      handlers.forEach(handler => handler(message));
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.reconnect();
    };
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 发送消息:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[WebSocket] 无法发送消息，WebSocket 未连接。状态:', this.ws?.readyState);
    }
  }

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

  // 移除事件监听器
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

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    this.ws?.close();
  }
}

export const wsClient = new WebSocketClient();
