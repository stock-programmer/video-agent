# 前端任务 2.2 - TypeScript类型定义
## 层级: 第2层
## 依赖: frontend-dev-plan-1.1-project-scaffold.md
## 并行: frontend-dev-plan-2.1, 2.3, 2.4

创建 src/types/workspace.ts:
```typescript
export interface Workspace {
  _id: string;
  order_index: number;
  image_path?: string;
  image_url?: string;
  form_data: FormData;
  video?: VideoData;
  ai_collaboration?: AICollaboration[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FormData {
  camera_movement?: string;
  shot_type?: string;
  lighting?: string;
  motion_prompt?: string;
  checkboxes?: Record<string, boolean>;
}

export interface VideoData {
  status: 'pending' | 'generating' | 'completed' | 'failed';
  task_id?: string;
  url?: string;
  error?: string;
}

export interface AICollaboration {
  user_input: string;
  ai_suggestion: any;
  timestamp: string;
}
```

验收:
- [ ] 类型定义无错误
- [ ] 可被其他文件导入

下一步: frontend-dev-plan-3.1, 4.*
