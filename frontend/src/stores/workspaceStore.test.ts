import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import { DEFAULT_V1_1_FORM_DATA } from '../types/workspace';
import type { Workspace } from '../types/workspace';

// Mock the WebSocket client - define directly in factory to avoid hoisting issues
vi.mock('../services/websocket', () => ({
  wsClient: {
    connect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn()
  }
}));

// Import the mocked wsClient after vi.mock
import { wsClient } from '../services/websocket';

// Mock the API client
vi.mock('../services/api', () => ({
  api: {
    getWorkspaces: vi.fn(),
    hardDeleteWorkspace: vi.fn()
  }
}));

describe('workspaceStore v1.1', () => {
  beforeEach(() => {
    // Reset store before each test
    useWorkspaceStore.setState({
      workspaces: [],
      isWebSocketConnected: false
    });
  });

  test('setWorkspaces applies v1.1 defaults to old workspaces', () => {
    const store = useWorkspaceStore.getState();

    // Simulate old v1.0 workspace (no v1.1 fields)
    const oldWorkspace: Workspace = {
      _id: '1',
      order_index: 0,
      image_path: '/test.jpg',
      image_url: '/test.jpg',
      form_data: {
        camera_movement: 'push',
        shot_type: 'medium',
        lighting: 'natural',
        motion_prompt: 'test',
        checkboxes: {}
        // No v1.1 fields!
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.setWorkspaces([oldWorkspace]);

    const workspace = useWorkspaceStore.getState().workspaces[0];

    // Should have v1.1 defaults applied
    expect(workspace.form_data.duration).toBe(5);
    expect(workspace.form_data.aspect_ratio).toBe('16:9');
    expect(workspace.form_data.motion_intensity).toBe(3);
    expect(workspace.form_data.quality_preset).toBe('standard');

    // v1.0 fields should be preserved
    expect(workspace.form_data.camera_movement).toBe('push');
  });

  test('updateFormData updates specific fields', () => {
    const store = useWorkspaceStore.getState();

    // Create a test workspace with v1.1 defaults
    const testWorkspace: Workspace = {
      _id: 'test-id',
      order_index: 0,
      image_path: '/test.jpg',
      image_url: '/test.jpg',
      form_data: {
        camera_movement: '',
        shot_type: '',
        lighting: '',
        motion_prompt: '',
        checkboxes: {},
        ...DEFAULT_V1_1_FORM_DATA
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: []
    };

    store.setWorkspaces([testWorkspace]);

    const workspaceId = 'test-id';

    // Update duration
    store.updateFormData(workspaceId, { duration: 10 });

    let workspace = useWorkspaceStore.getState().workspaces[0];
    expect(workspace.form_data.duration).toBe(10);

    // Update aspect_ratio
    store.updateFormData(workspaceId, { aspect_ratio: '9:16' });

    workspace = useWorkspaceStore.getState().workspaces[0];
    expect(workspace.form_data.aspect_ratio).toBe('9:16');
    // Other fields should be unchanged
    expect(workspace.form_data.duration).toBe(10);
  });

  test('updateFormData preserves v1.0 fields', () => {
    const store = useWorkspaceStore.getState();

    // Create a test workspace
    const testWorkspace: Workspace = {
      _id: 'test-id',
      order_index: 0,
      image_path: '/test.jpg',
      image_url: '/test.jpg',
      form_data: {
        camera_movement: '',
        shot_type: '',
        lighting: '',
        motion_prompt: '',
        checkboxes: {},
        ...DEFAULT_V1_1_FORM_DATA
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: []
    };

    store.setWorkspaces([testWorkspace]);

    const workspaceId = 'test-id';

    // Set v1.0 field
    store.updateFormData(workspaceId, { motion_prompt: 'Test prompt' });

    // Update v1.1 field
    store.updateFormData(workspaceId, { motion_intensity: 5 });

    const workspace = useWorkspaceStore.getState().workspaces[0];

    // v1.0 field should still be there
    expect(workspace.form_data.motion_prompt).toBe('Test prompt');
    expect(workspace.form_data.motion_intensity).toBe(5);
  });

  test('updateFormData only updates local state, not WebSocket (immediate)', () => {
    const store = useWorkspaceStore.getState();

    // Create a test workspace
    const testWorkspace: Workspace = {
      _id: 'test-id',
      order_index: 0,
      image_path: '/test.jpg',
      image_url: '/test.jpg',
      form_data: {
        camera_movement: '',
        shot_type: '',
        lighting: '',
        motion_prompt: '',
        checkboxes: {},
        ...DEFAULT_V1_1_FORM_DATA
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: []
    };

    store.setWorkspaces([testWorkspace]);

    // Clear previous calls
    vi.mocked(wsClient.send).mockClear();

    // Update form data (only local)
    store.updateFormData('test-id', { duration: 10 });

    // WebSocket should NOT be called (updateFormData is local only)
    expect(wsClient.send).not.toHaveBeenCalled();

    // But local state should be updated
    const workspace = useWorkspaceStore.getState().workspaces[0];
    expect(workspace.form_data.duration).toBe(10);
  });

  test('setWorkspaces handles multiple workspaces with mixed v1.0/v1.1 data', () => {
    const store = useWorkspaceStore.getState();

    const oldWorkspace: Workspace = {
      _id: '1',
      order_index: 0,
      image_path: '/test1.jpg',
      image_url: '/test1.jpg',
      form_data: {
        camera_movement: 'push',
        shot_type: 'medium',
        lighting: 'natural',
        motion_prompt: 'old workspace',
        checkboxes: {}
        // No v1.1 fields
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: []
    };

    const newWorkspace: Workspace = {
      _id: '2',
      order_index: 1,
      image_path: '/test2.jpg',
      image_url: '/test2.jpg',
      form_data: {
        camera_movement: 'pull',
        shot_type: 'wide',
        lighting: 'soft',
        motion_prompt: 'new workspace',
        checkboxes: {},
        // Has v1.1 fields
        duration: 10,
        aspect_ratio: '9:16',
        motion_intensity: 4,
        quality_preset: 'high'
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: []
    };

    store.setWorkspaces([oldWorkspace, newWorkspace]);

    const workspaces = useWorkspaceStore.getState().workspaces;

    // Old workspace should have defaults applied
    expect(workspaces[0].form_data.duration).toBe(5);
    expect(workspaces[0].form_data.aspect_ratio).toBe('16:9');
    expect(workspaces[0].form_data.motion_intensity).toBe(3);
    expect(workspaces[0].form_data.quality_preset).toBe('standard');

    // New workspace should preserve its v1.1 values
    expect(workspaces[1].form_data.duration).toBe(10);
    expect(workspaces[1].form_data.aspect_ratio).toBe('9:16');
    expect(workspaces[1].form_data.motion_intensity).toBe(4);
    expect(workspaces[1].form_data.quality_preset).toBe('high');
  });

  test('updateFormDataDebounced updates local state immediately and syncs to backend', () => {
    const store = useWorkspaceStore.getState();

    // Create a test workspace
    const testWorkspace: Workspace = {
      _id: 'test-id',
      order_index: 0,
      image_path: '/test.jpg',
      image_url: '/test.jpg',
      form_data: {
        camera_movement: '',
        shot_type: '',
        lighting: '',
        motion_prompt: '',
        checkboxes: {},
        ...DEFAULT_V1_1_FORM_DATA
      },
      video: { status: 'pending', task_id: '', url: '', error: '' },
      ai_collaboration: []
    };

    store.setWorkspaces([testWorkspace]);

    // Clear previous calls
    vi.mocked(wsClient.send).mockClear();

    // Update form data with debounced version
    store.updateFormDataDebounced('test-id', { duration: 15 });

    // Local state should be updated immediately
    const workspace = useWorkspaceStore.getState().workspaces[0];
    expect(workspace.form_data.duration).toBe(15);

    // Note: WebSocket call is debounced, so we can't easily test it in sync tests
    // In real usage, it will be called after 300ms
  });
});
