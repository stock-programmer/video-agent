/**
 * IntentReportModal 组件单元测试
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntentReportModal } from '../IntentReportModal';
import type { IntentReport } from '../../types/workspace';
import { wsClient } from '../../services/websocket';

// Mock WebSocket client
vi.mock('../../services/websocket', () => ({
  wsClient: {
    sendHumanConfirmation: vi.fn()
  }
}));

describe('IntentReportModal', () => {
  const mockIntentReport: IntentReport = {
    user_intent: {
      scene_description: '一个人在公园里散步，周围有树木和自然光',
      desired_mood: '平静、放松、悠闲',
      key_elements: ['人物', '户外环境', '自然光', '树木背景'],
      motion_expectation: '缓慢的步行动作，没有突然的快速移动',
      energy_level: '低到中等（放松节奏）'
    },
    parameter_analysis: {
      aligned: ['自然光照设置与户外场景匹配', '相机跟随运动适合展现步行场景'],
      potential_issues: ['运动强度=3 可能与"缓慢"不匹配', '镜头推进效果可能过于强烈']
    },
    confidence: 0.85
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    workspaceId: 'test-workspace-id',
    intentReport: mockIntentReport
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <IntentReportModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<IntentReportModal {...defaultProps} />);

    expect(screen.getByText('🤖 AI 意图分析结果')).toBeInTheDocument();
  });

  it('should display all intent report fields', () => {
    render(<IntentReportModal {...defaultProps} />);

    // 场景描述
    expect(screen.getByText('一个人在公园里散步，周围有树木和自然光')).toBeInTheDocument();

    // 期望情绪
    expect(screen.getByText('平静、放松、悠闲')).toBeInTheDocument();

    // 关键元素
    expect(screen.getByText('人物')).toBeInTheDocument();
    expect(screen.getByText('户外环境')).toBeInTheDocument();
    expect(screen.getByText('自然光')).toBeInTheDocument();
    expect(screen.getByText('树木背景')).toBeInTheDocument();

    // 运动预期
    expect(screen.getByText('缓慢的步行动作，没有突然的快速移动')).toBeInTheDocument();

    // 能量等级
    expect(screen.getByText('低到中等（放松节奏）')).toBeInTheDocument();
  });

  it('should display parameter analysis aligned items', () => {
    render(<IntentReportModal {...defaultProps} />);

    expect(screen.getByText(/自然光照设置与户外场景匹配/)).toBeInTheDocument();
    expect(screen.getByText(/相机跟随运动适合展现步行场景/)).toBeInTheDocument();
  });

  it('should display parameter analysis potential issues', () => {
    render(<IntentReportModal {...defaultProps} />);

    expect(screen.getByText(/运动强度=3 可能与"缓慢"不匹配/)).toBeInTheDocument();
    expect(screen.getByText(/镜头推进效果可能过于强烈/)).toBeInTheDocument();
  });

  it('should display confidence score', () => {
    render(<IntentReportModal {...defaultProps} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/高置信度/)).toBeInTheDocument();
  });

  it('should show medium confidence message for confidence 0.6-0.8', () => {
    const mediumConfidenceReport = {
      ...mockIntentReport,
      confidence: 0.7
    };

    render(<IntentReportModal {...defaultProps} intentReport={mediumConfidenceReport} />);

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText(/中等置信度/)).toBeInTheDocument();
  });

  it('should show low confidence message for confidence < 0.6', () => {
    const lowConfidenceReport = {
      ...mockIntentReport,
      confidence: 0.5
    };

    render(<IntentReportModal {...defaultProps} intentReport={lowConfidenceReport} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/低置信度/)).toBeInTheDocument();
  });

  it('should call sendHumanConfirmation with true when confirm button clicked', async () => {
    render(<IntentReportModal {...defaultProps} />);

    const confirmButton = screen.getByText('✓ 确认，继续优化');
    fireEvent.click(confirmButton);

    expect(wsClient.sendHumanConfirmation).toHaveBeenCalledWith('test-workspace-id', true);
  });

  it('should call sendHumanConfirmation with false when reject button clicked', async () => {
    render(<IntentReportModal {...defaultProps} />);

    const rejectButton = screen.getByText('✗ 拒绝，停止流程');
    fireEvent.click(rejectButton);

    expect(wsClient.sendHumanConfirmation).toHaveBeenCalledWith('test-workspace-id', false);
  });

  it('should call onClose after confirmation with delay', async () => {
    vi.useFakeTimers();

    render(<IntentReportModal {...defaultProps} />);

    const confirmButton = screen.getByText('✓ 确认，继续优化');
    fireEvent.click(confirmButton);

    // onClose should not be called immediately
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    // Fast-forward time by 500ms and wait for state updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // onClose should now be called
    expect(defaultProps.onClose).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should disable buttons when submitting', () => {
    render(<IntentReportModal {...defaultProps} />);

    const confirmButton = screen.getByText('✓ 确认，继续优化');
    const rejectButton = screen.getByText('✗ 拒绝，停止流程');

    // Initially buttons should be enabled
    expect(confirmButton).not.toBeDisabled();
    expect(rejectButton).not.toBeDisabled();

    // Click confirm button
    fireEvent.click(confirmButton);

    // Both buttons should now be disabled
    expect(confirmButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();

    // Both buttons should show "处理中..."
    const processingTexts = screen.getAllByText('处理中...');
    expect(processingTexts).toHaveLength(2);
  });

  it('should not render energy_level if not provided', () => {
    const reportWithoutEnergyLevel: IntentReport = {
      ...mockIntentReport,
      user_intent: {
        ...mockIntentReport.user_intent,
        energy_level: undefined
      }
    };

    render(<IntentReportModal {...defaultProps} intentReport={reportWithoutEnergyLevel} />);

    expect(screen.queryByText('⚡ 能量等级')).not.toBeInTheDocument();
  });

  it('should not render parameter_analysis if not provided', () => {
    const reportWithoutAnalysis: IntentReport = {
      ...mockIntentReport,
      parameter_analysis: undefined
    };

    render(<IntentReportModal {...defaultProps} intentReport={reportWithoutAnalysis} />);

    expect(screen.queryByText('📊 参数分析')).not.toBeInTheDocument();
    expect(screen.queryByText('✅ 匹配项')).not.toBeInTheDocument();
    expect(screen.queryByText('⚠️ 潜在问题')).not.toBeInTheDocument();
  });

  it('should not render aligned items if empty', () => {
    const reportWithoutAligned: IntentReport = {
      ...mockIntentReport,
      parameter_analysis: {
        aligned: [],
        potential_issues: mockIntentReport.parameter_analysis!.potential_issues
      }
    };

    render(<IntentReportModal {...defaultProps} intentReport={reportWithoutAligned} />);

    expect(screen.queryByText('✅ 匹配项')).not.toBeInTheDocument();
  });

  it('should not render potential issues if empty', () => {
    const reportWithoutIssues: IntentReport = {
      ...mockIntentReport,
      parameter_analysis: {
        aligned: mockIntentReport.parameter_analysis!.aligned,
        potential_issues: []
      }
    };

    render(<IntentReportModal {...defaultProps} intentReport={reportWithoutIssues} />);

    expect(screen.queryByText('⚠️ 潜在问题')).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<IntentReportModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

    const title = screen.getByText('🤖 AI 意图分析结果');
    expect(title).toHaveAttribute('id', 'modal-title');
  });

  it('should apply correct confidence bar color for high confidence', () => {
    render(<IntentReportModal {...defaultProps} />);

    // Find the confidence bar
    const bars = document.querySelectorAll('[style*="width"]');
    const confidenceBar = Array.from(bars).find(el =>
      el.className.includes('bg-green-500')
    );

    expect(confidenceBar).toBeTruthy();
  });

  it('should apply correct confidence bar color for medium confidence', () => {
    const mediumConfidenceReport = {
      ...mockIntentReport,
      confidence: 0.7
    };

    render(<IntentReportModal {...defaultProps} intentReport={mediumConfidenceReport} />);

    const bars = document.querySelectorAll('[style*="width"]');
    const confidenceBar = Array.from(bars).find(el =>
      el.className.includes('bg-yellow-500')
    );

    expect(confidenceBar).toBeTruthy();
  });

  it('should apply correct confidence bar color for low confidence', () => {
    const lowConfidenceReport = {
      ...mockIntentReport,
      confidence: 0.5
    };

    render(<IntentReportModal {...defaultProps} intentReport={lowConfidenceReport} />);

    const bars = document.querySelectorAll('[style*="width"]');
    const confidenceBar = Array.from(bars).find(el =>
      el.className.includes('bg-red-500')
    );

    expect(confidenceBar).toBeTruthy();
  });

  it('should render all key elements as chips', () => {
    render(<IntentReportModal {...defaultProps} />);

    const keyElements = mockIntentReport.user_intent.key_elements;
    keyElements.forEach(element => {
      const chip = screen.getByText(element);
      expect(chip).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  it('should display help text about confirmation', () => {
    render(<IntentReportModal {...defaultProps} />);

    expect(screen.getByText(/确认后，AI 将基于此分析继续优化视频参数/)).toBeInTheDocument();
  });

  it('should display instruction text', () => {
    render(<IntentReportModal {...defaultProps} />);

    expect(screen.getByText(/AI 已分析您的视频生成参数和意图/)).toBeInTheDocument();
  });
});
