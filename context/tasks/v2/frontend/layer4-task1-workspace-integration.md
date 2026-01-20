# Frontend Layer 4 Task 1: 集成到 Workspace 组件

## 任务元数据

- **任务 ID**: `frontend-v2-layer4-task1`
- **任务名称**: 集成到 Workspace 组件
- **所属层级**: Layer 4 - 集成与样式
- **预计工时**: 2 小时
- **依赖任务**: F-L3-T1 (AIOutputArea), F-L3-T2 (IntentReportModal), F-L3-T3 (OptimizationResult)
- **可并行任务**: 无

---

## 任务目标

将所有 v2.0 组件集成到现有 Workspace 组件,确保向后兼容。

**核心功能**:
- 集成 OptimizeButton
- 集成 AIOutputArea
- 保持 v1.x UI 不变
- 新增 v2.0 UI 区域

---

## 实现文件

**文件路径**: `frontend/src/components/Workspace.tsx`

---

## 核心实现

```typescript
// frontend/src/components/Workspace.tsx (集成 v2.0)
import React from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { ImageUpload } from './ImageUpload';
import { VideoForm } from './VideoForm';
import { VideoPlayer } from './VideoPlayer';
import { AICollaboration } from './AICollaboration';

// v2.0 新增组件
import { OptimizeButton } from './OptimizeButton';
import { AIOutputArea } from './AIOutputArea';

interface WorkspaceProps {
  workspaceId: string;
}

export const Workspace: React.FC<WorkspaceProps> = ({ workspaceId }) => {
  const { workspaces } = useWorkspaceStore();
  const workspace = workspaces.find(w => w._id === workspaceId);

  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  return (
    <div className="workspace border rounded-lg p-4 bg-white">
      {/* ========== v1.x 现有内容 (保持不变) ========== */}

      {/* 图片上传 */}
      <ImageUpload workspaceId={workspaceId} />

      {/* 视频生成表单 */}
      <VideoForm workspaceId={workspaceId} />

      {/* 视频播放器 */}
      {workspace.video?.url && (
        <VideoPlayer videoUrl={workspace.video.url} />
      )}

      {/* v1.x AI 协作 */}
      <AICollaboration workspaceId={workspaceId} />

      {/* ========== v2.0 新增内容 ========== */}

      {/* 视频完成后显示优化按钮 */}
      {workspace.video?.status === 'completed' && workspace.video?.url && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            AI 智能优化
          </h3>

          <OptimizeButton
            workspaceId={workspaceId}
            videoStatus={workspace.video.status}
            videoUrl={workspace.video.url}
          />

          <AIOutputArea workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
};
```

---

## 验收标准

- [ ] v2.0 组件正确集成
- [ ] v1.x 功能不受影响
- [ ] 视频完成后显示优化按钮
- [ ] AIOutputArea 正确显示
- [ ] UI 布局合理
- [ ] 集成测试通过

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md`
- `CLAUDE.md` - 向后兼容原则
