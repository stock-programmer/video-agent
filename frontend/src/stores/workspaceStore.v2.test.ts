/**
 * Zustand Store v2.0 Tests
 * Tests for optimization workflow state management
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import type {
  ProgressMessage,
  IntentReport,
  VideoAnalysis,
  OptimizationResult,
  Workspace
} from '../types/workspace';

describe('Workspace Store v2.0', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useWorkspaceStore.setState({
      optimizationStates: {},
      workspaces: []
    });
  });

  describe('startOptimization', () => {
    test('should initialize optimization state', () => {
      const store = useWorkspaceStore.getState();

      store.startOptimization('test-id');

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state).toBeDefined();
      expect(state.isActive).toBe(true);
      expect(state.currentStep).toBe('intent');
      expect(state.intentReport).toBeNull();
      expect(state.videoAnalysis).toBeNull();
      expect(state.finalResult).toBeNull();
      expect(state.progressMessages).toHaveLength(0);
      expect(state.error).toBeNull();
    });

    test('should allow multiple workspaces to have optimization states', () => {
      const store = useWorkspaceStore.getState();

      store.startOptimization('workspace-1');
      store.startOptimization('workspace-2');

      const states = useWorkspaceStore.getState().optimizationStates;
      expect(states['workspace-1']).toBeDefined();
      expect(states['workspace-2']).toBeDefined();
    });
  });

  describe('addProgressMessage', () => {
    test('should add progress message to existing optimization state', () => {
      const store = useWorkspaceStore.getState();

      const message: ProgressMessage = {
        type: 'agent_start',
        agent: 'intent_analysis',
        message: 'Starting intent analysis...',
        timestamp: new Date().toISOString()
      };

      store.startOptimization('test-id');
      store.addProgressMessage('test-id', message);

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.progressMessages).toHaveLength(1);
      expect(state.progressMessages[0].type).toBe('agent_start');
      expect(state.progressMessages[0].message).toBe('Starting intent analysis...');
    });

    test('should handle multiple progress messages in order', () => {
      const store = useWorkspaceStore.getState();

      store.startOptimization('test-id');
      store.addProgressMessage('test-id', {
        type: 'agent_start',
        message: 'Message 1',
        timestamp: new Date().toISOString()
      });
      store.addProgressMessage('test-id', {
        type: 'agent_progress',
        message: 'Message 2',
        timestamp: new Date().toISOString()
      });
      store.addProgressMessage('test-id', {
        type: 'agent_complete',
        message: 'Message 3',
        timestamp: new Date().toISOString()
      });

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.progressMessages).toHaveLength(3);
      expect(state.progressMessages[0].message).toBe('Message 1');
      expect(state.progressMessages[1].message).toBe('Message 2');
      expect(state.progressMessages[2].message).toBe('Message 3');
    });

    test('should not add message if optimization state does not exist', () => {
      const store = useWorkspaceStore.getState();

      store.addProgressMessage('nonexistent-id', {
        type: 'agent_start',
        message: 'Should not be added',
        timestamp: new Date().toISOString()
      });

      const states = useWorkspaceStore.getState().optimizationStates;
      expect(states['nonexistent-id']).toBeUndefined();
    });
  });

  describe('setIntentReport', () => {
    test('should set intent report and update step to waiting', () => {
      const store = useWorkspaceStore.getState();

      const report: IntentReport = {
        user_intent: {
          scene_description: 'A beautiful sunset',
          desired_mood: 'peaceful',
          key_elements: ['sun', 'sky', 'clouds'],
          motion_expectation: 'slow pan'
        },
        parameter_analysis: {
          aligned: ['lighting'],
          potential_issues: ['motion_intensity too high']
        },
        confidence: 0.85
      };

      store.startOptimization('test-id');
      store.setIntentReport('test-id', report);

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.intentReport).toEqual(report);
      expect(state.currentStep).toBe('waiting');
    });
  });

  describe('setVideoAnalysis', () => {
    test('should set video analysis and update step to decision', () => {
      const store = useWorkspaceStore.getState();

      const analysis: VideoAnalysis = {
        content_match_score: 0.75,
        issues: [
          {
            category: 'motion',
            description: 'Motion is too fast',
            severity: 'high',
            affected_parameter: 'motion_intensity'
          }
        ],
        technical_quality: {
          resolution: '1080p',
          clarity_score: 0.9,
          fluency_score: 0.85
        },
        strengths: ['Good lighting', 'Clear composition'],
        overall_assessment: 'Good quality but motion needs adjustment'
      };

      store.startOptimization('test-id');
      store.setVideoAnalysis('test-id', analysis);

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.videoAnalysis).toEqual(analysis);
      expect(state.currentStep).toBe('decision');
    });
  });

  describe('setFinalResult', () => {
    test('should set final result and update step to complete', () => {
      const store = useWorkspaceStore.getState();

      const resultData: OptimizationResult = {
        ng_reasons: ['Motion intensity too high for desired peaceful mood'],
        optimized_params: {
          motion_intensity: 2
        },
        changes: [
          {
            field: 'motion_intensity',
            old_value: 4,
            new_value: 2,
            reason: 'Reduce motion for peaceful mood'
          }
        ],
        confidence: 0.88
      };

      store.startOptimization('test-id');
      store.setFinalResult('test-id', resultData);

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.finalResult).toEqual(resultData);
      expect(state.currentStep).toBe('complete');
    });
  });

  describe('applyOptimization', () => {
    test('should update workspace form data with optimized params', () => {
      const store = useWorkspaceStore.getState();

      // Setup test workspace
      const testWorkspace: Workspace = {
        _id: 'test-id',
        order_index: 0,
        form_data: {
          motion_intensity: 4,
          camera_movement: 'pan',
          shot_type: 'wide'
        }
      };

      useWorkspaceStore.setState({
        workspaces: [testWorkspace]
      });

      store.applyOptimization('test-id', {
        motion_intensity: 2,
        lighting: 'soft'
      });

      const workspace = useWorkspaceStore.getState().workspaces[0];
      expect(workspace.form_data.motion_intensity).toBe(2);
      expect(workspace.form_data.lighting).toBe('soft');
      expect(workspace.form_data.camera_movement).toBe('pan'); // unchanged
    });

    test('should not update if workspace not found', () => {
      const store = useWorkspaceStore.getState();

      store.applyOptimization('nonexistent-id', {
        motion_intensity: 2
      });

      const workspaces = useWorkspaceStore.getState().workspaces;
      expect(workspaces).toHaveLength(0);
    });
  });

  describe('setOptimizationError', () => {
    test('should set error and deactivate optimization', () => {
      const store = useWorkspaceStore.getState();

      store.startOptimization('test-id');
      store.setOptimizationError('test-id', 'API connection failed');

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.error).toBe('API connection failed');
      expect(state.isActive).toBe(false);
    });
  });

  describe('resetOptimization', () => {
    test('should remove optimization state for workspace', () => {
      const store = useWorkspaceStore.getState();

      store.startOptimization('test-id');
      store.resetOptimization('test-id');

      const states = useWorkspaceStore.getState().optimizationStates;
      expect(states['test-id']).toBeUndefined();
    });
  });

  describe('setOptimizationComplete', () => {
    test('should deactivate optimization and set step to complete', () => {
      const store = useWorkspaceStore.getState();

      store.startOptimization('test-id');
      store.setOptimizationComplete('test-id');

      const state = useWorkspaceStore.getState().optimizationStates['test-id'];
      expect(state.isActive).toBe(false);
      expect(state.currentStep).toBe('complete');
    });
  });

  describe('Full optimization workflow', () => {
    test('should handle complete optimization flow', () => {
      const store = useWorkspaceStore.getState();

      // Setup workspace
      const testWorkspace: Workspace = {
        _id: 'workflow-test',
        order_index: 0,
        form_data: {
          motion_intensity: 5,
          camera_movement: 'fast pan'
        },
        video: {
          status: 'completed',
          url: 'http://example.com/video.mp4'
        }
      };

      useWorkspaceStore.setState({
        workspaces: [testWorkspace]
      });

      // Step 1: Start optimization
      store.startOptimization('workflow-test');

      let state = useWorkspaceStore.getState().optimizationStates['workflow-test'];
      expect(state.isActive).toBe(true);
      expect(state.currentStep).toBe('intent');

      // Step 2: Add progress messages
      store.addProgressMessage('workflow-test', {
        type: 'agent_start',
        agent: 'intent_analysis',
        message: 'Analyzing user intent...',
        timestamp: new Date().toISOString()
      });

      state = useWorkspaceStore.getState().optimizationStates['workflow-test'];
      expect(state.progressMessages).toHaveLength(1);

      // Step 3: Set intent report
      store.setIntentReport('workflow-test', {
        user_intent: {
          scene_description: 'Calm nature scene',
          desired_mood: 'peaceful',
          key_elements: ['nature', 'calm'],
          motion_expectation: 'slow movement'
        },
        confidence: 0.9
      });

      state = useWorkspaceStore.getState().optimizationStates['workflow-test'];
      expect(state.currentStep).toBe('waiting');

      // Step 4: Set video analysis
      store.setVideoAnalysis('workflow-test', {
        content_match_score: 0.6,
        issues: [{
          category: 'motion',
          description: 'Too fast for peaceful mood',
          severity: 'high',
          affected_parameter: 'motion_intensity'
        }],
        technical_quality: {
          resolution: '1080p',
          clarity_score: 0.9,
          fluency_score: 0.85
        },
        overall_assessment: 'Needs motion adjustment'
      });

      state = useWorkspaceStore.getState().optimizationStates['workflow-test'];
      expect(state.currentStep).toBe('decision');

      // Step 5: Set final result
      store.setFinalResult('workflow-test', {
        ng_reasons: ['Motion too fast for desired peaceful mood'],
        optimized_params: { motion_intensity: 2 },
        changes: [{
          field: 'motion_intensity',
          old_value: 5,
          new_value: 2,
          reason: 'Match peaceful mood'
        }],
        confidence: 0.85
      });

      state = useWorkspaceStore.getState().optimizationStates['workflow-test'];
      expect(state.currentStep).toBe('complete');

      // Step 6: Apply optimization
      store.applyOptimization('workflow-test', { motion_intensity: 2 });

      const updatedWorkspace = useWorkspaceStore.getState().workspaces[0];
      expect(updatedWorkspace.form_data.motion_intensity).toBe(2);

      // Step 7: Mark complete
      store.setOptimizationComplete('workflow-test');

      state = useWorkspaceStore.getState().optimizationStates['workflow-test'];
      expect(state.isActive).toBe(false);
    });
  });
});
