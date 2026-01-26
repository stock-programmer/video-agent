/**
 * v2.0.1 AnalysisProgressPanel 组件
 *
 * 实时展示 AI Agent 的分析过程
 * - 按 Agent 分组显示分析步骤
 * - 显示每个步骤的状态和结果
 * - 展示 AI 思考过程
 */

import React, { useMemo } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { AnalysisStep, ThoughtMessage } from '../types/workspace';
import { AgentStepsSection } from './AgentStepsSection';
import { ThoughtsSection } from './ThoughtsSection';

interface AnalysisProgressPanelProps {
  workspaceId: string;
}

export const AnalysisProgressPanel: React.FC<AnalysisProgressPanelProps> = ({
  workspaceId
}) => {
  const optimizationState = useWorkspaceStore(
    state => state.optimizationStates[workspaceId]
  );

  const analysisSteps = optimizationState?.analysisSteps || [];
  const thoughts = optimizationState?.thoughts || [];

  // 按 agent 分组步骤
  const stepsByAgent = useMemo(() => {
    const grouped: Record<string, AnalysisStep[]> = {};

    for (const step of analysisSteps) {
      if (!grouped[step.agent]) {
        grouped[step.agent] = [];
      }
      grouped[step.agent].push(step);
    }

    return grouped;
  }, [analysisSteps]);

  // Agent 名称映射
  const agentNames: Record<string, string> = {
    'intent_analysis': '意图分析',
    'video_analysis': '视频分析',
    'master': '决策引擎'
  };

  // Agent 颜色主题
  const agentColors: Record<string, { bg: string; border: string; text: string }> = {
    'intent_analysis': {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-700'
    },
    'video_analysis': {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      text: 'text-purple-700'
    },
    'master': {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-700'
    }
  };

  // 只要有分析步骤数据就显示，不管是否正在运行
  if (!analysisSteps || analysisSteps.length === 0) {
    return null;
  }

  return (
    <div className="analysis-progress-panel space-y-4 mb-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <span>🔍</span>
        <span>AI 分析过程</span>
      </h3>

      {/* 各 Agent 的步骤 */}
      <div className="space-y-4">
        {/* Intent Analysis */}
        {stepsByAgent['intent_analysis'] && (
          <AgentStepsSection
            agentId="intent_analysis"
            agentName={agentNames['intent_analysis']}
            steps={stepsByAgent['intent_analysis']}
            colors={agentColors['intent_analysis']}
          />
        )}

        {/* Video Analysis */}
        {stepsByAgent['video_analysis'] && (
          <AgentStepsSection
            agentId="video_analysis"
            agentName={agentNames['video_analysis']}
            steps={stepsByAgent['video_analysis']}
            colors={agentColors['video_analysis']}
          />
        )}

        {/* Master Agent */}
        {stepsByAgent['master'] && (
          <AgentStepsSection
            agentId="master"
            agentName={agentNames['master']}
            steps={stepsByAgent['master']}
            colors={agentColors['master']}
          />
        )}
      </div>

      {/* AI 思考过程 */}
      {thoughts.length > 0 && (
        <ThoughtsSection thoughts={thoughts} />
      )}
    </div>
  );
};
