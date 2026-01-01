# 前端任务 4.2 - Workspace组件
## 层级: 第4层
## 依赖: frontend-dev-plan-3.1-state-management.md
## 并行: frontend-dev-plan-4.1, 4.3-4.7

创建 src/components/Workspace.tsx:
```typescript
import type { Workspace as WorkspaceType } from '../types/workspace';
import { ImageUpload } from './ImageUpload';
import { VideoForm } from './VideoForm';
import { VideoPlayer } from './VideoPlayer';
import { AICollaboration } from './AICollaboration';

interface Props {
  workspace: WorkspaceType;
}

export function Workspace({ workspace }: Props) {
  return (
    <div className="min-w-[800px] border rounded-lg p-4 flex gap-4">
      <div className="flex-1 flex flex-col gap-4">
        <ImageUpload workspaceId={workspace._id} imageUrl={workspace.image_url} />
        <VideoForm workspaceId={workspace._id} formData={workspace.form_data} />
        <VideoPlayer video={workspace.video} />
      </div>
      <div className="w-[300px]">
        <AICollaboration workspaceId={workspace._id} />
      </div>
    </div>
  );
}
```

验收:
- [ ] 布局正确(左侧3区,右侧AI)

下一步: frontend-dev-plan-5.1
