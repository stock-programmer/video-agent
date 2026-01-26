/**
 * AgentStepsSection 组件
 *
 * 显示单个 Agent 的所有分析步骤
 * - 按顺序显示步骤
 * - 显示步骤状态（运行中/已完成）
 * - 展示步骤结果（可折叠）
 */

import React, { useState } from 'react';
import type { AnalysisStep } from '../types/workspace';

interface AgentStepsSectionProps {
  agentId: string;
  agentName: string;
  steps: AnalysisStep[];
  colors: {
    bg: string;
    border: string;
    text: string;
  };
}

export const AgentStepsSection: React.FC<AgentStepsSectionProps> = ({
  agentId,
  agentName,
  steps,
  colors
}) => {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // 获取步骤图标
  const getStepIcon = (status: 'running' | 'completed'): string => {
    if (status === 'completed') {
      return '✅';
    }
    return '⏳';
  };

  // 获取步骤背景颜色
  const getStepBgColor = (status: 'running' | 'completed'): string => {
    if (status === 'completed') {
      return 'bg-gray-50 border-gray-300';
    }
    return 'bg-white border-yellow-200 border-dashed';
  };

  // 获取Agent图标
  const agentIcons: Record<string, string> = {
    'intent_analysis': '🧠',
    'video_analysis': '🎬',
    'master': '⚙️'
  };

  return (
    <div className={`agent-section rounded-lg border-2 ${colors.border} ${colors.bg} p-4`}>
      {/* Agent 标题 */}
      <div className={`flex items-center gap-2 mb-3 ${colors.text}`}>
        <span className="text-xl">{agentIcons[agentId]}</span>
        <h4 className="font-bold text-base">{agentName}</h4>
        <span className="text-xs ml-auto">
          {steps.filter(s => s.status === 'completed').length}/{steps.length}
        </span>
      </div>

      {/* 步骤列表 */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={`${step.phase}-${index}`}
            className={`step-item border rounded-md transition-all ${getStepBgColor(step.status)}`}
          >
            {/* 步骤头部 */}
            <button
              onClick={() =>
                setExpandedPhase(
                  expandedPhase === step.phase ? null : step.phase
                )
              }
              className="w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-gray-100 rounded-md transition"
            >
              {/* 图标和状态 */}
              <span className="flex-shrink-0 pt-0.5">
                {getStepIcon(step.status)}
              </span>

              {/* 标题和描述 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm">
                  {step.title}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                  {step.description}
                </div>
              </div>

              {/* 可展开指示 */}
              {step.result && (
                <div className="flex-shrink-0 text-gray-400 text-sm">
                  {expandedPhase === step.phase ? '▼' : '▶'}
                </div>
              )}
            </button>

            {/* 步骤结果（展开） */}
            {step.result && expandedPhase === step.phase && (
              <div className="px-3 pb-2 border-t border-gray-300 bg-white bg-opacity-50 rounded-b">
                <div className="mt-2 text-xs text-gray-700 space-y-1">
                  {typeof step.result === 'object' ? (
                    <div className="bg-gray-50 p-2 rounded text-xs font-mono overflow-auto max-h-32">
                      <pre>{JSON.stringify(step.result, null, 2)}</pre>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-2 rounded">
                      {String(step.result)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
