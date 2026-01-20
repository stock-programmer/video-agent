import axios from 'axios';
import type { Workspace } from '../types/workspace';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const api = {
  // Upload image
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await client.post('/upload/image', formData);
    return data as { image_path: string; image_url: string };
  },

  // Get workspace list
  getWorkspaces: async () => {
    const { data } = await client.get('/workspaces');
    return data as Workspace[];
  },

  // Generate video
  generateVideo: async (workspaceId: string, formData: any) => {
    const { data } = await client.post('/generate/video', {
      workspace_id: workspaceId,
      form_data: formData
    });
    return data as { task_id: string };
  },

  // AI suggestion
  getAISuggestion: async (workspaceId: string, userInput: string) => {
    console.log('[API] Calling /api/ai/suggest', { workspaceId, userInput: userInput.substring(0, 50) });

    try {
      const { data } = await client.post('/ai/suggest', {
        workspace_id: workspaceId,
        user_input: userInput
      });

      console.log('[API] AI Suggest Response:', data);

      // Backend returns { success: true, data: { camera_movement, shot_type, ... } }
      // Return the actual suggestion data
      return data.data || data;
    } catch (error: any) {
      console.error('[API] AI Suggest Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Hard delete workspace (permanent deletion)
  hardDeleteWorkspace: async (workspaceId: string) => {
    const { data } = await client.delete(`/workspace/${workspaceId}/hard-delete`);
    return data;
  },

  // ========== v2.0 新增 API ==========

  /**
   * 触发提示词优化
   */
  optimizePrompt: async (workspaceId: string) => {
    console.log('[API] Calling /api/optimize-prompt', { workspaceId });

    try {
      const { data } = await client.post('/optimize-prompt', {
        workspace_id: workspaceId
      });

      console.log('[API] Response:', data);
      return data as { success: boolean; message?: string; error?: string; workspace_id: string };

    } catch (error: any) {
      console.error('[API] Error:', error.response?.data || error.message);
      throw error;
    }
  }
};
