import { useWorkspaceStore } from '../stores/workspaceStore';
import { Workspace } from './Workspace';
import { PlusCircle, Trash2, Video } from 'lucide-react';

export function Timeline() {
  const { workspaces, createWorkspace } = useWorkspaceStore();

  const activeWorkspaces = workspaces.filter(w => !w.deleted?.is_deleted);
  const deletedWorkspaces = workspaces.filter(w => w.deleted?.is_deleted);

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* Active Workspaces Section */}
      <div>
        {/* Empty State */}
        {activeWorkspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-28 px-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-rose-500/20 to-rose-700/20 rounded-3xl flex items-center justify-center mb-8 ring-1 ring-rose-500/30">
              <Video className="w-16 h-16 sm:w-20 sm:h-20 text-rose-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-3 text-center">
              准备好创建您的第一个视频吗?
            </h3>
            <p className="text-base sm:text-lg text-slate-400 mb-10 text-center max-w-lg">
              上传一张图片，利用 AI 的力量生成专业级视频内容
            </p>
            <button
              onClick={createWorkspace}
              className="inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 rounded-xl shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transform hover:scale-105 transition-all duration-200"
            >
              <PlusCircle className="w-6 h-6" />
              创建工作空间
            </button>
          </div>
        ) : (
          <>
            {/* Horizontal Scrolling Timeline */}
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
              {activeWorkspaces.map((workspace, index) => (
                <div
                  key={workspace._id}
                  className={`flex-shrink-0 snap-center animate-in fade-in duration-500 ${
                    activeWorkspaces.length === 1 ? 'flex-1' : 'w-[90vw] max-w-4xl'
                  }`}
                >
                  <Workspace workspace={workspace} />
                </div>
              ))}

              {/* Add New Button in Timeline */}
              <button
                onClick={createWorkspace}
                className={`flex-shrink-0 border-2 border-dashed border-slate-700 hover:border-rose-500/50 bg-slate-900/30 hover:bg-slate-800/50 flex flex-col items-center justify-start pt-12 text-slate-500 hover:text-rose-400 transition-all duration-300 rounded-2xl group backdrop-blur-sm hover:shadow-lg hover:shadow-rose-500/20 snap-center cursor-pointer ${
                  activeWorkspaces.length === 1 ? 'w-32' : 'w-[5vw] min-w-[88px]'
                }`}
              >
                <PlusCircle className="w-8 h-8 mb-2 group-hover:scale-110 group-hover:text-rose-500 transition-all duration-300" />
                <span className="text-xs font-semibold leading-tight text-center">点击</span>
                <span className="text-xs font-semibold leading-tight text-center">添加</span>
                <span className="text-[10px] leading-tight text-center text-slate-600 mt-0.5">工作空间</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Trash Section */}
      {deletedWorkspaces.length > 0 && (
        <div className="border-t border-slate-800/50 pt-12 sm:pt-16">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-400 mb-2 flex items-center gap-3">
              <Trash2 className="w-7 h-7" />
              回收站 ({deletedWorkspaces.length})
            </h2>
            <p className="text-sm text-slate-500">已删除的工作空间</p>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory bg-slate-900/20 p-8 rounded-2xl border border-slate-800/30">
            {deletedWorkspaces.map(workspace => (
              <div key={workspace._id} className="flex-shrink-0 w-screen max-w-2xl snap-center">
                <Workspace workspace={workspace} isDeleted={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
