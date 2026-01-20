# Frontend Layer 3 Task 3: 实现 OptimizationResult 组件

## 任务元数据

- **任务 ID**: `frontend-v2-layer3-task3`
- **任务名称**: 实现 OptimizationResult 组件
- **所属层级**: Layer 3 - 核心组件
- **预计工时**: 3 小时
- **依赖任务**: F-L1-T1 (Zustand Store)
- **可并行任务**: F-L3-T1 (AIOutputArea), F-L3-T2 (IntentReportModal)

---

## 任务目标

实现优化结果展示组件,显示 NG 原因、参数变更建议,并允许用户应用优化。

**核心功能**:
- 显示 NG 原因
- 显示参数变更对比
- 一键应用优化
- 显示置信度

---

## 实现文件

**文件路径**: `frontend/src/components/OptimizationResult.tsx`

---

## 核心实现

```typescript
// frontend/src/components/OptimizationResult.tsx
import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { OptimizationResult } from '../types/workspace';

interface OptimizationResultProps {
  workspaceId: string;
  result: OptimizationResult;
}

export const OptimizationResult: React.FC<OptimizationResultProps> = ({
  workspaceId,
  result
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const { applyOptimization } = useWorkspaceStore();

  const handleApply = () => {
    console.log('[OptimizationResult] Applying optimization', result.optimized_params);

    setIsApplying(true);

    // 应用优化参数到表单
    applyOptimization(workspaceId, result.optimized_params);

    setTimeout(() => {
      setIsApplying(false);
    }, 1000);
  };

  return (
    <div className="optimization-result bg-white rounded-lg border p-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 AI 优化建议</h3>

      {/* NG 原因 */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-red-600 mb-2">❌ 当前问题</h4>
        <ul className="space-y-1">
          {result.ng_reasons.map((reason, idx) => (
            <li key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-red-300">
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* 参数变更 */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-blue-600 mb-2">🔧 建议调整</h4>
        <div className="space-y-2">
          {result.changes.map((change, idx) => (
            <div key={idx} className="bg-gray-50 p-3 rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {change.field}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-600">{String(change.old_value)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600">{String(change.new_value)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-600">{change.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 置信度 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">AI 置信度</span>
          <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* 应用按钮 */}
      <button
        onClick={handleApply}
        disabled={isApplying}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
      >
        {isApplying ? '应用中...' : '应用优化建议'}
      </button>
    </div>
  );
};
```

---

## 验收标准

- [ ] 正确显示 NG 原因
- [ ] 正确显示参数变更对比
- [ ] 应用按钮正常工作
- [ ] 调用 store.applyOptimization
- [ ] UI 样式符合设计
- [ ] 单元测试通过

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md`
