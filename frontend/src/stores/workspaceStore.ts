import { create } from 'zustand';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import type {
  Workspace,
  VideoFormData,
  OptimizationState,
  IntentReport,
  VideoAnalysis,
  OptimizationResult,
  ProgressMessage,
  AnalysisStep,
  ThoughtMessage
} from '../types/workspace';
import { applyV1_1Defaults } from '../types/workspace';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface WorkspaceStore {
  // ========== v1.x 现有字段 ==========
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  updateWorkspaceLocal: (id: string, updates: Partial<Workspace>) => void; // Local-only update
  deleteWorkspace: (id: string) => void;

  // 新增：软删除、恢复、硬删除
  softDeleteWorkspace: (id: string) => void;
  restoreWorkspace: (id: string) => void;
  hardDeleteWorkspace: (id: string) => Promise<void>;

  fetchWorkspaces: () => Promise<void>;
  createWorkspace: () => Promise<void>;
  connectWebSocket: () => void;
  isWebSocketConnected: boolean;

  // v1.1: Update form data
  updateFormData: (id: string, formData: Partial<VideoFormData>) => void;
  updateFormDataDebounced: (id: string, formData: Partial<VideoFormData>) => void;

  // ========== v2.0 新增字段 ==========
  optimizationStates: Record<string, OptimizationState>;  // key: workspace_id

  // ========== v2.0 新增 Actions ==========
  startOptimization: (workspaceId: string) => void;
  addProgressMessage: (workspaceId: string, message: ProgressMessage) => void;
  setIntentReport: (workspaceId: string, report: IntentReport) => void;
  setVideoAnalysis: (workspaceId: string, analysis: VideoAnalysis) => void;
  setFinalResult: (workspaceId: string, result: OptimizationResult) => void;
  applyOptimization: (workspaceId: string, optimizedParams: Partial<VideoFormData>) => void;

  // v2.0.1: 新增流式分析步骤和思考过程
  addAnalysisStep: (workspaceId: string, step: AnalysisStep) => void;
  addThought: (workspaceId: string, thought: ThoughtMessage) => void;

  // v2.0.1: 从历史记录恢复优化状态
  restoreOptimizationHistory: (workspaceId: string) => void;

  setOptimizationError: (workspaceId: string, error: string) => void;
  resetOptimization: (workspaceId: string) => void;
  setOptimizationComplete: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  // ========== v1.x 现有状态 ==========
  workspaces: [],
  isWebSocketConnected: false,

  // ========== v2.0 新增状态 ==========
  optimizationStates: {},

  setWorkspaces: (workspaces) => {
    // v1.1: Apply defaults to old workspaces that don't have v1.1 fields
    const normalizedWorkspaces = workspaces.map(ws => ({
      ...ws,
      form_data: applyV1_1Defaults(ws.form_data)
    }));
    set({ workspaces: normalizedWorkspaces });
  },

  addWorkspace: (workspace) =>
    set(state => ({ workspaces: [...state.workspaces, workspace] })),

  // Local-only update (no WebSocket sync) - used when receiving data from server
  updateWorkspaceLocal: (id, updates) => {
    console.log('[WorkspaceStore] updateWorkspaceLocal (local-only):', { id, updates });
    set(state => ({
      workspaces: state.workspaces.map(w =>
        w._id === id ? { ...w, ...updates } : w
      )
    }));
  },

  // Update with WebSocket sync - used when user makes changes
  updateWorkspace: (id, updates) => {
    console.log('[WorkspaceStore] updateWorkspace (with sync):', { id, updates });

    // 更新本地状态
    set(state => ({
      workspaces: state.workspaces.map(w =>
        w._id === id ? { ...w, ...updates } : w
      )
    }));

    console.log('[WorkspaceStore] 本地状态已更新，准备发送 WebSocket 消息');

    // 通过 WebSocket 同步到后端
    wsClient.send({
      type: 'workspace.update',
      data: {
        workspace_id: id,
        updates
      }
    });

    console.log('[WorkspaceStore] WebSocket 消息已发送');
  },

  deleteWorkspace: (id) =>
    set(state => ({
      workspaces: state.workspaces.filter(w => w._id !== id)
    })),

  // 软删除：标记为已删除，保存原始位置
  softDeleteWorkspace: (id) => {
    const workspace = get().workspaces.find(w => w._id === id);
    if (!workspace) return;

    get().updateWorkspace(id, {
      deleted: {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        original_order_index: workspace.order_index
      }
    });
  },

  // 恢复：取消删除标记，恢复原始位置
  restoreWorkspace: (id) => {
    const workspace = get().workspaces.find(w => w._id === id);
    if (!workspace || !workspace.deleted) return;

    get().updateWorkspace(id, {
      order_index: workspace.deleted.original_order_index || workspace.order_index,
      deleted: {
        is_deleted: false,
        deleted_at: undefined,
        original_order_index: undefined
      }
    });
  },

  // 硬删除：永久删除工作空间
  hardDeleteWorkspace: async (id) => {
    try {
      await api.hardDeleteWorkspace(id);
      get().deleteWorkspace(id);
    } catch (error) {
      console.error('硬删除失败:', error);
      alert('删除失败，请重试');
    }
  },

  fetchWorkspaces: async () => {
    console.log('[Store] Fetching workspaces from API...');
    const workspaces = await api.getWorkspaces();
    console.log('[Store] Received workspaces:', workspaces.length);

    // v1.1: Apply defaults when fetching workspaces
    const normalizedWorkspaces = workspaces.map(ws => ({
      ...ws,
      form_data: applyV1_1Defaults(ws.form_data)
    }));
    set({ workspaces: normalizedWorkspaces });

    // v2.0.1: 恢复每个workspace的优化历史记录（如果存在）
    console.log('[Store] Checking for optimization history to restore...');
    normalizedWorkspaces.forEach(ws => {
      if (ws.optimization_history && ws.optimization_history.length > 0) {
        console.log(`[Store] Workspace ${ws._id} has optimization history:`, {
          historyCount: ws.optimization_history.length,
          latestTimestamp: ws.optimization_history[ws.optimization_history.length - 1].timestamp
        });
        get().restoreOptimizationHistory(ws._id);
      } else {
        console.log(`[Store] Workspace ${ws._id} has no optimization history`);
      }
    });
    console.log('[Store] Workspace restoration complete');
  },

  createWorkspace: async () => {
    wsClient.send({ type: 'workspace.create', data: {} });
  },

  // v1.1: Update form data with immediate local update
  updateFormData: (id, formDataUpdates) => {
    // Immediate local update (optimistic)
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws._id === id
          ? {
              ...ws,
              form_data: {
                ...ws.form_data,
                ...formDataUpdates
              }
            }
          : ws
      )
    }));
  },

  // v1.1: Debounced WebSocket sync (300ms delay)
  // This is initialized outside the store state to maintain the debounce instance
  updateFormDataDebounced: (() => {
    const debouncedSync = debounce((id: string, formDataUpdates: Partial<VideoFormData>) => {
      wsClient.send({
        type: 'workspace.update',
        data: {
          workspace_id: id,
          updates: {
            form_data: formDataUpdates
          }
        }
      });
    }, 300);

    return (id: string, formDataUpdates: Partial<VideoFormData>) => {
      // First, update local state immediately
      get().updateFormData(id, formDataUpdates);
      // Then, sync to backend with debounce
      debouncedSync(id, formDataUpdates);
    };
  })(),

  connectWebSocket: () => {
    // 防止重复连接和注册事件监听器
    if (get().isWebSocketConnected) {
      console.log('[WorkspaceStore] WebSocket 已连接，跳过重复连接');
      return;
    }

    wsClient.connect();

    wsClient.on('workspace.created', (msg) => {
      // v1.1: Apply defaults to newly created workspace
      const workspace = {
        ...msg.data,
        form_data: applyV1_1Defaults(msg.data.form_data)
      };
      get().addWorkspace(workspace);
    });

    wsClient.on('workspace.sync_confirm', (msg) => {
      console.log('同步确认:', msg.workspace_id);
      // v1.1: Apply defaults when receiving workspace from server
      // IMPORTANT: Use updateWorkspaceLocal to avoid infinite loop
      if (msg.data && msg.data._id) {
        const workspace = {
          ...msg.data,
          form_data: applyV1_1Defaults(msg.data.form_data)
        };
        get().updateWorkspaceLocal(workspace._id, workspace);
      }
    });

    wsClient.on('video.status_update', (msg) => {
      // Use updateWorkspaceLocal to avoid sending WebSocket message back
      get().updateWorkspaceLocal(msg.workspace_id, {
        video: {
          status: msg.status,
          url: msg.url,
          error: msg.error
        }
      });
    });

    set({ isWebSocketConnected: true });
  },

  // ========== v2.0 新增 Actions ==========

  /**
   * 启动优化流程
   */
  startOptimization: (workspaceId: string) => {
    console.log('[Store] Starting optimization for', workspaceId);

    set((state) => ({
      optimizationStates: {
        ...state.optimizationStates,
        [workspaceId]: {
          isActive: true,
          currentStep: 'intent',
          intentReport: null,
          videoAnalysis: null,
          finalResult: null,
          progressMessages: [],
          analysisSteps: [],        // v2.0.1: 初始化分析步骤列表
          thoughts: [],             // v2.0.1: 初始化思考过程列表
          error: null
        }
      }
    }));
  },

  /**
   * 添加进度消息
   */
  addProgressMessage: (workspaceId: string, message: ProgressMessage) => {
    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) {
        console.warn('[Store] No optimization state for', workspaceId);
        return state;
      }

      console.log('[Store] Adding progress message', message.type, message.message);

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            progressMessages: [...optState.progressMessages, message]
          }
        }
      };
    });
  },

  /**
   * 设置意图报告
   */
  setIntentReport: (workspaceId: string, report: IntentReport) => {
    console.log('[Store] Setting intent report for', workspaceId, 'confidence:', report.confidence);

    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            intentReport: report,
            currentStep: 'waiting' as const
          }
        }
      };
    });
  },

  /**
   * 设置视频分析结果
   */
  setVideoAnalysis: (workspaceId: string, analysis: VideoAnalysis) => {
    console.log('[Store] Setting video analysis for', workspaceId, 'score:', analysis.content_match_score);

    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            videoAnalysis: analysis,
            currentStep: 'decision' as const
          }
        }
      };
    });
  },

  /**
   * 设置最终优化结果
   */
  setFinalResult: (workspaceId: string, result: OptimizationResult) => {
    console.log('[Store] Setting final result for', workspaceId, 'changes:', result.changes.length);

    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            finalResult: result,
            currentStep: 'complete' as const
          }
        }
      };
    });
  },

  /**
   * 应用优化参数到工作空间表单
   */
  applyOptimization: (workspaceId: string, optimizedParams: Partial<VideoFormData>) => {
    console.log('[Store] Applying optimization to workspace', workspaceId, optimizedParams);

    set((state) => {
      const workspace = state.workspaces.find(w => w._id === workspaceId);
      if (!workspace) {
        console.warn('[Store] Workspace not found:', workspaceId);
        return state;
      }

      const updatedWorkspaces = state.workspaces.map(w =>
        w._id === workspaceId
          ? {
              ...w,
              form_data: { ...w.form_data, ...optimizedParams },
              // 设置时间戳标记，触发VideoForm更新
              optimization_applied_at: Date.now()
            }
          : w
      );

      // 同步发送 WebSocket 更新 (如果需要)
      // wsClient.send(JSON.stringify({
      //   type: 'workspace.update',
      //   workspace_id: workspaceId,
      //   updates: { form_data: optimizedParams }
      // }));

      return { workspaces: updatedWorkspaces };
    });
  },

  /**
   * v2.0.1: 添加分析步骤
   */
  addAnalysisStep: (workspaceId: string, step: AnalysisStep) => {
    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            analysisSteps: [...optState.analysisSteps, step]
          }
        }
      };
    });
  },

  /**
   * v2.0.1: 添加AI思考
   */
  addThought: (workspaceId: string, thought: ThoughtMessage) => {
    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            thoughts: [...optState.thoughts, thought]
          }
        }
      };
    });
  },

  /**
   * v2.0.1: 从历史记录恢复优化状态
   * 在页面刷新后，从 workspace.optimization_history 恢复最新的优化结果
   */
  restoreOptimizationHistory: (workspaceId: string) => {
    const workspace = get().workspaces.find(w => w._id === workspaceId);

    if (!workspace || !workspace.optimization_history || workspace.optimization_history.length === 0) {
      console.log('[Store] No optimization history to restore for', workspaceId);
      return;
    }

    // 获取最新的优化记录（数组最后一个元素）
    const latestHistory = workspace.optimization_history[workspace.optimization_history.length - 1];

    console.log('[Store] Restoring optimization history for', workspaceId, {
      timestamp: latestHistory.timestamp,
      hasAnalysisSteps: !!latestHistory.analysis_steps,
      hasThoughts: !!latestHistory.thoughts,
      stepsCount: latestHistory.analysis_steps?.length || 0,
      thoughtsCount: latestHistory.thoughts?.length || 0
    });

    // 恢复优化状态到 store
    set((state) => ({
      optimizationStates: {
        ...state.optimizationStates,
        [workspaceId]: {
          isActive: false,               // 历史记录已完成，不再active
          currentStep: 'complete',       // 标记为已完成
          intentReport: latestHistory.intent_report || null,
          videoAnalysis: latestHistory.video_analysis || null,
          finalResult: latestHistory.optimization_result || null,
          progressMessages: [],          // 历史记录不需要进度消息
          analysisSteps: latestHistory.analysis_steps || [],    // v2.0.1: 恢复分析步骤
          thoughts: latestHistory.thoughts || [],                // v2.0.1: 恢复思考过程
          error: null
        }
      }
    }));

    console.log('[Store] Optimization history restored successfully for', workspaceId);
  },

  /**
   * 设置优化错误
   */
  setOptimizationError: (workspaceId: string, error: string) => {
    console.error('[Store] Optimization error for', workspaceId, error);

    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            error,
            isActive: false
          }
        }
      };
    });
  },

  /**
   * 重置优化状态
   */
  resetOptimization: (workspaceId: string) => {
    console.log('[Store] Resetting optimization for', workspaceId);

    set((state) => {
      const { [workspaceId]: _, ...rest } = state.optimizationStates;
      return { optimizationStates: rest };
    });
  },

  /**
   * 标记优化完成
   */
  setOptimizationComplete: (workspaceId: string) => {
    console.log('[Store] Optimization complete for', workspaceId);

    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

      return {
        optimizationStates: {
          ...state.optimizationStates,
          [workspaceId]: {
            ...optState,
            isActive: false,
            currentStep: 'complete' as const
          }
        }
      };
    });
  }
}));
