import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { api } from '../services/api';
import type { VideoFormData } from '../types/workspace';

interface OptimizeButtonProps {
  workspaceId: string;
  videoStatus: string;
  videoUrl?: string;
  formData: VideoFormData;
}

export const OptimizeButton: React.FC<OptimizeButtonProps> = ({
  workspaceId,
  videoStatus,
  videoUrl,
  formData
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startOptimization, optimizationStates } = useWorkspaceStore();

  const optimizationState = optimizationStates[workspaceId];
  const isOptimizing = optimizationState?.isActive || false;

  /**
   * 检查是否可以开始优化
   *
   * 支持两种模式：
   * 1. 视频已生成：执行完整的意图分析 + 视频分析
   * 2. 视频未生成：只执行意图分析（需要填写 motion_prompt）
   */
  const canOptimize = (): boolean => {
    // 不能正在优化中
    if (isOptimizing) {
      return false;
    }

    // 情况1：视频已生成
    if (videoStatus === 'completed' && videoUrl) {
      return true;
    }

    // 情况2：视频未生成，需要检查是否填写了 motion_prompt
    if (videoStatus !== 'completed' || !videoUrl) {
      // 必须填写主体运动描述才能进行意图分析
      return !!(formData.motion_prompt && formData.motion_prompt.trim());
    }

    return false;
  };

  /**
   * 获取禁用原因提示
   */
  const getDisabledReason = (): string => {
    if (isOptimizing) {
      return '优化进行中...';
    }

    // 情况1：视频已生成
    if (videoStatus === 'completed' && videoUrl) {
      return '';
    }

    // 情况2：视频未生成
    if (videoStatus !== 'completed' || !videoUrl) {
      if (!formData.motion_prompt || !formData.motion_prompt.trim()) {
        return '请先填写主体运动描述';
      }
      return ''; // 填写了 motion_prompt，可以优化
    }

    return '';
  };

  /**
   * 触发优化流程
   */
  const handleOptimize = async () => {
    if (!canOptimize()) {
      return;
    }

    console.log('[OptimizeButton] Starting optimization for', workspaceId);

    setIsLoading(true);
    setError(null);

    try {
      // 1. 更新本地状态
      startOptimization(workspaceId);

      // 2. 调用 API
      const response = await api.optimizePrompt(workspaceId);

      console.log('[OptimizeButton] API response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Optimization failed');
      }

      console.log('[OptimizeButton] Optimization started successfully');

    } catch (err: any) {
      console.error('[OptimizeButton] Error:', err);

      const errorMessage = err.response?.data?.error || err.message || 'Failed to start optimization';
      setError(errorMessage);

      // 重置优化状态
      // (错误会通过 WebSocket 传回,这里只显示 API 错误)

    } finally {
      setIsLoading(false);
    }
  };

  const disabled = !canOptimize() || isLoading;
  const buttonText = isLoading
    ? '启动中...'
    : isOptimizing
    ? '优化中...'
    : '一键优化提示词';

  return (
    <div className="optimize-button-container w-full">
      <button
        onClick={handleOptimize}
        disabled={disabled}
        className={`
          w-full px-6 py-4 rounded-xl font-semibold text-lg
          transition-all duration-200 shadow-md
          flex items-center justify-center gap-3
          ${disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg active:scale-95'
          }
          ${isLoading ? 'opacity-75' : ''}
        `}
        title={disabled ? getDisabledReason() : '使用 AI 优化视频生成参数'}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{buttonText}</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-600 font-bold">⚠️</span>
            <p className="text-red-600 text-sm flex-1">{error}</p>
          </div>
        </div>
      )}

      {disabled && !isLoading && (
        <div className="mt-2 text-gray-600 text-sm text-center bg-gray-50 rounded-lg py-2 px-3">
          💡 {getDisabledReason()}
        </div>
      )}
    </div>
  );
};
