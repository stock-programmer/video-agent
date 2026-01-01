# 前端任务 3.1 - 状态管理
## 层级: 第3层
## 依赖: frontend-dev-plan-2.1, 2.2, 2.3, 2.4

创建 src/stores/workspaceStore.ts:
```typescript
import { create } from 'zustand';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import type { Workspace } from '../types/workspace';

interface WorkspaceStore {
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: () => Promise<void>;
  connectWebSocket: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],

  setWorkspaces: (workspaces) => set({ workspaces }),

  addWorkspace: (workspace) => 
    set(state => ({ workspaces: [...state.workspaces, workspace] })),

  updateWorkspace: (id, updates) => 
    set(state => ({
      workspaces: state.workspaces.map(w => 
        w._id === id ? { ...w, ...updates } : w
      )
    })),

  deleteWorkspace: (id) => 
    set(state => ({
      workspaces: state.workspaces.filter(w => w._id !== id)
    })),

  fetchWorkspaces: async () => {
    const workspaces = await api.getWorkspaces();
    set({ workspaces });
  },

  createWorkspace: async () => {
    wsClient.send({ type: 'workspace.create', data: {} });
  },

  connectWebSocket: () => {
    wsClient.connect();
    
    wsClient.on('workspace.created', (msg) => {
      get().addWorkspace(msg.data);
    });
    
    wsClient.on('workspace.sync_confirm', (msg) => {
      console.log('同步确认:', msg.workspace_id);
    });
    
    wsClient.on('video.status_update', (msg) => {
      get().updateWorkspace(msg.workspace_id, {
        video: {
          status: msg.status,
          url: msg.url,
          error: msg.error
        }
      });
    });
  }
}));
```

验收:
- [ ] Store可导入使用
- [ ] WebSocket集成正常

下一步: frontend-dev-plan-4.*
