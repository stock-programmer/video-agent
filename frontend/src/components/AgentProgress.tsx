/**
 * v2.0 AgentProgress 组件
 *
 * 实时显示 AI 优化流程的进度消息
 *
 * 功能：
 * - 显示进度消息列表（agent_start, agent_progress, agent_complete, error, human_loop）
 * - 自动滚动到最新消息
 * - 显示时间戳和 Agent 名称
 * - 运行状态指示器
 */

import React, { useEffect, useRef } from 'react';
import type { ProgressMessage } from '../types/workspace';

interface AgentProgressProps {
  messages: ProgressMessage[];
  isActive: boolean;
}

export const AgentProgress: React.FC<AgentProgressProps> = ({
  messages,
  isActive
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    // Check if scrollIntoView is available (not available in some test environments)
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /**
   * 获取消息图标
   */
  const getMessageIcon = (message: ProgressMessage): string => {
    switch (message.type) {
      case 'agent_start':
        return '🔄';
      case 'agent_progress':
        return '⚙️';
      case 'agent_complete':
        return '✅';
      case 'error':
        return '❌';
      case 'human_loop':
        return '👤';
      default:
        return '📝';
    }
  };

  /**
   * 获取消息颜色类
   */
  const getMessageColor = (message: ProgressMessage): string => {
    switch (message.type) {
      case 'agent_start':
        return 'text-blue-600';
      case 'agent_progress':
        return 'text-gray-600';
      case 'agent_complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'human_loop':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  /**
   * 格式化时间
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * 获取 Agent 名称的中文显示
   */
  const getAgentDisplayName = (agent?: string): string => {
    switch (agent) {
      case 'intent_analysis':
        return '意图分析';
      case 'video_analysis':
        return '视频分析';
      case 'master_agent':
      case 'master':
        return '决策引擎';
      default:
        return agent || '';
    }
  };

  // 如果没有消息且不处于激活状态，不显示组件
  if (messages.length === 0 && !isActive) {
    return null;
  }

  return (
    <div className="agent-progress bg-gray-50 rounded-lg p-4 mt-4">
      {/* 标题和运行状态指示器 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          AI 优化进度
        </h3>
        {isActive && (
          <div className="flex items-center gap-2">
            <div className="animate-pulse flex space-x-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animation-delay-200"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animation-delay-400"></div>
            </div>
            <span className="text-xs text-blue-600">运行中</span>
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`
              flex items-start gap-2 p-2 rounded
              transition-all duration-200
              hover:bg-white
              ${getMessageColor(message)}
            `}
          >
            {/* 消息图标 */}
            <span className="text-lg flex-shrink-0">
              {getMessageIcon(message)}
            </span>

            {/* 消息内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                {/* Agent 名称标签 */}
                {message.agent && (
                  <span className="text-xs font-medium bg-gray-200 px-1.5 py-0.5 rounded">
                    {getAgentDisplayName(message.agent)}
                  </span>
                )}
                {/* 时间戳 */}
                <span className="text-xs text-gray-400">
                  {formatTime(message.timestamp)}
                </span>
              </div>

              {/* 消息文本 */}
              <p className="text-sm mt-1 break-words">
                {message.message}
              </p>
            </div>
          </div>
        ))}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 消息计数 */}
      {messages.length > 5 && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          共 {messages.length} 条消息
        </div>
      )}
    </div>
  );
};
