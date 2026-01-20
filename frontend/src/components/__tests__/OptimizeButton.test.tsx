import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OptimizeButton } from '../OptimizeButton';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { api } from '../../services/api';
import type { VideoFormData } from '../../types/workspace';

// Mock the store
vi.mock('../../stores/workspaceStore');

// Mock the API
vi.mock('../../services/api', () => ({
  api: {
    optimizePrompt: vi.fn()
  }
}));

// Default form data for tests
const defaultFormData: VideoFormData = {
  camera_movement: 'push in',
  shot_type: 'medium shot',
  lighting: 'natural',
  motion_prompt: 'person walking slowly',
  checkboxes: {},
  duration: 5,
  aspect_ratio: '16:9',
  motion_intensity: 3,
  quality_preset: 'standard'
};

describe('OptimizeButton', () => {
  const mockStartOptimization = vi.fn();
  const mockOptimizationStates = {};

  beforeEach(() => {
    vi.clearAllMocks();

    (useWorkspaceStore as any).mockReturnValue({
      startOptimization: mockStartOptimization,
      optimizationStates: mockOptimizationStates
    });

    vi.mocked(api.optimizePrompt).mockResolvedValue({
      success: true,
      message: 'Optimization started',
      workspace_id: 'test-id'
    });
  });

  test('should render button', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('一键优化提示词');
  });

  test('should be enabled if video completed', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="pending"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('should be disabled if no video and no motion_prompt', () => {
    const formDataWithoutMotion = { ...defaultFormData, motion_prompt: '' };
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="pending"
        videoUrl={undefined}
        formData={formDataWithoutMotion}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('请先填写主体运动描述')).toBeInTheDocument();
  });

  test('should be enabled if no video but has motion_prompt', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="pending"
        videoUrl={undefined}
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  test('should trigger optimization on click', async () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockStartOptimization).toHaveBeenCalledWith('test-id');
    });

    expect(api.optimizePrompt).toHaveBeenCalledWith('test-id');
  });

  test('should show loading state while API call in progress', async () => {
    let resolveApi: any;
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    vi.mocked(api.optimizePrompt).mockReturnValue(apiPromise as any);

    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent('启动中...');
      expect(button).toBeDisabled();
    });

    resolveApi({ success: true });
  });

  test('should show error message if API fails', async () => {
    vi.mocked(api.optimizePrompt).mockRejectedValue({
      response: {
        data: {
          error: 'Workspace not found'
        }
      }
    });

    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Workspace not found/)).toBeInTheDocument();
    });
  });

  test('should be disabled when optimization is active', () => {
    (useWorkspaceStore as any).mockReturnValue({
      startOptimization: mockStartOptimization,
      optimizationStates: {
        'test-id': {
          isActive: true,
          currentStep: 'intent'
        }
      }
    });

    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('优化中...');
  });

  test('should show disabled reason when no motion_prompt and no video', () => {
    const formDataWithoutMotion = { ...defaultFormData, motion_prompt: '' };
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="pending"
        videoUrl={undefined}
        formData={formDataWithoutMotion}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', '请先填写主体运动描述');
  });

  test('should show helper tooltip when button is enabled', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
        formData={defaultFormData}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', '使用 AI 优化视频生成参数');
  });
});
