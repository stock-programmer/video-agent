# Frontend Layer 3 Task 2: 实现 IntentReportModal 组件

## 任务元数据

- **任务 ID**: `frontend-v2-layer3-task2`
- **任务名称**: 实现 IntentReportModal 组件
- **所属层级**: Layer 3 - 核心组件
- **预计工时**: 4 小时
- **依赖任务**: F-L1-T1 (Zustand Store), F-L1-T2 (WebSocket Client)
- **可并行任务**: F-L3-T1 (AIOutputArea), F-L3-T3 (OptimizationResult)

---

## 任务目标

实现意图确认弹窗,展示 Intent Analysis 结果并等待用户确认。

**核心功能**:
- 展示意图分析报告
- 确认/拒绝按钮
- 通过 WebSocket 发送 human_confirm 消息

---

## 实现文件

**文件路径**: `frontend/src/components/IntentReportModal.tsx`

---

## 核心实现

```typescript
// frontend/src/components/IntentReportModal.tsx
import React from 'react';
import { wsClient } from '../services/websocket';
import type { IntentReport } from '../types/workspace';

interface IntentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  intentReport: IntentReport;
}

export const IntentReportModal: React.FC<IntentReportModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  intentReport
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = (confirmed: boolean) => {
    setIsSubmitting(true);

    console.log('[IntentModal] Sending confirmation', { workspaceId, confirmed });

    // 通过 WebSocket 发送确认
    wsClient.sendHumanConfirmation(workspaceId, confirmed);

    // 延迟关闭 modal
    setTimeout(() => {
      onClose();
      setIsSubmitting(false);
    }, 500);
  };

  if (!isOpen) {
    return null;
  }

  const { user_intent, parameter_analysis, confidence } = intentReport;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">AI 意图分析结果</h2>

        {/* 场景描述 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700">场景描述</h3>
          <p className="text-gray-600">{user_intent.scene_description}</p>
        </div>

        {/* 期望情绪 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700">期望情绪</h3>
          <p className="text-gray-600">{user_intent.desired_mood}</p>
        </div>

        {/* 关键元素 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700">关键元素</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {user_intent.key_elements.map((element, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {element}
              </span>
            ))}
          </div>
        </div>

        {/* 运动预期 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700">运动预期</h3>
          <p className="text-gray-600">{user_intent.motion_expectation}</p>
        </div>

        {/* 参数分析 */}
        {parameter_analysis && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700">参数分析</h3>
            {parameter_analysis.aligned && parameter_analysis.aligned.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">✅ 匹配项:</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {parameter_analysis.aligned.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {parameter_analysis.potential_issues && parameter_analysis.potential_issues.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">⚠️ 潜在问题:</p>
                <ul className="list-disc list-inside text-sm text-yellow-600">
                  {parameter_analysis.potential_issues.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 置信度 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700">AI 置信度</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => handleConfirm(true)}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            确认,继续优化
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            拒绝,停止流程
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 验收标准

- [ ] 正确展示意图分析报告所有字段
- [ ] 确认/拒绝按钮正常工作
- [ ] 通过 WebSocket 发送 human_confirm 消息
- [ ] Modal 样式符合设计
- [ ] 单元测试通过

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md`
- `context/tasks/v2/v2-websocket-protocol.md`
