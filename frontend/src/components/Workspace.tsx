import type { Workspace as WorkspaceType } from '../types/workspace';
import { ImageUpload } from './ImageUpload';
import { VideoForm } from './VideoForm';
import { VideoPlayer } from './VideoPlayer';
import { AICollaboration } from './AICollaboration';
import { useWorkspaceStore } from '../stores/workspaceStore';

// v2.0 新增组件
import { OptimizeButton } from './OptimizeButton';
import { AIOutputArea } from './AIOutputArea';

// 图标
import { Trash2, RotateCcw, X, Image as ImageIcon, Video, MessageSquare, MonitorPlay, Sparkles } from 'lucide-react';

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
    <div className={`relative w-full max-w-7xl mx-auto border rounded-2xl p-4 sm:p-6 transition-all duration-300 ${isDeleted ? 'opacity-75 bg-red-50 border-red-200' : 'bg-white border-slate-200 shadow-lg hover:shadow-2xl'}`}>
      {/* 操作按钮组 - 响应式定位，确保 44x44px 最小触摸目标 */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {!isDeleted ? (
          <button onClick={handleSoftDelete} className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 hover:shadow-md" title="删除工作空间" aria-label="删除工作空间">
            <Trash2 className="w-5 h-5" />
          </button>
        ) : (
          <>
            <button onClick={handleRestore} className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all duration-200 hover:shadow-md" title="恢复工作空间" aria-label="恢复工作空间">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={handleHardDelete} className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md" title="永久删除" aria-label="永久删除工作空间">
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* ========== 第一行：图片上传 | AI智能优化 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            <span>上传图片</span>
          </h3>
          <ImageUpload workspaceId={workspace._id} imageUrl={workspace.image_url} />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
            <span>AI 智能优化</span>
            <span className="ml-auto text-xs bg-gradient-to-r from-sky-500 to-violet-600 text-white px-2 py-1 rounded-full font-medium shadow-sm">核心功能</span>
          </h3>
          <div className="mb-3">
            <OptimizeButton workspaceId={workspace._id} videoStatus={workspace.video?.status || 'pending'} videoUrl={workspace.video?.url} formData={workspace.form_data} />
          </div>
          <div className="border rounded-xl bg-gradient-to-br from-sky-50 to-violet-50 border-indigo-200 p-4 overflow-y-auto max-h-[350px] shadow-sm hover:shadow-md transition-shadow duration-300">
            <AIOutputArea workspaceId={workspace._id} />
          </div>
        </div>
      </div>

      {/* ========== 第二行：生成表单 | AI协作助手 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            <span>视频生成参数</span>
          </h3>
          <VideoForm workspaceId={workspace._id} formData={workspace.form_data} optimizationAppliedAt={workspace.optimization_applied_at} />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            <span>AI 协作助手</span>
          </h3>
          <AICollaboration workspaceId={workspace._id} />
        </div>
      </div>

      {/* ========== 第三行：视频播放器 ========== */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <MonitorPlay className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
          <span>视频预览</span>
        </h3>
        <VideoPlayer video={workspace.video} />
      </div>
    </div>
  );
}
