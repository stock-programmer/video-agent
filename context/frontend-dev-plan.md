# 前端开发计划 - 依赖关系图

## 任务依赖拓扑

```
[0] 环境准备
    └─ 0.1 项目脚手架 + UI库选型
         ↓
[1] 基础设施 (可并行)
    ├─ 1.1 项目配置 (Vite, TypeScript, Tailwind)
    ├─ 1.2 目录结构 + TypeScript类型定义
    ├─ 1.3 API客户端封装 (axios + react-query)
    └─ 1.4 WebSocket客户端封装
         ↓
[2] 状态管理 (依赖1.2)
    └─ 2.1 Zustand状态设计 + WebSocket集成
         ↓
[3] UI组件层 (可大部分并行, 部分依赖2.1)
    ├─ 3.1 布局组件
    │    ├─ Timeline.tsx (横向滚动容器)
    │    └─ Workspace.tsx (工作空间容器)
    ├─ 3.2 功能组件 (可并行)
    │    ├─ ImageUpload.tsx
    │    ├─ VideoGenerationForm.tsx
    │    ├─ VideoPlayer.tsx
    │    └─ AICollaboration.tsx
    └─ 3.3 通用组件 (可并行)
         ├─ LoadingSpinner.tsx
         ├─ ErrorMessage.tsx
         └─ EmptyState.tsx
         ↓
[4] 集成与优化 (依赖所有上游)
    ├─ 4.1 组件组装 + 路由配置
    ├─ 4.2 交互逻辑连通 (debounce, 错误处理)
    ├─ 4.3 性能优化 (懒加载, 虚拟滚动)
    └─ 4.4 样式优化 + 响应式布局
         ↓
[5] 联调与测试 (依赖后端API)
    ├─ 5.1 前后端联调 (完整流程测试)
    ├─ 5.2 用户体验优化
    └─ 5.3 单元测试 (组件 + Hooks)
```

---

## 任务详细说明

### [0] 环境准备

**0.1 项目脚手架 + UI库选型**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**UI库选择** (三选一):
- Tailwind CSS (推荐, 灵活定制)
- Ant Design (组件丰富)
- MUI (Material Design)

**交付**: 项目可启动, 显示初始页面

---

### [1] 基础设施 (可并行执行)

**1.1 项目配置**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
- 配置 `tailwind.config.js`
- 配置 `vite.config.ts` (代理API请求)

**1.2 目录结构 + TypeScript类型**
```
src/
├── components/        # React组件
├── hooks/             # 自定义Hooks
├── services/          # API + WebSocket客户端
├── stores/            # Zustand状态管理
├── types/             # TypeScript类型定义
├── utils/             # 工具函数
└── App.tsx
```

创建 `types/workspace.ts`:
```typescript
export interface Workspace {
  _id: string;
  order_index: number;
  image_path?: string;
  image_url?: string;
  form_data: {
    camera_movement?: string;
    shot_type?: string;
    lighting?: string;
    motion_prompt?: string;
    checkboxes?: Record<string, boolean>;
  };
  video?: {
    status: 'pending' | 'generating' | 'completed' | 'failed';
    task_id?: string;
    url?: string;
    error?: string;
  };
  ai_collaboration?: Array<{
    user_input: string;
    ai_suggestion: any;
    timestamp: string;
  }>;
}
```

**1.3 API客户端封装**
```bash
npm install axios @tanstack/react-query
```

创建 `services/api.ts`:
```typescript
export const api = {
  uploadImage: (file: File) => Promise<{image_path, image_url}>,
  getWorkspaces: () => Promise<Workspace[]>,
  generateVideo: (workspaceId: string, formData: any) => Promise<{task_id}>,
  getAISuggestion: (workspaceId: string, userInput: string) => Promise<any>
}
```

**1.4 WebSocket客户端封装**
创建 `services/websocket.ts`:
```typescript
class WebSocketClient {
  connect(): void
  disconnect(): void
  send(message: any): void
  on(event: string, callback: Function): void
  // 自动重连 (指数退避)
  // 心跳检测
}
```

**交付**: 基础设施就绪, 可调用API和WebSocket

---

### [2] 状态管理 (依赖1.2)

**2.1 Zustand状态设计**
```bash
npm install zustand
```

创建 `stores/workspaceStore.ts`:
```typescript
interface WorkspaceStore {
  workspaces: Workspace[];

  // 同步操作
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  reorderWorkspaces: (newOrder: string[]) => void;

  // 异步操作
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: () => Promise<void>;

  // WebSocket连接
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}
```

**集成WebSocket**:
- 在 `connectWebSocket()` 中监听消息
- 收到 `workspace.created/sync_confirm/deleted` 等消息时更新状态
- 收到 `video.status_update` 时更新对应workspace

**交付**: 状态管理可用, WebSocket集成完成

---

### [3] UI组件层

### 3.1 布局组件

**Timeline.tsx**
```typescript
// 横向滚动容器
// - 渲染所有Workspace组件
// - 支持拖拽排序 (react-beautiful-dnd / dnd-kit)
// - 右侧「+」按钮创建新workspace
```
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Workspace.tsx**
```typescript
// 工作空间容器
// 布局: 左侧(上中下: 图片/表单/视频) + 右侧(AI协作)
// Props: workspace对象
```

### 3.2 功能组件 (可并行开发)

**ImageUpload.tsx**
```typescript
// - 点击上传 / 拖拽上传
// - 图片预览
// - 上传进度显示
// - 调用 api.uploadImage() → 更新workspace
```

**VideoGenerationForm.tsx**
```typescript
// - 下拉框: 运镜方式, 景别, 光线
// - 复选框: 其他选项
// - 文本输入框: 主体运动提示词
// - debounce 300ms → WebSocket发送update
// - 提交按钮 → 调用 api.generateVideo()
```
```bash
npm install react-hook-form lodash-es
```

**VideoPlayer.tsx**
```typescript
// - 视频播放器 (原生<video>或react-player)
// - 播放控制
// - 状态显示: 未生成/生成中/已完成/失败
```

**AICollaboration.tsx**
```typescript
// - 用户输入框
// - 提交按钮 → 调用 api.getAISuggestion()
// - 建议展示区
// - (可选) 一键应用建议到表单
```

### 3.3 通用组件 (可并行开发)

**LoadingSpinner.tsx**
```typescript
// 加载动画 (可用Tailwind或UI库)
```

**ErrorMessage.tsx**
```typescript
// 错误提示组件
```

**EmptyState.tsx**
```typescript
// 空状态提示 (无工作空间, 无视频等)
```

**交付**: 所有组件开发完成, Storybook演示 (可选)

---

### [4] 集成与优化 (依赖所有上游)

**4.1 组件组装 + 路由配置**
```typescript
// App.tsx
function App() {
  const { workspaces, fetchWorkspaces, connectWebSocket } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return <Timeline workspaces={workspaces} />;
}
```

**4.2 交互逻辑连通**
- 表单自动保存 (debounce 300ms → WebSocket update)
- 视频生成状态监听 (WebSocket推送 → 更新UI)
- 错误处理 (网络错误, API失败, WebSocket断线)
- 重连逻辑 (WebSocket断线自动重连)

**4.3 性能优化**
```bash
npm install react-virtuoso  # 虚拟滚动
```
- 图片懒加载 (Intersection Observer)
- 虚拟滚动 (工作空间过多时)
- 组件memo优化 (避免不必要渲染)
- debounce/throttle (滚动, 输入)

**4.4 样式优化 + 响应式布局**
- 统一视觉风格
- 响应式设计 (适配不同屏幕宽度)
- 动画效果 (加载, 成功, 失败)
- 无障碍支持 (可选)

**交付**: 前端功能完整, 体验流畅

---

### [5] 联调与测试 (依赖后端API)

**5.1 前后端联调**
- 完整流程测试: 创建workspace → 上传图片 → 填写表单 → 生成视频 → AI建议
- WebSocket实时同步测试
- 刷新页面数据恢复测试
- 断线重连测试

**5.2 用户体验优化**
- 根据测试结果调整UI/UX
- 优化加载状态
- 优化错误提示
- 优化动画效果

**5.3 单元测试**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

测试内容:
- 组件测试 (渲染, 交互)
- Hooks测试 (useWorkspaceStore)
- 工具函数测试

**交付**: 测试覆盖率 > 60%, 所有核心流程测试通过

---

## 并行执行策略

### 第一批 (启动项目)
- 0.1 项目脚手架

### 第二批 (可同时开始)
- 1.1 项目配置
- 1.2 目录结构 + TypeScript类型
- 1.3 API客户端
- 1.4 WebSocket客户端

### 第三批 (依赖1.2完成)
- 2.1 Zustand状态管理 + WebSocket集成

### 第四批 (可大部分并行)
- 3.1 Timeline + Workspace (依赖2.1)
- 3.2 所有功能组件 (可并行)
- 3.3 所有通用组件 (可并行)

### 第五批 (依赖所有组件)
- 4.1 组件组装
- 4.2 交互逻辑
- 4.3 性能优化
- 4.4 样式优化

### 第六批 (依赖后端 + 前端集成)
- 5.1 前后端联调
- 5.2 用户体验优化
- 5.3 单元测试

---

## 关键里程碑

- ✅ **M1**: 基础设施就绪 (API + WebSocket客户端可用)
- ✅ **M2**: 状态管理完成 (Zustand + WebSocket集成)
- ✅ **M3**: 所有组件开发完成 (可独立演示)
- ✅ **M4**: 集成完成 (完整交互流程可用)
- ✅ **M5**: 联调完成 (前后端打通, 测试通过)

---

## 验收标准

每个任务完成后用以下方式验证:

- **基础设施**: API请求成功, WebSocket连接成功
- **状态管理**: 状态更新正常, WebSocket消息处理正确
- **组件**: Storybook演示 或 独立页面测试
- **集成**: 完整流程无障碍执行
- **联调**: 所有功能与后端配合正常

---

## 技术栈总结

```
React 18 + TypeScript + Vite
├── 状态管理: Zustand
├── API客户端: Axios + React Query
├── WebSocket: 原生WebSocket API
├── UI框架: Tailwind CSS
├── 表单: React Hook Form
├── 拖拽: @dnd-kit
├── 虚拟滚动: react-virtuoso
└── 测试: Vitest + React Testing Library
```

---

## 参考文档

- [业务需求文档](./business.md)
- [后端API设计](./backend-api-design.md)
- [后端架构](./backend-architecture.md)
