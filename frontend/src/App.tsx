import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceStore } from './stores/workspaceStore';
import { Timeline } from './components/Timeline';
import { Video } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="sticky top-0 z-50 bg-white shadow-md border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              图生视频工作台
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6 sm:py-8">
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
