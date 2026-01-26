/**
 * v2.0 AIOutputArea 组件
 *
 * AI 输出区域 - 集成优化流程的所有UI组件
 *
 * 功能：
 * - v2.0.1: 显示详细的分析过程（AnalysisProgressPanel）
 * - 自动弹出意图确认弹窗（IntentReportModal）
 * - 显示最终优化结果（OptimizationResult）
 * - 显示错误信息
 * - 垂直滚动容器
 */

import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { AnalysisProgressPanel } from './AnalysisProgressPanel';
import { IntentReportModal } from './IntentReportModal';
import { OptimizationResult } from './OptimizationResult';

interface AIOutputAreaProps {
  workspaceId: string;
}

export const AIOutputArea: React.FC<AIOutputAreaProps> = ({ workspaceId }) => {
  const { optimizationStates } = useWorkspaceStore();
  const optimizationState = optimizationStates[workspaceId];

  const [showIntentModal, setShowIntentModal] = useState(false);

  /**
   * 当收到 intent_report 且进入 waiting 状态时，自动显示 modal
   */
  useEffect(() => {
    if (optimizationState?.intentReport && optimizationState.currentStep === 'waiting') {
      console.log('[AIOutputArea] Showing intent confirmation modal');
      setShowIntentModal(true);
    }
  }, [optimizationState?.intentReport, optimizationState?.currentStep]);

  /**
   * 当优化流程完成或出错时，关闭 modal
   */
  useEffect(() => {
    if (optimizationState?.currentStep === 'complete' || optimizationState?.error) {
      setShowIntentModal(false);
    }
  }, [optimizationState?.currentStep, optimizationState?.error]);

  // 如果没有优化状态，不显示组件
  if (!optimizationState) {
    return null;
  }

  return (
    <div className="ai-output-area space-y-4">
      {/* v2.0.1: 详细的分析过程展示 - 固定高度的内部滚动区域 */}
      {/* 只要有分析步骤数据就显示，不管是否正在运行 */}
      {(optimizationState.analysisSteps && optimizationState.analysisSteps.length > 0) && (
        <div className="analysis-section max-h-[300px] overflow-y-auto border border-slate-700/50 rounded-lg bg-slate-900/30 p-4">
          <AnalysisProgressPanel workspaceId={workspaceId} />
        </div>
      )}

      {/* 意图确认弹窗 */}
      {optimizationState.intentReport && (
        <IntentReportModal
          isOpen={showIntentModal}
          onClose={() => setShowIntentModal(false)}
          workspaceId={workspaceId}
          intentReport={optimizationState.intentReport}
        />
      )}

      {/* 优化结果 - 直接在外层滚动中展示，无独立滚动条 */}
      {optimizationState.finalResult && (
        <OptimizationResult
          workspaceId={workspaceId}
          result={optimizationState.finalResult}
        />
      )}

      {/* 错误提示 */}
      {optimizationState.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-1">优化流程出错</h4>
              <p className="text-sm text-red-600">{optimizationState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 流程状态指示 */}
      {optimizationState.isActive && !optimizationState.error && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>
              {optimizationState.currentStep === 'intent' && 'AI 正在分析您的意图...'}
              {optimizationState.currentStep === 'waiting' && '等待您确认意图分析结果...'}
              {optimizationState.currentStep === 'video' && 'AI 正在分析视频质量...'}
              {optimizationState.currentStep === 'decision' && 'AI 正在生成优化建议...'}
            </span>
          </div>
        </div>
      )}

      {/* 完成状态 */}
      {optimizationState.currentStep === 'complete' && !optimizationState.isActive && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="text-lg">✅</span>
            <span className="font-medium">优化流程已完成！请查看上方的优化建议。</span>
          </div>
        </div>
      )}
    </div>
  );
};
