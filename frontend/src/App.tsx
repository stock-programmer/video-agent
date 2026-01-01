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

    // 清理函数（组件卸载时不需要额外清理，因为 store 是单例）
    // WebSocket 会在整个应用生命周期中保持连接
  }, [fetchWorkspaces, connectWebSocket]);

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
