import type { Workspace as WorkspaceType } from '../types/workspace';
import { ImageUpload } from './ImageUpload';
import { VideoForm } from './VideoForm';
import { VideoPlayer } from './VideoPlayer';
import { AICollaboration } from './AICollaboration';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface Props {
  workspace: WorkspaceType;
  isDeleted?: boolean;  // 是否在删除轴上
}

export function Workspace({ workspace, isDeleted = false }: Props) {
  const { softDeleteWorkspace, restoreWorkspace, hardDeleteWorkspace } = useWorkspaceStore();

  const handleSoftDelete = () => {
    softDeleteWorkspace(workspace._id);
  };

  const handleRestore = () => {
    restoreWorkspace(workspace._id);
  };

  const handleHardDelete = () => {
    if (confirm('确定要永久删除这个工作空间吗？此操作不可恢复，将删除所有相关文件。')) {
      hardDeleteWorkspace(workspace._id);
    }
  };

  return (
    <div className={`min-w-[800px] border rounded-lg p-4 flex gap-4 relative ${isDeleted ? 'opacity-75 bg-red-50 border-red-300' : ''}`}>
      {/* 操作按钮组 - 右上角 */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {!isDeleted ? (
          // 主轴上的工作空间：显示软删除按钮
          <button
            onClick={handleSoftDelete}
            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded transition-colors"
            title="删除工作空间"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ) : (
          // 删除轴上的工作空间：显示恢复和真删除按钮
          <>
            <button
              onClick={handleRestore}
              className="bg-green-100 hover:bg-green-200 text-green-600 p-2 rounded transition-colors"
              title="恢复工作空间"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleHardDelete}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
              title="永久删除"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <ImageUpload workspaceId={workspace._id} imageUrl={workspace.image_url} />
        <VideoForm workspaceId={workspace._id} formData={workspace.form_data} />
        <VideoPlayer video={workspace.video} />
      </div>
      <div className="w-[300px]">
        <AICollaboration workspaceId={workspace._id} />
      </div>
    </div>
  );
}
