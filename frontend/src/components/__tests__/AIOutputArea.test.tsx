/**
 * Unit tests for AIOutputArea component
 * v2.0 Layer 3 Task 1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { AIOutputArea } from '../AIOutputArea';
import type { OptimizationState } from '../../types/workspace';

// Mock child components
vi.mock('../AgentProgress', () => ({
  AgentProgress: ({ messages, isActive }: any) => (
    <div data-testid="agent-progress">
      AgentProgress: {messages.length} messages, active: {String(isActive)}
    </div>
  )
}));

vi.mock('../IntentReportModal', () => ({
  IntentReportModal: ({ isOpen, workspaceId, _intentReport }: any) => (
    <div data-testid="intent-modal">
      Modal isOpen: {String(isOpen)}, workspace: {workspaceId}
    </div>
  )
}));

vi.mock('../OptimizationResult', () => ({
  OptimizationResult: ({ workspaceId, result }: any) => (
    <div data-testid="optimization-result">
      Result for {workspaceId}, confidence: {result.confidence}
    </div>
  )
}));

// Mock the store
let mockOptimizationStates: Record<string, OptimizationState> = {};
vi.mock('../../stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    optimizationStates: mockOptimizationStates
  })
}));

describe('AIOutputArea', () => {
  const mockWorkspaceId = 'workspace-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockOptimizationStates = {};
  });

  it('should return null if no optimization state exists', () => {
    const { container } = render(<AIOutputArea workspaceId={mockWorkspaceId} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render AgentProgress when progress messages exist', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [
        {
          agent: 'intent',
          message: 'Analyzing user intent...',
          timestamp: new Date(),
          level: 'info'
        }
      ],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    const agentProgress = screen.getByTestId('agent-progress');
    expect(agentProgress).toBeInTheDocument();
    expect(agentProgress.textContent).toContain('1 messages');
    expect(agentProgress.textContent).toContain('active: true');
  });

  it('should render AgentProgress when optimization is active even with no messages', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    const agentProgress = screen.getByTestId('agent-progress');
    expect(agentProgress).toBeInTheDocument();
  });

  it('should auto-open IntentReportModal when intent report arrives and step is waiting', async () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'waiting',
      intentReport: {
        user_intent: {
          scene_description: 'Test scene',
          desired_mood: 'Happy',
          key_elements: ['sky', 'clouds'],
          motion_expectation: 'Smooth'
        },
        confidence: 0.9
      },
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    await waitFor(() => {
      const modal = screen.getByTestId('intent-modal');
      expect(modal).toBeInTheDocument();
      expect(modal.textContent).toContain('isOpen: true');
    });
  });

  it('should NOT auto-open modal if intent report exists but step is not waiting', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'video',
      intentReport: {
        user_intent: {
          scene_description: 'Test scene',
          desired_mood: 'Happy',
          key_elements: ['sky', 'clouds'],
          motion_expectation: 'Smooth'
        },
        confidence: 0.9
      },
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    const modal = screen.getByTestId('intent-modal');
    expect(modal.textContent).toContain('isOpen: false');
  });

  it('should close modal when optimization completes', async () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: false,
      currentStep: 'complete',
      intentReport: {
        user_intent: {
          scene_description: 'Test scene',
          desired_mood: 'Happy',
          key_elements: ['sky'],
          motion_expectation: 'Smooth'
        },
        confidence: 0.9
      },
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    await waitFor(() => {
      const modal = screen.getByTestId('intent-modal');
      expect(modal.textContent).toContain('isOpen: false');
    });
  });

  it('should close modal when error occurs', async () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: false,
      currentStep: 'intent',
      intentReport: {
        user_intent: {
          scene_description: 'Test scene',
          desired_mood: 'Happy',
          key_elements: ['sky'],
          motion_expectation: 'Smooth'
        },
        confidence: 0.9
      },
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: 'Something went wrong'
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    await waitFor(() => {
      const modal = screen.getByTestId('intent-modal');
      expect(modal.textContent).toContain('isOpen: false');
    });
  });

  it('should render OptimizationResult when final result exists', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: false,
      currentStep: 'complete',
      intentReport: null,
      videoAnalysis: null,
      finalResult: {
        ng_reasons: ['Issue 1'],
        changes: [],
        optimized_params: {},
        confidence: 0.85
      },
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    const result = screen.getByTestId('optimization-result');
    expect(result).toBeInTheDocument();
    expect(result.textContent).toContain('confidence: 0.85');
  });

  it('should display error message when error exists', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: false,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: 'API connection failed'
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.getByText('优化流程出错')).toBeInTheDocument();
    expect(screen.getByText('API connection failed')).toBeInTheDocument();
  });

  it('should show status indicator for intent step', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.getByText('AI 正在分析您的意图...')).toBeInTheDocument();
  });

  it('should show status indicator for waiting step', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'waiting',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.getByText('等待您确认意图分析结果...')).toBeInTheDocument();
  });

  it('should show status indicator for video step', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'video',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.getByText('AI 正在分析视频质量...')).toBeInTheDocument();
  });

  it('should show status indicator for decision step', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'decision',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.getByText('AI 正在生成优化建议...')).toBeInTheDocument();
  });

  it('should show completion message when step is complete and not active', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: false,
      currentStep: 'complete',
      intentReport: null,
      videoAnalysis: null,
      finalResult: {
        ng_reasons: [],
        changes: [],
        optimized_params: {},
        confidence: 0.8
      },
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.getByText('优化流程已完成！请查看上方的优化建议。')).toBeInTheDocument();
  });

  it('should not show status indicator when not active', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: false,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.queryByText('AI 正在分析您的意图...')).not.toBeInTheDocument();
  });

  it('should not show status indicator when error exists', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: 'Error occurred'
    };

    render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    expect(screen.queryByText('AI 正在分析您的意图...')).not.toBeInTheDocument();
  });

  it('should have scrollable container with correct styles', () => {
    mockOptimizationStates[mockWorkspaceId] = {
      isActive: true,
      currentStep: 'intent',
      intentReport: null,
      videoAnalysis: null,
      finalResult: null,
      progressMessages: [],
      error: null
    };

    const { container } = render(<AIOutputArea workspaceId={mockWorkspaceId} />);

    const outputArea = container.querySelector('.ai-output-area');
    expect(outputArea).toBeInTheDocument();
    expect(outputArea).toHaveClass('mt-4');
    expect(outputArea).toHaveClass('max-h-[600px]');
    expect(outputArea).toHaveClass('overflow-y-auto');
  });
});
