/**
 * v2.0 OptimizationResult 组件
 *
 * 优化结果展示 - 显示 NG 原因、参数变更建议，并允许用户应用优化
 *
 * 功能：
 * - 显示 NG 原因列表
 * - 显示参数变更对比（旧值 → 新值 + 原因）
 * - AI 置信度可视化
 * - 一键应用优化按钮
 */

import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { OptimizationResult as OptimizationResultType } from '../types/workspace';

interface OptimizationResultProps {
  workspaceId: string;
  result: OptimizationResultType;
}

export const OptimizationResult: React.FC<OptimizationResultProps> = ({
  workspaceId,
  result
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const { applyOptimization } = useWorkspaceStore();

  /**
   * 应用优化建议到表单
   */
  const handleApply = () => {
    console.log('[OptimizationResult] Applying optimization', result.optimized_params);

    setIsApplying(true);

    // 应用优化参数到表单
    applyOptimization(workspaceId, result.optimized_params);

    setTimeout(() => {
      setIsApplying(false);
      setIsApplied(true);
    }, 1000);
  };

  /**
   * 获取字段的友好显示名称
   */
  const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      'motion_intensity': '运动强度',
      'duration': '视频时长',
      'aspect_ratio': '宽高比',
      'quality_preset': '视频质量',
      'camera_movement': '运镜方式',
      'shot_type': '景别',
      'lighting': '光线',
      'motion_prompt': '运动描述'
    };
    return fieldNames[field] || field;
  };

  /**
   * 格式化值的显示
   */
  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  };

  return (
    <div className="optimization-result bg-white rounded-lg border border-gray-200 p-5 mt-4 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>🎯</span>
        <span>AI 优化建议</span>
      </h3>

      {/* NG 原因 */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1">
          <span>❌</span>
          <span>当前问题</span>
        </h4>
        <ul className="space-y-2">
          {result.ng_reasons.map((reason, idx) => (
            <li
              key={idx}
              className="text-sm text-gray-700 pl-4 py-2 border-l-3 border-red-300 bg-red-50 rounded-r"
            >
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* 参数变更 */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-1">
          <span>🔧</span>
          <span>建议调整</span>
        </h4>
        <div className="space-y-3">
          {result.changes.map((change, idx) => (
            <div key={idx} className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
              {/* 字段名和值变更 */}
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  {getFieldDisplayName(change.field)}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-600 bg-red-100 px-2 py-1 rounded font-medium">
                    {formatValue(change.old_value)}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 bg-green-100 px-2 py-1 rounded font-medium">
                    {formatValue(change.new_value)}
                  </span>
                </div>
              </div>
              {/* 变更原因 */}
              <p className="text-xs text-gray-600 bg-white p-2 rounded border-l-2 border-blue-400">
                {change.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 置信度 */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">AI 置信度</span>
          <span className="font-bold text-lg">{(result.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              result.confidence >= 0.8 ? 'bg-green-500' :
              result.confidence >= 0.6 ? 'bg-blue-500' :
              'bg-yellow-500'
            }`}
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {result.confidence >= 0.8 ? '高置信度 - AI 强烈推荐应用这些优化' :
           result.confidence >= 0.6 ? '中等置信度 - AI 认为这些优化会有帮助' :
           '低置信度 - 建议谨慎参考这些优化建议'}
        </p>
      </div>

      {/* 应用按钮 */}
      <button
        onClick={handleApply}
        disabled={isApplying || isApplied}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all shadow-sm hover:shadow
          ${isApplied
            ? 'bg-green-500 text-white cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
      >
        {isApplying ? (
          <>
            <span className="inline-block animate-spin mr-2">⚙️</span>
            应用中...
          </>
        ) : isApplied ? (
          <>
            <span className="mr-2">✓</span>
            已应用到表单
          </>
        ) : (
          <>
            <span className="mr-2">🚀</span>
            应用优化建议
          </>
        )}
      </button>

      {isApplied && (
        <p className="text-xs text-green-600 mt-2 text-center font-medium">
          参数已更新到表单，点击"生成视频"按钮即可使用优化后的参数
        </p>
      )}
    </div>
  );
};
