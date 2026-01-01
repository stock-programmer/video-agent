# 前端任务 5.1 - App集成
## 层级: 第5层
## 依赖: frontend-dev-plan-3.1, 4.1-4.7

修改 src/App.tsx:
```typescript
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceStore } from './stores/workspaceStore';
import { Timeline } from './components/Timeline';

const queryClient = new QueryClient();

function AppContent() {
  const { fetchWorkspaces, connectWebSocket } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
    connectWebSocket();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4">
        <h1 className="text-2xl font-bold">AI视频生成平台</h1>
      </header>
      <main className="container mx-auto py-8">
        <Timeline />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

验收:
- [ ] 应用可正常运行
- [ ] 数据加载成功
- [ ] WebSocket连接成功

下一步: frontend-dev-plan-5.2, 6.1
