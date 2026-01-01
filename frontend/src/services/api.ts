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
    const { data } = await client.post('/ai/suggest', {
      workspace_id: workspaceId,
      user_input: userInput
    });
    return data;
  },

  // Hard delete workspace (permanent deletion)
  hardDeleteWorkspace: async (workspaceId: string) => {
    const { data } = await client.delete(`/workspace/${workspaceId}/hard-delete`);
    return data;
  }
};
