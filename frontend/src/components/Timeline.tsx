import { useWorkspaceStore } from '../stores/workspaceStore';
import { Workspace } from './Workspace';

export function Timeline() {
  const { workspaces, createWorkspace } = useWorkspaceStore();

  // 分离正常工作空间和已删除工作空间
  const activeWorkspaces = workspaces.filter(w => !w.deleted?.is_deleted);
  const deletedWorkspaces = workspaces.filter(w => w.deleted?.is_deleted);

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* 主时间轴 */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-gray-700">工作空间</h2>
        <div className="flex overflow-x-auto gap-4 pb-4">
          {activeWorkspaces.map(workspace => (
            <Workspace key={workspace._id} workspace={workspace} />
          ))}
          <button
            onClick={createWorkspace}
            className="min-w-[300px] h-[600px] border-2 border-dashed border-gray-300 hover:border-blue-400 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors rounded"
          >
            + 添加工作空间
          </button>
        </div>
      </div>

      {/* 删除轴 - 只在有删除项时显示 */}
      {deletedWorkspaces.length > 0 && (
        <div className="border-t-2 border-dashed border-red-300 pt-6">
          <h2 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            回收站 ({deletedWorkspaces.length})
          </h2>
          <div className="flex overflow-x-auto gap-4 pb-4 bg-red-50 p-4 rounded">
            {deletedWorkspaces.map(workspace => (
              <Workspace key={workspace._id} workspace={workspace} isDeleted={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
