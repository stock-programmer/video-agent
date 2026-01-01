# 前端任务 2.4 - WebSocket客户端
## 层级: 第2层
## 依赖: frontend-dev-plan-1.1-project-scaffold.md
## 并行: frontend-dev-plan-2.1, 2.2, 2.3

创建 src/services/websocket.ts:
```typescript
type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.onopen = () => {
      console.log('WebSocket连接成功');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handlers = this.handlers.get(message.type) || [];
      handlers.forEach(handler => handler(message));
    };

    this.ws.onclose = () => {
      console.log('WebSocket断开');
      this.reconnect();
    };
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
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
```

验收:
- [ ] WebSocket可连接
- [ ] 自动重连机制正常

下一步: frontend-dev-plan-3.1
