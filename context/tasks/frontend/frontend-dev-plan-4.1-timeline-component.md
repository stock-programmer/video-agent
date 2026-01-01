# 前端任务 4.1 - Timeline组件
## 层级: 第4层
## 依赖: frontend-dev-plan-3.1-state-management.md
## 并行: frontend-dev-plan-4.2-4.7

创建 src/components/Timeline.tsx:
```typescript
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Workspace } from './Workspace';

export function Timeline() {
  const { workspaces, createWorkspace } = useWorkspaceStore();

  return (
    <div className="flex overflow-x-auto p-4 gap-4">
      {workspaces.map(workspace => (
        <Workspace key={workspace._id} workspace={workspace} />
      ))}
      <button
        onClick={createWorkspace}
        className="min-w-[300px] h-[600px] border-2 border-dashed flex items-center justify-center"
      >
        + 添加工作空间
      </button>
    </div>
  );
}
```

验收:
- [ ] 横向滚动正常
- [ ] 点击+可创建工作空间

下一步: frontend-dev-plan-5.1
