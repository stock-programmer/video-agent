import type { Workspace as WorkspaceType } from '../types/workspace';
import { ImageUpload } from './ImageUpload';
import { VideoForm } from './VideoForm';
import { VideoPlayer } from './VideoPlayer';
import { AICollaboration } from './AICollaboration';
import { useWorkspaceStore } from '../stores/workspaceStore';

import { OptimizeButton } from './OptimizeButton';
import { AIOutputArea } from './AIOutputArea';

import { Trash2, RotateCcw, X, Image as ImageIcon, MessageSquare, Sparkles, Play } from 'lucide-react';

interface Props {
  workspace: WorkspaceType;
  isDeleted?: boolean;
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
    <div className={`relative w-full border rounded-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden group ${isDeleted
      ? 'bg-slate-900/20 border-slate-800/30 opacity-75'
      : 'bg-slate-900/40 border-slate-800/50 hover:border-rose-500/30 hover:bg-slate-900/60 shadow-lg hover:shadow-xl hover:shadow-rose-500/10'
    }`}>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {!isDeleted ? (
          <button
            onClick={handleSoftDelete}
            className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-all duration-200 border border-rose-500/30 hover:border-rose-500/50 cursor-pointer"
            title="删除工作空间"
            aria-label="删除工作空间"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        ) : (
          <>
            <button
              onClick={handleRestore}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all duration-200 border border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer"
              title="恢复工作空间"
              aria-label="恢复工作空间"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleHardDelete}
              className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all duration-200 border border-rose-500/50 hover:border-rose-400 cursor-pointer"
              title="永久删除"
              aria-label="永久删除工作空间"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className="p-6 sm:p-8">
        {/* Main Grid: Left Column (Image + Form) & Right Column (AI Optimize + Collaboration) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Left Column: Image Upload & Video Form */}
          <div className="flex flex-col gap-6 sm:gap-8">
            {/* Image Upload */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-500/20 rounded-lg">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-50">上传图片</h3>
              </div>
              <ImageUpload workspaceId={workspace._id} imageUrl={workspace.image_url} />
            </div>

            {/* Video Form */}
            <div>
              <VideoForm workspaceId={workspace._id} formData={workspace.form_data} optimizationAppliedAt={workspace.optimization_applied_at} />
            </div>
          </div>

          {/* Right Column: Video Preview + AI Optimize + AI Collaboration */}
          <div className="flex flex-col gap-6 sm:gap-8">
            {/* Video Preview */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-50">视频预览</h3>
              </div>
              <VideoPlayer video={workspace.video} />
            </div>

            {/* AI Optimize */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-50">AI 智能优化</h3>
                </div>
                <span className="text-xs bg-gradient-to-r from-rose-500 to-violet-600 text-white px-3 py-1 rounded-full font-medium">核心功能</span>
              </div>
              <div className="mb-4">
                <OptimizeButton workspaceId={workspace._id} videoStatus={workspace.video?.status || 'pending'} videoUrl={workspace.video?.url} formData={workspace.form_data} />
              </div>
              <div className="border border-slate-800/50 rounded-xl bg-gradient-to-br from-slate-900/50 to-violet-900/30 p-4 overflow-y-auto max-h-[350px] shadow-sm hover:shadow-md transition-shadow duration-300">
                <AIOutputArea workspaceId={workspace._id} />
              </div>
            </div>

            {/* AI Collaboration */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-50">AI 协作</h3>
              </div>
              <AICollaboration workspaceId={workspace._id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
