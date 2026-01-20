/**
 * AgentProgress 组件单元测试
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AgentProgress } from '../AgentProgress';
import type { ProgressMessage } from '../../types/workspace';

describe('AgentProgress', () => {
  const mockMessages: ProgressMessage[] = [
    {
      type: 'agent_start',
      agent: 'intent_analysis',
      message: '开始分析用户意图...',
      timestamp: '2025-01-15T10:00:00Z'
    },
    {
      type: 'agent_complete',
      agent: 'intent_analysis',
      message: '用户意图分析完成',
      timestamp: '2025-01-15T10:00:05Z'
    },
    {
      type: 'human_loop',
      message: '请确认意图分析是否正确',
      timestamp: '2025-01-15T10:00:06Z'
    }
  ];

  it('should render nothing if no messages and not active', () => {
    const { container } = render(
      <AgentProgress messages={[]} isActive={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isActive is true even without messages', () => {
    render(
      <AgentProgress messages={[]} isActive={true} />
    );

    expect(screen.getByText('AI 优化进度')).toBeInTheDocument();
    expect(screen.getByText('运行中')).toBeInTheDocument();
  });

  it('should render messages', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    expect(screen.getByText('AI 优化进度')).toBeInTheDocument();
    expect(screen.getByText('开始分析用户意图...')).toBeInTheDocument();
    expect(screen.getByText('用户意图分析完成')).toBeInTheDocument();
    expect(screen.getByText('请确认意图分析是否正确')).toBeInTheDocument();
  });

  it('should show agent names in Chinese', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    const agentLabels = screen.getAllByText('意图分析');
    expect(agentLabels).toHaveLength(2); // Two messages with intent_analysis agent
  });

  it('should show running indicator when active', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={true} />
    );

    expect(screen.getByText('运行中')).toBeInTheDocument();

    // Check for the animated dots
    const dotsContainer = screen.getByText('运行中').previousElementSibling;
    expect(dotsContainer).toBeInTheDocument();
    expect(dotsContainer?.className).toContain('animate-pulse');
  });

  it('should not show running indicator when not active', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    expect(screen.queryByText('运行中')).not.toBeInTheDocument();
  });

  it('should display message count when more than 5 messages', () => {
    const manyMessages: ProgressMessage[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'agent_progress' as const,
      message: `Message ${i + 1}`,
      timestamp: new Date().toISOString()
    }));

    render(
      <AgentProgress messages={manyMessages} isActive={false} />
    );

    expect(screen.getByText('共 10 条消息')).toBeInTheDocument();
  });

  it('should not display message count when 5 or fewer messages', () => {
    const fewMessages = mockMessages.slice(0, 3);

    render(
      <AgentProgress messages={fewMessages} isActive={false} />
    );

    expect(screen.queryByText(/^共 \d+ 条消息$/)).not.toBeInTheDocument();
  });

  it('should format timestamps correctly', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    // Verify time format (HH:MM:SS)
    const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should apply correct colors for different message types', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    // agent_start message - find the parent container
    const startMessageElement = screen.getByText('开始分析用户意图...');
    const startContainer = startMessageElement.parentElement?.parentElement;
    expect(startContainer?.className).toContain('text-blue-600');

    // agent_complete message
    const completeMessageElement = screen.getByText('用户意图分析完成');
    const completeContainer = completeMessageElement.parentElement?.parentElement;
    expect(completeContainer?.className).toContain('text-green-600');

    // human_loop message
    const humanLoopMessageElement = screen.getByText('请确认意图分析是否正确');
    const humanLoopContainer = humanLoopMessageElement.parentElement?.parentElement;
    expect(humanLoopContainer?.className).toContain('text-purple-600');
  });

  it('should show correct icons for message types', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    // Verify emoji icons exist
    expect(screen.getByText('🔄')).toBeInTheDocument(); // agent_start
    expect(screen.getByText('✅')).toBeInTheDocument(); // agent_complete
    expect(screen.getByText('👤')).toBeInTheDocument(); // human_loop
  });

  it('should handle error message type', () => {
    const errorMessages: ProgressMessage[] = [
      {
        type: 'error',
        message: 'An error occurred',
        timestamp: new Date().toISOString()
      }
    ];

    render(
      <AgentProgress messages={errorMessages} isActive={false} />
    );

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument(); // error icon

    const errorMessageElement = screen.getByText('An error occurred');
    const errorContainer = errorMessageElement.parentElement?.parentElement;
    expect(errorContainer?.className).toContain('text-red-600');
  });

  it('should handle agent_progress message type', () => {
    const progressMessages: ProgressMessage[] = [
      {
        type: 'agent_progress',
        agent: 'video_analysis',
        message: '正在分析视频内容...',
        timestamp: new Date().toISOString()
      }
    ];

    render(
      <AgentProgress messages={progressMessages} isActive={false} />
    );

    expect(screen.getByText('正在分析视频内容...')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument(); // progress icon
    expect(screen.getByText('视频分析')).toBeInTheDocument(); // agent name

    const progressMessageElement = screen.getByText('正在分析视频内容...');
    const progressContainer = progressMessageElement.parentElement?.parentElement;
    expect(progressContainer?.className).toContain('text-gray-600');
  });

  it('should translate agent names correctly', () => {
    const agentMessages: ProgressMessage[] = [
      {
        type: 'agent_start',
        agent: 'intent_analysis',
        message: 'Test 1',
        timestamp: new Date().toISOString()
      },
      {
        type: 'agent_start',
        agent: 'video_analysis',
        message: 'Test 2',
        timestamp: new Date().toISOString()
      },
      {
        type: 'agent_start',
        agent: 'master_agent',
        message: 'Test 3',
        timestamp: new Date().toISOString()
      },
      {
        type: 'agent_start',
        agent: 'master',
        message: 'Test 4',
        timestamp: new Date().toISOString()
      }
    ];

    render(
      <AgentProgress messages={agentMessages} isActive={false} />
    );

    expect(screen.getAllByText('意图分析')).toHaveLength(1);
    expect(screen.getAllByText('视频分析')).toHaveLength(1);
    expect(screen.getAllByText('决策引擎')).toHaveLength(2); // both master_agent and master
  });

  it('should handle messages without agent field', () => {
    const messagesWithoutAgent: ProgressMessage[] = [
      {
        type: 'agent_progress',
        message: 'Generic progress message',
        timestamp: new Date().toISOString()
      }
    ];

    render(
      <AgentProgress messages={messagesWithoutAgent} isActive={false} />
    );

    expect(screen.getByText('Generic progress message')).toBeInTheDocument();
    // Should not render agent label when agent is undefined
    expect(screen.queryByText(/^(意图分析|视频分析|决策引擎)$/)).not.toBeInTheDocument();
  });

  it('should apply hover styles', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    const messageElement = screen.getByText('开始分析用户意图...');
    const messageContainer = messageElement.parentElement?.parentElement;
    expect(messageContainer?.className).toContain('hover:bg-white');
  });

  it('should have scrollable container', () => {
    const manyMessages: ProgressMessage[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'agent_progress' as const,
      message: `Message ${i + 1}`,
      timestamp: new Date().toISOString()
    }));

    render(
      <AgentProgress messages={manyMessages} isActive={false} />
    );

    // Find the scrollable container - it's the parent of the message elements
    const messageElement = screen.getByText('Message 1');
    // Message is in <p> -> <div> (flex-1) -> <div> (message container) -> <div> (scrollable container)
    const scrollContainer = messageElement.parentElement?.parentElement?.parentElement;
    expect(scrollContainer?.className).toContain('max-h-64');
    expect(scrollContainer?.className).toContain('overflow-y-auto');
  });

  it('should render unique keys for messages', () => {
    const duplicateMessages: ProgressMessage[] = [
      {
        type: 'agent_progress',
        message: 'Same message',
        timestamp: '2025-01-15T10:00:00Z'
      },
      {
        type: 'agent_progress',
        message: 'Same message',
        timestamp: '2025-01-15T10:00:00Z'
      }
    ];

    const { container } = render(
      <AgentProgress messages={duplicateMessages} isActive={false} />
    );

    // Both messages should be rendered
    const messageElements = container.querySelectorAll('.text-sm');
    expect(messageElements.length).toBeGreaterThanOrEqual(2);
  });
});
