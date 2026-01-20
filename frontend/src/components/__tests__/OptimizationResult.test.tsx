/**
 * Unit tests for OptimizationResult component
 * v2.0 Layer 3 Task 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OptimizationResult } from '../OptimizationResult';
import type { OptimizationResult as OptimizationResultType } from '../../types/workspace';

// Mock the store
const mockApplyOptimization = vi.fn();
vi.mock('../../stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    applyOptimization: mockApplyOptimization
  })
}));

describe('OptimizationResult', () => {
  const mockWorkspaceId = 'workspace-123';

  const mockResult: OptimizationResultType = {
    ng_reasons: [
      '运动强度过低，无法体现期望的动态效果',
      '时长设置为5秒，可能不足以完整表达场景'
    ],
    changes: [
      {
        field: 'motion_intensity',
        old_value: 2,
        new_value: 4,
        reason: '提升运动强度以匹配用户期望的动态效果'
      },
      {
        field: 'duration',
        old_value: 5,
        new_value: 10,
        reason: '延长时长以充分展现场景内容'
      }
    ],
    optimized_params: {
      motion_intensity: 4,
      duration: 10
    },
    confidence: 0.85
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render optimization result with NG reasons', () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    // Check title
    expect(screen.getByText('AI 优化建议')).toBeInTheDocument();

    // Check NG reasons section
    expect(screen.getByText('当前问题')).toBeInTheDocument();
    expect(screen.getByText('运动强度过低，无法体现期望的动态效果')).toBeInTheDocument();
    expect(screen.getByText('时长设置为5秒，可能不足以完整表达场景')).toBeInTheDocument();
  });

  it('should display parameter changes correctly', () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    // Check changes section
    expect(screen.getByText('建议调整')).toBeInTheDocument();

    // Check field names (Chinese display names)
    expect(screen.getByText('运动强度')).toBeInTheDocument();
    expect(screen.getByText('视频时长')).toBeInTheDocument();

    // Check old and new values
    expect(screen.getByText('2')).toBeInTheDocument(); // old motion_intensity
    expect(screen.getByText('4')).toBeInTheDocument(); // new motion_intensity
    expect(screen.getByText('5')).toBeInTheDocument(); // old duration
    expect(screen.getByText('10')).toBeInTheDocument(); // new duration

    // Check reasons
    expect(screen.getByText('提升运动强度以匹配用户期望的动态效果')).toBeInTheDocument();
    expect(screen.getByText('延长时长以充分展现场景内容')).toBeInTheDocument();
  });

  it('should display AI confidence with correct color', () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    // Check confidence percentage
    expect(screen.getByText('85%')).toBeInTheDocument();

    // Check confidence label
    expect(screen.getByText('AI 置信度')).toBeInTheDocument();

    // Check high confidence message
    expect(screen.getByText(/高置信度 - AI 强烈推荐应用这些优化/)).toBeInTheDocument();
  });

  it('should show medium confidence styling for 60-80% confidence', () => {
    const mediumConfidenceResult: OptimizationResultType = {
      ...mockResult,
      confidence: 0.7
    };

    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mediumConfidenceResult} />);

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText(/中等置信度 - AI 认为这些优化会有帮助/)).toBeInTheDocument();
  });

  it('should show low confidence styling for <60% confidence', () => {
    const lowConfidenceResult: OptimizationResultType = {
      ...mockResult,
      confidence: 0.5
    };

    render(<OptimizationResult workspaceId={mockWorkspaceId} result={lowConfidenceResult} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/低置信度 - 建议谨慎参考这些优化建议/)).toBeInTheDocument();
  });

  it('should call applyOptimization when apply button is clicked', async () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    const applyButton = screen.getByText('应用优化建议');
    expect(applyButton).toBeInTheDocument();

    fireEvent.click(applyButton);

    // Check that store action was called with correct params
    expect(mockApplyOptimization).toHaveBeenCalledWith(mockWorkspaceId, mockResult.optimized_params);
  });

  it('should show loading state when applying', async () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    const applyButton = screen.getByText('应用优化建议');
    fireEvent.click(applyButton);

    // Should show loading state immediately
    await waitFor(() => {
      expect(screen.getByText('应用中...')).toBeInTheDocument();
    });
  });

  it('should show applied state after applying', async () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    const applyButton = screen.getByText('应用优化建议');
    fireEvent.click(applyButton);

    // Wait for applied state (1000ms timeout in component)
    await waitFor(() => {
      expect(screen.getByText('已应用到表单')).toBeInTheDocument();
    }, { timeout: 1500 });

    // Check success message
    expect(screen.getByText(/参数已更新到表单，点击"生成视频"按钮即可使用优化后的参数/)).toBeInTheDocument();
  });

  it('should disable button during loading and after applied', async () => {
    render(<OptimizationResult workspaceId={mockWorkspaceId} result={mockResult} />);

    const applyButton = screen.getByText('应用优化建议');
    expect(applyButton).not.toBeDisabled();

    fireEvent.click(applyButton);

    // Should be disabled during loading
    await waitFor(() => {
      const loadingButton = screen.getByText('应用中...');
      expect(loadingButton).toBeDisabled();
    });

    // Should still be disabled after applied
    await waitFor(() => {
      const appliedButton = screen.getByText('已应用到表单');
      expect(appliedButton).toBeDisabled();
    }, { timeout: 1500 });
  });

  it('should format field display names correctly', () => {
    const resultWithAllFields: OptimizationResultType = {
      ng_reasons: ['Test'],
      changes: [
        { field: 'motion_intensity', old_value: 1, new_value: 2, reason: 'Test' },
        { field: 'duration', old_value: 5, new_value: 10, reason: 'Test' },
        { field: 'aspect_ratio', old_value: '16:9', new_value: '9:16', reason: 'Test' },
        { field: 'quality_preset', old_value: 'draft', new_value: 'high', reason: 'Test' },
        { field: 'camera_movement', old_value: 'static', new_value: 'pan', reason: 'Test' },
        { field: 'shot_type', old_value: 'close-up', new_value: 'wide', reason: 'Test' },
        { field: 'lighting', old_value: 'natural', new_value: 'dramatic', reason: 'Test' },
        { field: 'motion_prompt', old_value: 'old', new_value: 'new', reason: 'Test' }
      ],
      optimized_params: {},
      confidence: 0.8
    };

    render(<OptimizationResult workspaceId={mockWorkspaceId} result={resultWithAllFields} />);

    // Check all Chinese display names
    expect(screen.getByText('运动强度')).toBeInTheDocument();
    expect(screen.getByText('视频时长')).toBeInTheDocument();
    expect(screen.getByText('宽高比')).toBeInTheDocument();
    expect(screen.getByText('视频质量')).toBeInTheDocument();
    expect(screen.getByText('运镜方式')).toBeInTheDocument();
    expect(screen.getByText('景别')).toBeInTheDocument();
    expect(screen.getByText('光线')).toBeInTheDocument();
    expect(screen.getByText('运动描述')).toBeInTheDocument();
  });

  it('should handle empty NG reasons array', () => {
    const resultWithoutReasons: OptimizationResultType = {
      ...mockResult,
      ng_reasons: []
    };

    render(<OptimizationResult workspaceId={mockWorkspaceId} result={resultWithoutReasons} />);

    // Component should still render
    expect(screen.getByText('AI 优化建议')).toBeInTheDocument();
    expect(screen.getByText('当前问题')).toBeInTheDocument();
  });

  it('should handle empty changes array', () => {
    const resultWithoutChanges: OptimizationResultType = {
      ...mockResult,
      changes: []
    };

    render(<OptimizationResult workspaceId={mockWorkspaceId} result={resultWithoutChanges} />);

    // Component should still render
    expect(screen.getByText('AI 优化建议')).toBeInTheDocument();
    expect(screen.getByText('建议调整')).toBeInTheDocument();
  });
});
