# 前端任务 2.3 - API客户端封装
## 层级: 第2层
## 依赖: frontend-dev-plan-1.1-project-scaffold.md
## 并行: frontend-dev-plan-2.1, 2.2, 2.4

创建 src/services/api.ts:
```typescript
import axios from 'axios';
import type { Workspace } from '../types/workspace';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const api = {
  // 上传图片
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await client.post('/upload/image', formData);
    return data as { image_path: string; image_url: string };
  },

  // 获取工作空间列表
  getWorkspaces: async () => {
    const { data } = await client.get('/workspaces');
    return data as Workspace[];
  },

  // 生成视频
  generateVideo: async (workspaceId: string, formData: any) => {
    const { data } = await client.post('/generate/video', {
      workspace_id: workspaceId,
      form_data: formData
    });
    return data as { task_id: string };
  },

  // AI建议
  getAISuggestion: async (workspaceId: string, userInput: string) => {
    const { data } = await client.post('/ai/suggest', {
      workspace_id: workspaceId,
      user_input: userInput
    });
    return data;
  }
};
```

验收:
- [ ] API客户端可导入使用
- [ ] TypeScript类型正确

下一步: frontend-dev-plan-3.1
