/**
 * v2.0 IntentReportModal 组件
 *
 * 意图确认弹窗 - 展示 Intent Analysis 结果并等待用户确认
 *
 * 功能：
 * - 展示意图分析报告（场景描述、期望情绪、关键元素等）
 * - 参数分析（匹配项和潜在问题）
 * - AI 置信度可视化
 * - 确认/拒绝按钮并通过 WebSocket 发送 human_confirm 消息
 */

import React from 'react';
import { wsClient } from '../services/websocket';
import type { IntentReport } from '../types/workspace';

interface IntentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  intentReport: IntentReport;
}

export const IntentReportModal: React.FC<IntentReportModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  intentReport
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /**
   * 处理确认/拒绝操作
   */
  const handleConfirm = (confirmed: boolean) => {
    setIsSubmitting(true);

    console.log('[IntentModal] Sending confirmation', { workspaceId, confirmed });

    // 通过 WebSocket 发送确认
    wsClient.sendHumanConfirmation(workspaceId, confirmed);

    // 延迟关闭 modal（给用户视觉反馈）
    setTimeout(() => {
      onClose();
      setIsSubmitting(false);
    }, 500);
  };

  /**
   * 处理 ESC 键关闭（但需要用户明确选择）
   */
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        // ESC 键不直接关闭，需要用户明确选择确认或拒绝
        console.log('[IntentModal] ESC pressed, but user must explicitly confirm or reject');
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting]);

  // 不渲染隐藏的 modal
  if (!isOpen) {
    return null;
  }

  const { user_intent, parameter_analysis, confidence } = intentReport;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 intent-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl intent-modal-enter">
        {/* 标题 */}
        <h2 id="modal-title" className="text-xl font-bold mb-4 text-gray-800">
          🤖 AI 意图分析结果
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          AI 已分析您的视频生成参数和意图，请确认分析结果是否准确
        </p>

        {/* 场景描述 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 场景描述</h3>
          <p className="text-gray-600 bg-gray-50 p-3 rounded">
            {user_intent.scene_description}
          </p>
        </div>

        {/* 期望情绪 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">😊 期望情绪</h3>
          <p className="text-gray-600 bg-gray-50 p-3 rounded">
            {user_intent.desired_mood}
          </p>
        </div>

        {/* 关键元素 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">🎯 关键元素</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {user_intent.key_elements.map((element, idx) => (
              <span
                key={idx}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {element}
              </span>
            ))}
          </div>
        </div>

        {/* 运动预期 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">🏃 运动预期</h3>
          <p className="text-gray-600 bg-gray-50 p-3 rounded">
            {user_intent.motion_expectation}
          </p>
        </div>

        {/* 能量等级（可选） */}
        {user_intent.energy_level && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">⚡ 能量等级</h3>
            <p className="text-gray-600 bg-gray-50 p-3 rounded">
              {user_intent.energy_level}
            </p>
          </div>
        )}

        {/* 参数分析 */}
        {parameter_analysis && (
          <div className="mb-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 参数分析</h3>

            {/* 匹配项 */}
            {parameter_analysis.aligned && parameter_analysis.aligned.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-green-700 mb-2">✅ 匹配项</p>
                <ul className="space-y-1">
                  {parameter_analysis.aligned.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 bg-green-50 p-2 rounded flex items-start"
                    >
                      <span className="text-green-600 mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 潜在问题 */}
            {parameter_analysis.potential_issues && parameter_analysis.potential_issues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-yellow-700 mb-2">⚠️ 潜在问题</p>
                <ul className="space-y-1">
                  {parameter_analysis.potential_issues.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-700 bg-yellow-50 p-2 rounded flex items-start"
                    >
                      <span className="text-yellow-600 mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* AI 置信度 */}
        <div className="mb-6 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">🎓 AI 置信度</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  confidence >= 0.8 ? 'bg-green-500' :
                  confidence >= 0.6 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-base font-semibold text-gray-700 min-w-[3rem]">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {confidence >= 0.8 ? '高置信度 - AI 非常确信分析结果' :
             confidence >= 0.6 ? '中等置信度 - AI 认为分析基本准确' :
             '低置信度 - AI 建议谨慎参考'}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => handleConfirm(true)}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700
                       disabled:opacity-50 disabled:cursor-not-allowed font-medium
                       transition-colors duration-200 shadow-sm hover:shadow"
          >
            {isSubmitting ? '处理中...' : '✓ 确认，继续优化'}
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400
                       disabled:opacity-50 disabled:cursor-not-allowed font-medium
                       transition-colors duration-200 shadow-sm hover:shadow"
          >
            {isSubmitting ? '处理中...' : '✗ 拒绝，停止流程'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          确认后，AI 将基于此分析继续优化视频参数
        </p>
      </div>
    </div>
  );
};
