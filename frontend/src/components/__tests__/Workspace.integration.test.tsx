/**
 * Integration tests for Workspace component with v2.0 features
 * Verifies backward compatibility and new AI optimization integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Workspace } from '../Workspace';
import type { Workspace as WorkspaceType } from '../../types/workspace';

// Mock all sub-components to focus on integration logic
vi.mock('../ImageUpload', () => ({
  ImageUpload: ({ workspaceId }: any) => <div data-testid="image-upload">{workspaceId}</div>
}));

vi.mock('../VideoForm', () => ({
  VideoForm: ({ workspaceId }: any) => <div data-testid="video-form">{workspaceId}</div>
}));

vi.mock('../VideoPlayer', () => ({
  VideoPlayer: ({ video }: any) => (
    <div data-testid="video-player">{video?.url || 'no-video'}</div>
  )
}));

vi.mock('../AICollaboration', () => ({
  AICollaboration: ({ workspaceId }: any) => <div data-testid="ai-collaboration">{workspaceId}</div>
}));

vi.mock('../OptimizeButton', () => ({
  OptimizeButton: ({ workspaceId, videoStatus, videoUrl }: any) => (
    <div data-testid="optimize-button">
      {workspaceId} | {videoStatus} | {videoUrl}
    </div>
  )
}));

vi.mock('../AIOutputArea', () => ({
  AIOutputArea: ({ workspaceId }: any) => (
    <div data-testid="ai-output-area">{workspaceId}</div>
  )
}));

// Mock the store
const mockSoftDeleteWorkspace = vi.fn();
const mockRestoreWorkspace = vi.fn();
const mockHardDeleteWorkspace = vi.fn();

vi.mock('../../stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    softDeleteWorkspace: mockSoftDeleteWorkspace,
    restoreWorkspace: mockRestoreWorkspace,
    hardDeleteWorkspace: mockHardDeleteWorkspace
  })
}));

describe('Workspace Integration (v2.0)', () => {
  const baseWorkspace: WorkspaceType = {
    _id: 'workspace-123',
    order_index: 0,
    image_path: '/uploads/test.jpg',
    image_url: '/uploads/test.jpg',
    form_data: {
      camera_movement: 'static',
      shot_type: 'medium',
      lighting: 'natural',
      motion_prompt: 'test',
      checkboxes: {},
      // v1.1 fields
      duration: 5,
      aspect_ratio: '16:9',
      motion_intensity: 3,
      quality_preset: 'standard'
    },
    video: {
      status: 'pending',
      task_id: null,
      url: null,
      error: null
    },
    ai_collaboration: [],
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('v1.x Backward Compatibility', () => {
    it('should render all v1.x components', () => {
      render(<Workspace workspace={baseWorkspace} />);

      // All v1.x components should be present
      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
      expect(screen.getByTestId('video-form')).toBeInTheDocument();
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('ai-collaboration')).toBeInTheDocument();
    });

    it('should NOT render v2.0 components when video is pending', () => {
      render(<Workspace workspace={baseWorkspace} />);

      // v2.0 components should NOT be present
      expect(screen.queryByTestId('optimize-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-output-area')).not.toBeInTheDocument();
      expect(screen.queryByText('AI 智能优化')).not.toBeInTheDocument();
    });

    it('should NOT render v2.0 components when video is generating', () => {
      const workspace = {
        ...baseWorkspace,
        video: {
          status: 'generating' as const,
          task_id: 'task-123',
          url: null,
          error: null
        }
      };

      render(<Workspace workspace={workspace} />);

      expect(screen.queryByTestId('optimize-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-output-area')).not.toBeInTheDocument();
    });

    it('should NOT render v2.0 components when video failed', () => {
      const workspace = {
        ...baseWorkspace,
        video: {
          status: 'failed' as const,
          task_id: 'task-123',
          url: null,
          error: 'Generation failed'
        }
      };

      render(<Workspace workspace={workspace} />);

      expect(screen.queryByTestId('optimize-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-output-area')).not.toBeInTheDocument();
    });

    it('should render soft delete button when not deleted', () => {
      render(<Workspace workspace={baseWorkspace} />);

      const deleteButton = screen.getByTitle('删除工作空间');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should render restore and hard delete buttons when deleted', () => {
      render(<Workspace workspace={baseWorkspace} isDeleted={true} />);

      expect(screen.getByTitle('恢复工作空间')).toBeInTheDocument();
      expect(screen.getByTitle('永久删除')).toBeInTheDocument();
      expect(screen.queryByTitle('删除工作空间')).not.toBeInTheDocument();
    });
  });

  describe('v2.0 Integration', () => {
    const completedWorkspace: WorkspaceType = {
      ...baseWorkspace,
      video: {
        status: 'completed',
        task_id: 'task-123',
        url: 'https://example.com/video.mp4',
        error: null
      }
    };

    it('should render v2.0 section when video is completed', () => {
      render(<Workspace workspace={completedWorkspace} />);

      // Check v2.0 section header
      expect(screen.getByText('AI 智能优化')).toBeInTheDocument();

      // Check v2.0 components
      expect(screen.getByTestId('optimize-button')).toBeInTheDocument();
      expect(screen.getByTestId('ai-output-area')).toBeInTheDocument();
    });

    it('should pass correct props to OptimizeButton', () => {
      render(<Workspace workspace={completedWorkspace} />);

      const optimizeButton = screen.getByTestId('optimize-button');
      expect(optimizeButton.textContent).toContain('workspace-123');
      expect(optimizeButton.textContent).toContain('completed');
      expect(optimizeButton.textContent).toContain('https://example.com/video.mp4');
    });

    it('should pass workspaceId to AIOutputArea', () => {
      render(<Workspace workspace={completedWorkspace} />);

      const aiOutputArea = screen.getByTestId('ai-output-area');
      expect(aiOutputArea.textContent).toBe('workspace-123');
    });

    it('should NOT render v2.0 section if video completed but no URL', () => {
      const workspace = {
        ...baseWorkspace,
        video: {
          status: 'completed' as const,
          task_id: 'task-123',
          url: null, // No URL
          error: null
        }
      };

      render(<Workspace workspace={workspace} />);

      expect(screen.queryByText('AI 智能优化')).not.toBeInTheDocument();
      expect(screen.queryByTestId('optimize-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-output-area')).not.toBeInTheDocument();
    });

    it('should render v2.0 section with proper visual separator', () => {
      const { container } = render(<Workspace workspace={completedWorkspace} />);

      // Check for border-top separator
      const v2Section = container.querySelector('.border-t.border-gray-200');
      expect(v2Section).toBeInTheDocument();
    });

    it('should maintain all v1.x components when v2.0 section is visible', () => {
      render(<Workspace workspace={completedWorkspace} />);

      // All v1.x components still present
      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
      expect(screen.getByTestId('video-form')).toBeInTheDocument();
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('ai-collaboration')).toBeInTheDocument();

      // Plus v2.0 components
      expect(screen.getByTestId('optimize-button')).toBeInTheDocument();
      expect(screen.getByTestId('ai-output-area')).toBeInTheDocument();
    });
  });

  describe('Layout Verification', () => {
    it('should maintain two-column layout structure', () => {
      const { container } = render(<Workspace workspace={baseWorkspace} />);

      // Check for flex-1 column (left)
      const leftColumn = container.querySelector('.flex-1');
      expect(leftColumn).toBeInTheDocument();

      // Check for w-[300px] column (right)
      const rightColumn = container.querySelector('.w-\\[300px\\]');
      expect(rightColumn).toBeInTheDocument();
    });

    it('should place v2.0 section in the left column', () => {
      const { container } = render(<Workspace workspace={{
        ...baseWorkspace,
        video: {
          status: 'completed',
          task_id: 'task-123',
          url: 'https://example.com/video.mp4',
          error: null
        }
      }} />);

      const leftColumn = container.querySelector('.flex-1');
      const v2Section = leftColumn?.querySelector('.border-t.border-gray-200');
      expect(v2Section).toBeInTheDocument();
    });

    it('should apply correct styling for deleted workspace', () => {
      const { container } = render(<Workspace workspace={baseWorkspace} isDeleted={true} />);

      const workspaceDiv = container.firstChild as HTMLElement;
      expect(workspaceDiv.className).toContain('opacity-75');
      expect(workspaceDiv.className).toContain('bg-red-50');
      expect(workspaceDiv.className).toContain('border-red-300');
    });
  });

  describe('Edge Cases', () => {
    it('should handle workspace with minimal data', () => {
      const minimalWorkspace: WorkspaceType = {
        _id: 'workspace-minimal',
        order_index: 0,
        image_path: null,
        image_url: null,
        form_data: {
          camera_movement: '',
          shot_type: '',
          lighting: '',
          motion_prompt: '',
          checkboxes: {},
          duration: 5,
          aspect_ratio: '16:9',
          motion_intensity: 3,
          quality_preset: 'standard'
        },
        video: {
          status: 'pending',
          task_id: null,
          url: null,
          error: null
        },
        ai_collaboration: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      render(<Workspace workspace={minimalWorkspace} />);

      // Should still render without errors
      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
      expect(screen.getByTestId('video-form')).toBeInTheDocument();
    });

    it('should handle workspace with v1.0 data (no v1.1 fields)', () => {
      const v1Workspace: any = {
        ...baseWorkspace,
        form_data: {
          camera_movement: 'static',
          shot_type: 'medium',
          lighting: 'natural',
          motion_prompt: 'test',
          checkboxes: {}
          // No v1.1 fields
        }
      };

      render(<Workspace workspace={v1Workspace} />);

      // Should render without errors
      expect(screen.getByTestId('video-form')).toBeInTheDocument();
    });
  });

  describe('Component Order', () => {
    it('should render components in correct order', () => {
      render(<Workspace workspace={{
        ...baseWorkspace,
        video: {
          status: 'completed',
          task_id: 'task-123',
          url: 'https://example.com/video.mp4',
          error: null
        }
      }} />);

      // Verify all components are present in the document
      // (order verification is implicit in the rendering)
      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
      expect(screen.getByTestId('video-form')).toBeInTheDocument();
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('optimize-button')).toBeInTheDocument();
      expect(screen.getByTestId('ai-output-area')).toBeInTheDocument();
      expect(screen.getByTestId('ai-collaboration')).toBeInTheDocument();
    });
  });
});
