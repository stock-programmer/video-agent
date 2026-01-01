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

  // 新增：软删除、恢复、硬删除
  softDeleteWorkspace: (id: string) => void;
  restoreWorkspace: (id: string) => void;
  hardDeleteWorkspace: (id: string) => Promise<void>;

  fetchWorkspaces: () => Promise<void>;
  createWorkspace: () => Promise<void>;
  connectWebSocket: () => void;
  isWebSocketConnected: boolean;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  isWebSocketConnected: false,

  setWorkspaces: (workspaces) => set({ workspaces }),

  addWorkspace: (workspace) =>
    set(state => ({ workspaces: [...state.workspaces, workspace] })),

  updateWorkspace: (id, updates) => {
    console.log('[WorkspaceStore] updateWorkspace 被调用:', { id, updates });

    // 更新本地状态
    set(state => ({
      workspaces: state.workspaces.map(w =>
        w._id === id ? { ...w, ...updates } : w
      )
    }));

    console.log('[WorkspaceStore] 本地状态已更新，准备发送 WebSocket 消息');

    // 通过 WebSocket 同步到后端
    wsClient.send({
      type: 'workspace.update',
      data: {
        workspace_id: id,
        updates
      }
    });

    console.log('[WorkspaceStore] WebSocket 消息已发送');
  },

  deleteWorkspace: (id) =>
    set(state => ({
      workspaces: state.workspaces.filter(w => w._id !== id)
    })),

  // 软删除：标记为已删除，保存原始位置
  softDeleteWorkspace: (id) => {
    const workspace = get().workspaces.find(w => w._id === id);
    if (!workspace) return;

    get().updateWorkspace(id, {
      deleted: {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        original_order_index: workspace.order_index
      }
    });
  },

  // 恢复：取消删除标记，恢复原始位置
  restoreWorkspace: (id) => {
    const workspace = get().workspaces.find(w => w._id === id);
    if (!workspace || !workspace.deleted) return;

    get().updateWorkspace(id, {
      order_index: workspace.deleted.original_order_index || workspace.order_index,
      deleted: {
        is_deleted: false,
        deleted_at: undefined,
        original_order_index: undefined
      }
    });
  },

  // 硬删除：永久删除工作空间
  hardDeleteWorkspace: async (id) => {
    try {
      await api.hardDeleteWorkspace(id);
      get().deleteWorkspace(id);
    } catch (error) {
      console.error('硬删除失败:', error);
      alert('删除失败，请重试');
    }
  },

  fetchWorkspaces: async () => {
    const workspaces = await api.getWorkspaces();
    set({ workspaces });
  },

  createWorkspace: async () => {
    wsClient.send({ type: 'workspace.create', data: {} });
  },

  connectWebSocket: () => {
    // 防止重复连接和注册事件监听器
    if (get().isWebSocketConnected) {
      console.log('[WorkspaceStore] WebSocket 已连接，跳过重复连接');
      return;
    }

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

    set({ isWebSocketConnected: true });
  }
}));
