import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceStore } from './stores/workspaceStore';
import { Timeline } from './components/Timeline';
import { Video, FileText, Film, Sparkles } from 'lucide-react';

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

      {/* Workshop Navigation */}
      <div className="mx-4 mb-6 flex flex-col gap-3">
        {/* Script Workshop - Coming Soon */}
        <div className="bg-slate-900/30 border border-slate-800/40 rounded-lg px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-500 font-medium">剧本车间工作台</span>
            <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">敬请期待</span>
          </div>
        </div>

        {/* Storyboard Workshop - Coming Soon */}
        <div className="bg-slate-900/30 border border-slate-800/40 rounded-lg px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-500 font-medium">分镜车间工作台</span>
            <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">敬请期待</span>
          </div>
        </div>

        {/* Image-to-Video Workshop - Active */}
        <div className="bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/10 border-2 border-rose-500/30 rounded-xl px-4 py-2.5 backdrop-blur-sm shadow-lg shadow-rose-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-50">
                  图生车间工作台
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">上传图片，AI驱动生成专业视频</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-400">运行中</span>
            </div>
          </div>
        </div>
      </div>

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
