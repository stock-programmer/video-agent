# 前端任务 4.3 - 图片上传组件
## 层级: 第4层
## 依赖: frontend-dev-plan-2.3-api-client.md, frontend-dev-plan-3.1-state-management.md
## 并行: frontend-dev-plan-4.1-4.2, 4.4-4.7

创建 src/components/ImageUpload.tsx:
```typescript
import { useState } from 'react';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface Props {
  workspaceId: string;
  imageUrl?: string;
}

export function ImageUpload({ workspaceId, imageUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const updateWorkspace = useWorkspaceStore(s => s.updateWorkspace);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      updateWorkspace(workspaceId, {
        image_path: result.image_path,
        image_url: result.image_url
      });
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded p-4">
      {imageUrl ? (
        <img src={imageUrl} alt="上传的图片" className="max-w-full" />
      ) : (
        <label className="cursor-pointer block text-center p-8 border-dashed border-2">
          {uploading ? '上传中...' : '点击上传图片'}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
      )}
    </div>
  );
}
```

验收:
- [ ] 可上传图片
- [ ] 显示预览

下一步: frontend-dev-plan-5.1
