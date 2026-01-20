# Frontend Layer 1 Task 1: 扩展 Zustand Store

## 任务元数据

- **任务 ID**: `frontend-v2-layer1-task1`
- **任务名称**: 扩展 Zustand Store
- **所属层级**: Layer 1 - 状态管理
- **预计工时**: 3 小时
- **依赖任务**: 无 (Layer 1 起始任务)
- **可并行任务**: `layer1-task2` (WebSocket Client)

---

## 任务目标

扩展现有 `workspaceStore.ts`,添加 v2.0 优化流程所需的状态和 Actions。

**核心功能**:
- 管理优化状态 (`OptimizationState`)
- 处理进度消息
- 存储意图报告、视频分析、最终结果
- 应用优化参数到表单

---

## 实现文件

**文件路径**: `frontend/src/stores/workspaceStore.ts`

---

## 实现步骤

### Step 1: 扩展 TypeScript 类型定义

```typescript
// frontend/src/types/workspace.ts (新增类型)

/**
 * v2.0: 优化流程状态
 */
export interface OptimizationState {
  isActive: boolean;
  currentStep: 'intent' | 'waiting' | 'video' | 'decision' | 'complete';
  intentReport: IntentReport | null;
  videoAnalysis: VideoAnalysis | null;
  finalResult: OptimizationResult | null;
  progressMessages: ProgressMessage[];
  error: string | null;
}

/**
 * 意图报告
 */
export interface IntentReport {
  user_intent: {
    scene_description: string;
    desired_mood: string;
    key_elements: string[];
    motion_expectation: string;
    energy_level?: string;
  };
  parameter_analysis?: {
    aligned: string[];
    potential_issues: string[];
  };
  confidence: number;
}

/**
 * 视频分析结果
 */
export interface VideoAnalysis {
  content_match_score: number;
  issues: Array<{
    category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    affected_parameter?: string;
  }>;
  technical_quality: {
    resolution: string;
    clarity_score: number;
    fluency_score: number;
    artifacts?: string;
  };
  strengths?: string[];
  overall_assessment: string;
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  ng_reasons: string[];
  optimized_params: Partial<VideoFormData>;
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
    reason: string;
  }>;
  confidence: number;
}

/**
 * 进度消息
 */
export interface ProgressMessage {
  type: 'agent_start' | 'agent_progress' | 'agent_complete' | 'error' | 'human_loop';
  agent?: string;
  message: string;
  timestamp: string;
}
```

### Step 2: 扩展 Zustand Store State

```typescript
// frontend/src/stores/workspaceStore.ts

import { create } from 'zustand';
import type {
  Workspace,
  OptimizationState,
  IntentReport,
  VideoAnalysis,
  OptimizationResult,
  ProgressMessage
} from '../types/workspace';

interface WorkspaceState {
  // ========== v1.x 现有字段 ==========
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;

  // ========== v2.0 新增字段 ==========
  optimizationStates: Record<string, OptimizationState>;  // key: workspace_id

  // ... v1.x actions ...

  // ========== v2.0 新增 Actions ==========
  startOptimization: (workspaceId: string) => void;
  addProgressMessage: (workspaceId: string, message: ProgressMessage) => void;
  setIntentReport: (workspaceId: string, report: IntentReport) => void;
  setVideoAnalysis: (workspaceId: string, analysis: VideoAnalysis) => void;
  setFinalResult: (workspaceId: string, result: OptimizationResult) => void;
  applyOptimization: (workspaceId: string, optimizedParams: Partial<VideoFormData>) => void;
  setOptimizationError: (workspaceId: string, error: string) => void;
  resetOptimization: (workspaceId: string) => void;
  setOptimizationComplete: (workspaceId: string) => void;
}
```

### Step 3: 实现 v2.0 Actions

```typescript
export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // ========== v1.x 现有状态 ==========
  workspaces: [],
  isLoading: false,
  error: null,

  // ========== v2.0 新增状态 ==========
  optimizationStates: {},

  // ========== v1.x 现有 Actions (保持不变) ==========
  // ... fetchWorkspaces, createWorkspace, etc.

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
          ? { ...w, form_data: { ...w.form_data, ...optimizedParams } }
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
```

### Step 4: 编写单元测试

```typescript
// frontend/src/stores/__tests__/workspaceStore.v2.test.ts
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceStore } from '../workspaceStore';

describe('Workspace Store v2.0', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useWorkspaceStore.setState({
        optimizationStates: {}
      });
    });
  });

  it('should start optimization', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.startOptimization('test-id');
    });

    const state = result.current.optimizationStates['test-id'];
    expect(state).toBeDefined();
    expect(state.isActive).toBe(true);
    expect(state.currentStep).toBe('intent');
  });

  it('should add progress messages', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.startOptimization('test-id');
      result.current.addProgressMessage('test-id', {
        type: 'agent_start',
        message: 'Starting...',
        timestamp: new Date().toISOString()
      });
    });

    const state = result.current.optimizationStates['test-id'];
    expect(state.progressMessages).toHaveLength(1);
    expect(state.progressMessages[0].type).toBe('agent_start');
  });

  it('should apply optimization to workspace', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    // Setup test workspace
    act(() => {
      useWorkspaceStore.setState({
        workspaces: [{
          _id: 'test-id',
          form_data: { motion_intensity: 3 }
        } as any]
      });

      result.current.applyOptimization('test-id', { motion_intensity: 2 });
    });

    const workspace = result.current.workspaces[0];
    expect(workspace.form_data.motion_intensity).toBe(2);
  });
});
```

---

## 验收标准

- [ ] 所有 TypeScript 类型定义正确,无编译错误
- [ ] 所有 v2.0 Actions 实现完整
- [ ] Actions 有完整的 console.log 输出
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] Store 状态变更不影响 v1.x 功能

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md` - 状态管理部分
- `frontend/src/types/workspace.ts` - 现有类型定义
- `frontend/src/stores/workspaceStore.ts` - 现有 Store 实现
