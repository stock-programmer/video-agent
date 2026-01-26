/**
 * ThoughtsSection 组件
 *
 * 显示 AI 的思考过程
 * - 展示 Agent 的内部推理
 * - 时间戳排序
 * - 类似 ChatGPT 的思考显示
 */

import React from 'react';
import type { ThoughtMessage } from '../types/workspace';

interface ThoughtsSectionProps {
  thoughts: ThoughtMessage[];
}

export const ThoughtsSection: React.FC<ThoughtsSectionProps> = ({ thoughts }) => {
  // 获取 Agent 名称
  const getAgentName = (agent: string): string => {
    const names: Record<string, string> = {
      'intent_analysis': '意图分析',
      'video_analysis': '视频分析',
      'master': '决策引擎'
    };
    return names[agent] || agent;
  };

  // 获取 Agent 颜色
  const getAgentColor = (agent: string): { bg: string; border: string; dot: string } => {
    const colors: Record<string, { bg: string; border: string; dot: string }> = {
      'intent_analysis': {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        dot: 'bg-blue-500'
      },
      'video_analysis': {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        dot: 'bg-purple-500'
      },
      'master': {
        bg: 'bg-green-50',
        border: 'border-green-200',
        dot: 'bg-green-500'
      }
    };
    return colors[agent] || { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-500' };
  };

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return '';
    }
  };

  if (thoughts.length === 0) {
    return null;
  }

  return (
    <div className="thoughts-section mt-6">
      <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span>💭</span>
        <span>AI 思考过程</span>
      </h4>

      <div className="space-y-2">
        {thoughts.map((thought, index) => {
          const colors = getAgentColor(thought.agent);

          return (
            <div
              key={`thought-${index}`}
              className={`thought-item rounded-lg border ${colors.border} ${colors.bg} p-3 transition-all hover:shadow-sm`}
            >
              {/* 思考内容 */}
              <div className="flex gap-2">
                {/* 代理点 */}
                <div className="flex-shrink-0 pt-1">
                  <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1`} />
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {getAgentName(thought.agent)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(thought.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                    {thought.thought}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
