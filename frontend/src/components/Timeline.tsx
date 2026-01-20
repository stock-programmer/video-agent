import { useWorkspaceStore } from '../stores/workspaceStore';
import { Workspace } from './Workspace';
import { PlusCircle, Trash2, Video } from 'lucide-react';

export function Timeline() {
  const { workspaces, createWorkspace } = useWorkspaceStore();

  // 分离正常工作空间和已删除工作空间
  const activeWorkspaces = workspaces.filter(w => !w.deleted?.is_deleted);
  const deletedWorkspaces = workspaces.filter(w => w.deleted?.is_deleted);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-2 sm:p-4">
      {/* 主时间轴 */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-slate-900 px-2">
          工作空间
        </h2>

        {/* 空状态优化 */}
        {activeWorkspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-xl">
              <Video className="w-12 h-12 sm:w-16 sm:h-16 text-sky-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
              开始你的创作之旅
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mb-8 text-center max-w-md">
              上传一张图片，让 AI 帮你生成专业级视频内容
            </p>
            <button
              onClick={createWorkspace}
              className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              创建第一个工作空间
            </button>
          </div>
        ) : (
          // 有工作空间时 - 响应式滚动
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:overflow-x-auto sm:pb-4 sm:snap-x sm:snap-mandatory">
            {activeWorkspaces.map(workspace => (
              <div
                key={workspace._id}
                className="sm:snap-start sm:min-w-[90vw] lg:min-w-[1000px] xl:min-w-[1200px]"
              >
                <Workspace workspace={workspace} />
              </div>
            ))}

            {/* 添加按钮优化 */}
            <button
              onClick={createWorkspace}
              className="w-full sm:min-w-[300px] h-40 sm:h-[600px] border-2 border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50 flex flex-col items-center justify-center text-slate-400 hover:text-sky-600 transition-all duration-300 rounded-2xl sm:snap-start group"
            >
              <PlusCircle className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm sm:text-base font-medium">添加工作空间</span>
            </button>
          </div>
        )}
      </div>

      {/* 删除轴 - 只在有删除项时显示 */}
      {deletedWorkspaces.length > 0 && (
        <div className="border-t-2 border-dashed border-red-200 pt-6 sm:pt-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-red-600 flex items-center gap-2 px-2">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
            回收站 ({deletedWorkspaces.length})
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-red-50 p-4 rounded-2xl sm:overflow-x-auto sm:pb-4">
            {deletedWorkspaces.map(workspace => (
              <div
                key={workspace._id}
                className="sm:min-w-[90vw] lg:min-w-[1000px] xl:min-w-[1200px]"
              >
                <Workspace workspace={workspace} isDeleted={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
