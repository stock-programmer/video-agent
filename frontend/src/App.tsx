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
  }, [fetchWorkspaces, connectWebSocket]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-indigo-950 pt-8">
      {/* Header */}
      <header className="mx-4 mb-4 bg-black/40 backdrop-blur-lg border border-slate-800/50 rounded-2xl shadow-2xl">
        <div className="px-6 sm:px-8 py-4 sm:py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-baseline gap-x-2">
                <span className="bg-gradient-to-r from-rose-400 via-rose-500 to-pink-500 bg-clip-text text-transparent font-extrabold">
                  三重梦
                </span>
                <span className="text-slate-50">AI视频工厂</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">AI驱动的长短视频创作平台</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-12">
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
