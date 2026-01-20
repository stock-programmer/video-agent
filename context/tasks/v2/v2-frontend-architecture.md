# v2.0 前端技术架构设计

## 文档概述

本文档描述 v2.0 "一键优化提示词" 功能的前端实现架构。

---

## 设计原则

1. **最小化侵入**: 不修改 v1.x 现有组件逻辑
2. **渐进增强**: 功能可选,不影响基础流程
3. **状态隔离**: 优化流程状态独立管理
4. **用户体验优先**: 流式输出 + 自动滚动 + 清晰反馈

---

## 组件架构

### 新增组件

```
frontend/src/components/
├── v2/
│   ├── AIOutputArea.tsx          # AI 输出区容器组件
│   ├── OptimizeButton.tsx        # 一键优化按钮
│   ├── IntentReportModal.tsx     # 意图确认弹窗 (Human-in-the-Loop)
│   ├── OptimizationResult.tsx    # 优化结果展示 (前后对比)
│   └── AgentProgress.tsx         # Agent 工作进度展示
```

### 修改的现有组件

**`Workspace.tsx`** (工作空间主组件):
```tsx
// 在视频播放器下方添加优化按钮
<VideoPlayer video={workspace.video} />

{/* v2.0: 一键优化按钮 */}
{workspace.video?.status === 'completed' && (
  <OptimizeButton workspaceId={workspace._id} />
)}

{/* v2.0: AI 输出区 */}
<AIOutputArea workspaceId={workspace._id} />

{/* 原有 AI 协作助手 */}
<AICollaboration workspaceId={workspace._id} />
```

---

## 核心组件设计

### 1. OptimizeButton.tsx

**功能**: 触发优化流程入口

**Props**:
```typescript
interface OptimizeButtonProps {
  workspaceId: string;
}
```

**实现**:
```tsx
import React from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { wsClient } from '@/services/websocket';

export const OptimizeButton: React.FC<OptimizeButtonProps> = ({ workspaceId }) => {
  const { startOptimization } = useWorkspaceStore();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      // 1. 触发后端 API
      await fetch(`/api/optimize-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId })
      });

      // 2. 启动前端优化状态
      startOptimization(workspaceId);

      // 3. 滚动到 AI 输出区
      document.getElementById('ai-output-area')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    } catch (error) {
      console.error('Optimization failed:', error);
      alert('优化失败,请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg
                 hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
    >
      {isLoading ? '正在启动优化...' : '🎯 一键优化提示词'}
    </button>
  );
};
```

**UI 位置**:
- 位于工作空间视频下载按钮的下方
- 仅在视频生成完成后显示 (`video.status === 'completed'`)

---

### 2. AIOutputArea.tsx

**功能**: 流式显示 AI 工作进度和结果

**Props**:
```typescript
interface AIOutputAreaProps {
  workspaceId: string;
}
```

**State 管理**:
```typescript
interface OptimizationState {
  isActive: boolean;              // 是否正在优化
  currentStep: string;            // 当前步骤: 'intent' | 'waiting' | 'video' | 'decision'
  intentReport: IntentReport | null;
  videoAnalysis: VideoAnalysis | null;
  finalResult: OptimizationResult | null;
  progressMessages: ProgressMessage[];  // 流式消息列表
}
```

**实现**:
```tsx
import React, { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { wsClient } from '@/services/websocket';
import { AgentProgress } from './AgentProgress';
import { IntentReportModal } from './IntentReportModal';
import { OptimizationResult } from './OptimizationResult';

export const AIOutputArea: React.FC<AIOutputAreaProps> = ({ workspaceId }) => {
  const { optimizationState, addProgressMessage } = useWorkspaceStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // WebSocket 消息监听
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      // 只处理当前工作空间的优化消息
      if (data.workspace_id !== workspaceId) return;

      switch (data.type) {
        case 'agent_start':
        case 'agent_progress':
        case 'agent_complete':
          addProgressMessage(workspaceId, data);
          break;

        case 'intent_report':
          useWorkspaceStore.getState().setIntentReport(workspaceId, data.data);
          break;

        case 'video_analysis':
          useWorkspaceStore.getState().setVideoAnalysis(workspaceId, data.data);
          break;

        case 'optimization_result':
          useWorkspaceStore.getState().setFinalResult(workspaceId, data.data);
          // 自动应用优化结果到表单
          useWorkspaceStore.getState().applyOptimization(workspaceId, data.data.optimized_params);
          break;
      }
    };

    wsClient.addEventListener('message', handleMessage);
    return () => wsClient.removeEventListener('message', handleMessage);
  }, [workspaceId]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [optimizationState?.progressMessages]);

  if (!optimizationState?.isActive) {
    return null;  // 未激活时不显示
  }

  return (
    <div
      id="ai-output-area"
      className="mt-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50
                 max-h-96 overflow-y-auto"
      ref={scrollRef}
    >
      <h3 className="text-lg font-bold mb-2 text-blue-900">
        🤖 AI 工作进度
      </h3>

      {/* 流式进度消息 */}
      <div className="space-y-2">
        {optimizationState.progressMessages.map((msg, idx) => (
          <AgentProgress key={idx} message={msg} />
        ))}
      </div>

      {/* 意图确认弹窗 */}
      {optimizationState.intentReport && (
        <IntentReportModal
          workspaceId={workspaceId}
          report={optimizationState.intentReport}
        />
      )}

      {/* 最终优化结果 */}
      {optimizationState.finalResult && (
        <OptimizationResult result={optimizationState.finalResult} />
      )}
    </div>
  );
};
```

**布局特性**:
- 位于工作空间右上方 (AI 协作助手上方)
- 初始隐藏,点击优化按钮后显示并自动滚动到视图
- 最大高度 `max-h-96` (约 384px),超出后垂直滚动
- 蓝色边框区分于其他区域

---

### 3. AgentProgress.tsx

**功能**: 渲染单条 Agent 工作进度消息

**Props**:
```typescript
interface ProgressMessage {
  type: 'agent_start' | 'agent_progress' | 'agent_complete' | 'error';
  agent?: string;  // 'intent_analysis' | 'video_analysis' | 'master'
  message: string;
  timestamp: string;
}

interface AgentProgressProps {
  message: ProgressMessage;
}
```

**实现**:
```tsx
import React from 'react';

export const AgentProgress: React.FC<AgentProgressProps> = ({ message }) => {
  const getIcon = () => {
    switch (message.type) {
      case 'agent_start': return '🚀';
      case 'agent_progress': return '⚙️';
      case 'agent_complete': return '✅';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const getColor = () => {
    switch (message.type) {
      case 'agent_complete': return 'text-green-700';
      case 'error': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className={`text-sm ${getColor()} flex items-start gap-2`}>
      <span className="text-base">{getIcon()}</span>
      <div className="flex-1">
        <span className="font-mono text-xs text-gray-500">
          [{new Date(message.timestamp).toLocaleTimeString()}]
        </span>
        <span className="ml-2">{message.message}</span>
      </div>
    </div>
  );
};
```

**显示示例**:
```
🚀 [10:30:15] 意图分析 Agent 启动...
⚙️ [10:30:16] 正在分析用户输入参数...
⚙️ [10:30:18] 正在推断用户意图...
✅ [10:30:20] 意图分析完成
```

---

### 4. IntentReportModal.tsx

**功能**: Human-in-the-Loop 意图确认弹窗

**Props**:
```typescript
interface IntentReport {
  user_intent: {
    scene_description: string;
    desired_mood: string;
    key_elements: string[];
    motion_expectation: string;
  };
  confidence: number;
}

interface IntentReportModalProps {
  workspaceId: string;
  report: IntentReport;
}
```

**实现**:
```tsx
import React, { useState } from 'react';
import { wsClient } from '@/services/websocket';

export const IntentReportModal: React.FC<IntentReportModalProps> = ({
  workspaceId,
  report
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedIntent, setEditedIntent] = useState(report.user_intent);

  const handleConfirm = (confirmed: boolean) => {
    // 发送确认消息到后端
    wsClient.send(JSON.stringify({
      type: 'human_confirm',
      workspace_id: workspaceId,
      confirmed,
      corrections: isEditing ? editedIntent : null
    }));

    // 关闭弹窗
    // (实际会通过 Zustand store 管理状态)
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          📋 意图分析结果 - 请确认
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-1">场景描述</label>
            <p className="text-gray-700 bg-gray-50 p-2 rounded">
              {report.user_intent.scene_description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">期望氛围</label>
            <p className="text-gray-700 bg-gray-50 p-2 rounded">
              {report.user_intent.desired_mood}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">关键元素</label>
            <div className="flex flex-wrap gap-2">
              {report.user_intent.key_elements.map((elem, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {elem}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">运动预期</label>
            <p className="text-gray-700 bg-gray-50 p-2 rounded">
              {report.user_intent.motion_expectation}
            </p>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-semibold">置信度:</span> {(report.confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* 修正选项 */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEditing}
              onChange={(e) => setIsEditing(e.target.checked)}
            />
            <span className="text-sm">我想修正意图描述</span>
          </label>
        </div>

        {isEditing && (
          <div className="space-y-3 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <input
              type="text"
              value={editedIntent.scene_description}
              onChange={(e) => setEditedIntent({
                ...editedIntent,
                scene_description: e.target.value
              })}
              className="w-full p-2 border rounded"
              placeholder="场景描述"
            />
            {/* 其他字段类似... */}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleConfirm(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ❌ 意图不准确,重新分析
          </button>
          <button
            onClick={() => handleConfirm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ✅ 确认意图,继续分析
          </button>
        </div>
      </div>
    </div>
  );
};
```

**交互逻辑**:
1. 弹窗阻塞式显示 (全屏遮罩 `fixed inset-0`)
2. 用户可查看 AI 分析的意图
3. 可选择"确认"或"修正后确认"或"拒绝重新分析"
4. 点击按钮后发送 WebSocket 消息,后端 resume Agent 执行

---

### 5. OptimizationResult.tsx

**功能**: 展示优化前后参数对比和改进建议

**Props**:
```typescript
interface OptimizationResult {
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

interface OptimizationResultProps {
  result: OptimizationResult;
}
```

**实现**:
```tsx
import React from 'react';

export const OptimizationResult: React.FC<OptimizationResultProps> = ({ result }) => {
  return (
    <div className="mt-6 p-4 bg-white border-2 border-green-500 rounded-lg">
      <h3 className="text-lg font-bold text-green-900 mb-3">
        ✨ 优化完成!
      </h3>

      {/* NG 原因 */}
      <div className="mb-4">
        <h4 className="font-semibold text-red-700 mb-2">🔍 问题分析</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          {result.ng_reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* 参数变更对比 */}
      <div className="mb-4">
        <h4 className="font-semibold text-blue-700 mb-2">🔄 参数优化</h4>
        <div className="space-y-2">
          {result.changes.map((change, idx) => (
            <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
              <div className="font-semibold text-gray-900 mb-1">
                {getFieldLabel(change.field)}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-600 line-through">
                  {formatValue(change.old_value)}
                </span>
                <span>→</span>
                <span className="text-green-600 font-semibold">
                  {formatValue(change.new_value)}
                </span>
              </div>
              <div className="text-gray-600 text-xs">
                💡 {change.reason}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 置信度 */}
      <div className="text-sm text-gray-600 mb-4">
        <span className="font-semibold">优化置信度:</span> {(result.confidence * 100).toFixed(0)}%
      </div>

      {/* 提示信息 */}
      <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
        ℹ️ 表单参数已自动更新,您可以直接点击"生成视频"按钮查看优化效果。
      </div>
    </div>
  );
};

// 辅助函数
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    'motion_intensity': '运动强度',
    'camera_movement': '运镜方式',
    'motion_prompt': '主体运动描述',
    'duration': '视频时长',
    'shot_type': '景别',
    'lighting': '光线',
  };
  return labels[field] || field;
}

function formatValue(value: any): string {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
```

**显示示例**:
```
✨ 优化完成!

🔍 问题分析
• 运动强度设置为 3 (中等),但用户意图是缓慢散步,实际生成视频过快
• 推进运镜 (push_in) 不适合悠闲场景,建议使用静止或跟随

🔄 参数优化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
运动强度
3 → 2
💡 降低运动强度以匹配'缓慢散步'意图
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
运镜方式
push_in → follow
💡 跟随运镜更适合展现悠闲步行场景
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

优化置信度: 82%

ℹ️ 表单参数已自动更新,您可以直接点击"生成视频"按钮查看优化效果。
```

---

## 状态管理 (Zustand)

### 扩展 workspaceStore.ts

**新增 State**:
```typescript
interface WorkspaceState {
  // ... 现有字段 ...

  // v2.0: 优化状态
  optimizationStates: Record<string, OptimizationState>;  // key: workspace_id
}

interface OptimizationState {
  isActive: boolean;
  currentStep: 'intent' | 'waiting' | 'video' | 'decision' | 'complete';
  intentReport: IntentReport | null;
  videoAnalysis: VideoAnalysis | null;
  finalResult: OptimizationResult | null;
  progressMessages: ProgressMessage[];
  error: string | null;
}
```

**新增 Actions**:
```typescript
interface WorkspaceActions {
  // ... 现有方法 ...

  // v2.0: 优化流程管理
  startOptimization: (workspaceId: string) => void;
  addProgressMessage: (workspaceId: string, message: ProgressMessage) => void;
  setIntentReport: (workspaceId: string, report: IntentReport) => void;
  setVideoAnalysis: (workspaceId: string, analysis: VideoAnalysis) => void;
  setFinalResult: (workspaceId: string, result: OptimizationResult) => void;
  applyOptimization: (workspaceId: string, optimizedParams: Partial<VideoFormData>) => void;
  resetOptimization: (workspaceId: string) => void;
}
```

**实现示例**:
```typescript
export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>((set, get) => ({
  // ... 现有状态 ...
  optimizationStates: {},

  // 启动优化流程
  startOptimization: (workspaceId) => {
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

  // 添加进度消息
  addProgressMessage: (workspaceId, message) => {
    set((state) => {
      const optState = state.optimizationStates[workspaceId];
      if (!optState) return state;

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

  // 应用优化参数到表单
  applyOptimization: (workspaceId, optimizedParams) => {
    set((state) => {
      const workspace = state.workspaces.find(w => w._id === workspaceId);
      if (!workspace) return state;

      const updatedWorkspaces = state.workspaces.map(w =>
        w._id === workspaceId
          ? { ...w, form_data: { ...w.form_data, ...optimizedParams } }
          : w
      );

      // 同步发送 WebSocket 更新
      wsClient.send(JSON.stringify({
        type: 'workspace.update',
        workspace_id: workspaceId,
        updates: { form_data: optimizedParams }
      }));

      return { workspaces: updatedWorkspaces };
    });
  },

  // ... 其他方法类似 ...
}));
```

---

## WebSocket 集成

### 新增消息类型

**从后端接收** (Frontend Listener):
```typescript
// 1. Agent 启动
{ type: 'agent_start', workspace_id: string, agent: string, timestamp: string }

// 2. Agent 工作进度
{ type: 'agent_progress', workspace_id: string, agent: string, message: string, timestamp: string }

// 3. Agent 完成
{ type: 'agent_complete', workspace_id: string, agent: string, timestamp: string }

// 4. 意图报告
{ type: 'intent_report', workspace_id: string, data: IntentReport }

// 5. 视频分析结果
{ type: 'video_analysis', workspace_id: string, data: VideoAnalysis }

// 6. 最终优化结果
{ type: 'optimization_result', workspace_id: string, data: OptimizationResult }

// 7. 错误
{ type: 'optimization_error', workspace_id: string, error: string }
```

**发送到后端** (Frontend Sender):
```typescript
// 1. 人工确认意图
{ type: 'human_confirm', workspace_id: string, confirmed: boolean, corrections?: IntentReport }
```

### websocket.ts 扩展

```typescript
// frontend/src/services/websocket.ts

class WebSocketClient {
  // ... 现有代码 ...

  // v2.0: 发送人工确认
  sendHumanConfirmation(workspaceId: string, confirmed: boolean, corrections?: any) {
    this.send(JSON.stringify({
      type: 'human_confirm',
      workspace_id: workspaceId,
      confirmed,
      corrections
    }));
  }
}

export const wsClient = new WebSocketClient();
```

---

## 样式设计 (Tailwind CSS)

### AIOutputArea 样式

```css
/* 使用 Tailwind 类 */
.ai-output-area {
  @apply mt-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50;
  @apply max-h-96 overflow-y-auto;
  @apply transition-all duration-300;
}

/* 滚动条美化 */
.ai-output-area::-webkit-scrollbar {
  width: 8px;
}

.ai-output-area::-webkit-scrollbar-track {
  @apply bg-blue-100 rounded;
}

.ai-output-area::-webkit-scrollbar-thumb {
  @apply bg-blue-400 rounded hover:bg-blue-500;
}
```

### 动画效果

**进度消息淡入**:
```tsx
// AgentProgress.tsx
<div className="animate-fade-in">
  {/* 消息内容 */}
</div>

// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out'
      }
    }
  }
}
```

---

## 错误处理

### 前端错误场景

1. **优化 API 调用失败**
   - 显示 Toast 通知
   - 不启动 AIOutputArea

2. **WebSocket 断开连接**
   - 显示重连提示
   - 自动重连机制 (已有)

3. **Agent 执行超时**
   - 后端发送 `optimization_error` 消息
   - 前端显示错误信息并重置状态

4. **用户拒绝意图确认**
   - 后端重新执行意图分析
   - 前端清空进度,显示"重新分析中..."

### 错误展示组件

```tsx
// AIOutputArea.tsx 内部
{optimizationState.error && (
  <div className="p-3 bg-red-50 border border-red-300 rounded text-red-800 text-sm">
    ❌ {optimizationState.error}
    <button
      onClick={() => resetOptimization(workspaceId)}
      className="ml-2 underline"
    >
      关闭
    </button>
  </div>
)}
```

---

## 测试策略

### 单元测试

**OptimizeButton.test.tsx**:
- 测试点击触发 API 调用
- 测试加载状态切换
- 测试滚动到 AIOutputArea

**AIOutputArea.test.tsx**:
- 测试 WebSocket 消息处理
- 测试进度消息渲染
- 测试意图确认弹窗显示

**IntentReportModal.test.tsx**:
- 测试用户确认/拒绝操作
- 测试修正意图输入
- 测试 WebSocket 消息发送

### 集成测试

**完整优化流程测试**:
```typescript
describe('Prompt Optimization Flow', () => {
  it('should complete full optimization workflow', async () => {
    // 1. 点击优化按钮
    // 2. 模拟 WebSocket 消息序列
    // 3. 用户确认意图
    // 4. 接收最终结果
    // 5. 验证表单更新
  });
});
```

---

## 性能优化

1. **虚拟滚动**: 如果进度消息超过 100 条,使用 `react-window` 虚拟滚动
2. **WebSocket 消息节流**: 避免高频消息导致组件频繁重渲染
3. **懒加载弹窗**: `IntentReportModal` 仅在需要时渲染
4. **Memoization**: 使用 `React.memo` 优化 `AgentProgress` 组件

---

## 向后兼容性

- 所有 v2.0 组件为新增,不修改 v1.x 组件
- Zustand store 新增字段,不影响现有字段
- WebSocket 新增消息类型,不影响现有消息处理

---

## 下一步

阅读后端架构文档: `v2-backend-architecture.md`
