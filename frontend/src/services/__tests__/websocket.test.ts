/**
 * v2.0 WebSocket 客户端单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wsClient } from '../websocket';
import { useWorkspaceStore } from '../../stores/workspaceStore';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send(data: string) {
    // Mock send method
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Helper to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

describe('WebSocket Client v2.0', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // Mock WebSocket globally
    global.WebSocket = MockWebSocket as any;

    // Reset store
    useWorkspaceStore.setState({
      optimizationStates: {},
      workspaces: []
    });

    // Disconnect any existing connection
    wsClient.disconnect();

    // Clear all event handlers
    wsClient['handlers'].clear();
  });

  afterEach(() => {
    wsClient.disconnect();
    wsClient['handlers'].clear();
  });

  it('should connect to WebSocket server', async () => {
    wsClient.connect();

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(wsClient['isConnected']).toBe(true);
  });

  it('should handle agent_start message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Initialize optimization state
    useWorkspaceStore.getState().startOptimization('test-id');

    // Simulate server message
    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({
      type: 'agent_start',
      workspace_id: 'test-id',
      agent: 'intent_analysis',
      timestamp: new Date().toISOString()
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state).toBeDefined();
    expect(state.progressMessages.length).toBeGreaterThan(0);
    expect(state.progressMessages[0].type).toBe('agent_start');
    expect(state.progressMessages[0].agent).toBe('intent_analysis');
  });

  it('should handle agent_progress message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    useWorkspaceStore.getState().startOptimization('test-id');

    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({
      type: 'agent_progress',
      workspace_id: 'test-id',
      agent: 'intent_analysis',
      message: '正在分析用户输入...',
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.progressMessages.length).toBeGreaterThan(0);
    const lastMessage = state.progressMessages[state.progressMessages.length - 1];
    expect(lastMessage.type).toBe('agent_progress');
    expect(lastMessage.message).toBe('正在分析用户输入...');
  });

  it('should handle intent_report message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    useWorkspaceStore.getState().startOptimization('test-id');

    const intentReport = {
      user_intent: {
        scene_description: 'Test scene',
        desired_mood: 'calm',
        key_elements: ['person'],
        motion_expectation: 'slow'
      },
      confidence: 0.85
    };

    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({
      type: 'intent_report',
      workspace_id: 'test-id',
      data: intentReport,
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.intentReport).toEqual(intentReport);
    expect(state.currentStep).toBe('waiting');
  });

  it('should handle video_analysis message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    useWorkspaceStore.getState().startOptimization('test-id');

    const videoAnalysis = {
      content_match_score: 7.5,
      issues: [
        {
          category: 'motion_speed',
          description: 'Motion too fast',
          severity: 'high' as const,
          affected_parameter: 'motion_intensity'
        }
      ],
      technical_quality: {
        resolution: '1080p',
        clarity_score: 8.0,
        fluency_score: 7.5
      },
      overall_assessment: 'Good quality but motion issues'
    };

    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({
      type: 'video_analysis',
      workspace_id: 'test-id',
      data: videoAnalysis,
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.videoAnalysis).toEqual(videoAnalysis);
    expect(state.currentStep).toBe('decision');
  });

  it('should handle optimization_result message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Setup workspace
    useWorkspaceStore.setState({
      workspaces: [{
        _id: 'test-id',
        order_index: 0,
        form_data: {
          motion_intensity: 3,
          camera_movement: 'push_in'
        },
        video: {
          status: 'completed' as const,
          url: 'test.mp4'
        }
      }]
    });

    useWorkspaceStore.getState().startOptimization('test-id');

    const optimizationResult = {
      ng_reasons: ['Motion too fast'],
      optimized_params: {
        motion_intensity: 2,
        camera_movement: 'follow'
      },
      changes: [
        {
          field: 'motion_intensity',
          old_value: 3,
          new_value: 2,
          reason: 'Reduce motion speed'
        }
      ],
      confidence: 0.82
    };

    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({
      type: 'optimization_result',
      workspace_id: 'test-id',
      data: optimizationResult,
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.finalResult).toEqual(optimizationResult);
    expect(state.currentStep).toBe('complete');
    expect(state.isActive).toBe(false);

    // Check if optimization was applied to workspace
    const workspace = useWorkspaceStore.getState().workspaces.find(w => w._id === 'test-id');
    expect(workspace?.form_data.motion_intensity).toBe(2);
    expect(workspace?.form_data.camera_movement).toBe('follow');
  });

  it('should handle optimization_error message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    useWorkspaceStore.getState().startOptimization('test-id');

    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({
      type: 'optimization_error',
      workspace_id: 'test-id',
      error: 'Intent analysis failed',
      phase: 'intent_analysis',
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const state = useWorkspaceStore.getState().optimizationStates['test-id'];
    expect(state.error).toBe('Intent analysis failed');
    expect(state.isActive).toBe(false);
  });

  it('should send human_confirm message', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    const sendSpy = vi.spyOn(wsClient['ws'] as any, 'send');

    wsClient.sendHumanConfirmation('test-id', true);

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'human_confirm',
        workspace_id: 'test-id',
        confirmed: true
      })
    );
  });

  it('should send human_confirm with corrections', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    const sendSpy = vi.spyOn(wsClient['ws'] as any, 'send');

    wsClient.sendHumanConfirmation('test-id', true, {
      user_intent: {
        desired_mood: 'happy'
      }
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'human_confirm',
        workspace_id: 'test-id',
        confirmed: true,
        corrections: {
          user_intent: {
            desired_mood: 'happy'
          }
        }
      })
    );
  });

  it('should handle connection close and attempt reconnection', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(wsClient['isConnected']).toBe(true);

    // Simulate connection close
    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.close();

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(wsClient['isConnected']).toBe(false);
    expect(wsClient['reconnectAttempts']).toBeGreaterThan(0);
  });

  it('should support v1.x event handlers (backward compatibility)', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    const handler = vi.fn();
    wsClient.on('test_event', handler);

    const ws = wsClient['ws'] as unknown as MockWebSocket;
    ws.simulateMessage({ type: 'test_event', data: 'test' });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(handler).toHaveBeenCalled();
  });

  it('should remove event handlers', async () => {
    wsClient.connect();
    await new Promise(resolve => setTimeout(resolve, 50));

    const handler = vi.fn();
    wsClient.on('test_event', handler);

    // Verify handler was added
    let handlers = wsClient['handlers'].get('test_event');
    expect(handlers?.length || 0).toBe(1);

    // Remove handler
    wsClient.off('test_event', handler);

    // Verify handler was removed
    handlers = wsClient['handlers'].get('test_event');
    expect(handlers?.length || 0).toBe(0);
  });
});
