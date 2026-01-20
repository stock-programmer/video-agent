# Frontend Layer 3 Task 1: 实现 AIOutputArea 组件

## 任务元数据

- **任务 ID**: `frontend-v2-layer3-task1`
- **任务名称**: 实现 AIOutputArea 组件
- **所属层级**: Layer 3 - 核心组件
- **预计工时**: 4 小时
- **依赖任务**: F-L1-T1 (Zustand Store), F-L1-T2 (WebSocket Client), F-L2-T2 (AgentProgress)
- **可并行任务**: F-L3-T2 (IntentReportModal), F-L3-T3 (OptimizationResult)

---

## 任务目标

实现 AI 输出区域组件,整合 AgentProgress 和 OptimizationResult,提供完整的优化流程 UI。

**核心功能**:
- 集成 AgentProgress 组件
- 显示优化结果
- 显示 Human-in-the-Loop 确认弹窗
- 根据优化状态显示不同内容

---

## 实现文件

**文件路径**: `frontend/src/components/AIOutputArea.tsx`

---

## 核心实现

```typescript
// frontend/src/components/AIOutputArea.tsx
import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { AgentProgress } from './AgentProgress';
import { IntentReportModal } from './IntentReportModal';
import { OptimizationResult } from './OptimizationResult';

interface AIOutputAreaProps {
  workspaceId: string;
}

export const AIOutputArea: React.FC<AIOutputAreaProps> = ({ workspaceId }) => {
  const { optimizationStates } = useWorkspaceStore();
  const optimizationState = optimizationStates[workspaceId];

  const [showIntentModal, setShowIntentModal] = useState(false);

  // 当收到 intent_report 时,自动显示 modal
  React.useEffect(() => {
    if (optimizationState?.intentReport && optimizationState.currentStep === 'waiting') {
      setShowIntentModal(true);
    }
  }, [optimizationState?.intentReport, optimizationState?.currentStep]);

  if (!optimizationState) {
    return null;
  }

  return (
    <div className="ai-output-area mt-4">
      {/* Agent 进度 */}
      <AgentProgress
        messages={optimizationState.progressMessages}
        isActive={optimizationState.isActive}
      />

      {/* 意图确认弹窗 */}
      {optimizationState.intentReport && (
        <IntentReportModal
          isOpen={showIntentModal}
          onClose={() => setShowIntentModal(false)}
          workspaceId={workspaceId}
          intentReport={optimizationState.intentReport}
        />
      )}

      {/* 优化结果 */}
      {optimizationState.finalResult && (
        <OptimizationResult
          workspaceId={workspaceId}
          result={optimizationState.finalResult}
        />
      )}

      {/* 错误提示 */}
      {optimizationState.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">错误: {optimizationState.error}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 验收标准

- [ ] 正确集成 AgentProgress 组件
- [ ] 自动显示 IntentReportModal
- [ ] 显示 OptimizationResult
- [ ] 显示错误信息
- [ ] UI 样式符合设计
- [ ] 单元测试通过

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md`
