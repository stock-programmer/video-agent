export interface Workspace {
  _id: string;
  order_index: number;
  image_path?: string;
  image_url?: string;
  form_data: FormData;
  video?: VideoData;
  ai_collaboration?: AICollaboration[];
  deleted?: DeletedInfo;  // 新增删除信息
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

export interface DeletedInfo {
  is_deleted: boolean;
  deleted_at?: string;
  original_order_index?: number;
}
