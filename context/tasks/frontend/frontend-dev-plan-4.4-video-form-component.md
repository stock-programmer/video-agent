# 前端任务 4.4 - 视频表单组件
## 层级: 第4层
## 依赖: frontend-dev-plan-2.3-api-client.md, frontend-dev-plan-3.1-state-management.md
## 并行: frontend-dev-plan-4.1-4.3, 4.5-4.7

创建 src/components/VideoForm.tsx:
```typescript
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';
import { wsClient } from '../services/websocket';
import { api } from '../services/api';

interface Props {
  workspaceId: string;
  formData: any;
}

export function VideoForm({ workspaceId, formData }: Props) {
  const { register, watch, handleSubmit } = useForm({ defaultValues: formData });

  // 自动保存(debounce 300ms)
  const autoSave = debounce((data) => {
    wsClient.send({
      type: 'workspace.update',
      data: { workspace_id: workspaceId, updates: { form_data: data } }
    });
  }, 300);

  watch((data) => autoSave(data));

  const onSubmit = async (data: any) => {
    await api.generateVideo(workspaceId, data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border rounded p-4 space-y-4">
      <select {...register('camera_movement')}>
        <option value="">运镜方式</option>
        <option value="push forward">推进</option>
        <option value="pull back">拉远</option>
      </select>

      <select {...register('shot_type')}>
        <option value="">景别</option>
        <option value="close-up">特写</option>
        <option value="medium shot">中景</option>
      </select>

      <select {...register('lighting')}>
        <option value="">光线</option>
        <option value="natural">自然光</option>
        <option value="soft">柔光</option>
      </select>

      <textarea {...register('motion_prompt')} placeholder="主体运动描述" />

      <button type="submit">生成视频</button>
    </form>
  );
}
```

验收:
- [ ] 表单可填写
- [ ] 自动保存生效
- [ ] 提交触发视频生成

下一步: frontend-dev-plan-5.1
