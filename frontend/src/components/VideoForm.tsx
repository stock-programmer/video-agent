import { useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import { wsClient } from '../services/websocket';
import { api } from '../services/api';
import type { FormData as WorkspaceFormData } from '../types/workspace';

interface Props {
  workspaceId: string;
  formData: WorkspaceFormData;
}

export function VideoForm({ workspaceId, formData }: Props) {
  const { register, watch, handleSubmit } = useForm({ defaultValues: formData });

  // Auto-save (debounce 300ms)
  const autoSave = useMemo(
    () => debounce((data: WorkspaceFormData) => {
      wsClient.send({
        type: 'workspace.update',
        data: { workspace_id: workspaceId, updates: { form_data: data } }
      });
    }, 300),
    [workspaceId]
  );

  // Watch for form changes and trigger auto-save
  useEffect(() => {
    const subscription = watch((data) => autoSave(data as WorkspaceFormData));
    return () => subscription.unsubscribe();
  }, [watch, autoSave]);

  const onSubmit = async (data: WorkspaceFormData) => {
    try {
      await api.generateVideo(workspaceId, data);
    } catch (error) {
      console.error('Failed to generate video:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border rounded p-4 space-y-4">
      <div className="space-y-2">
        <label htmlFor="camera_movement" className="block text-sm font-medium">
          运镜方式
        </label>
        <select
          id="camera_movement"
          {...register('camera_movement')}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">选择运镜方式</option>
          <option value="push forward">推进</option>
          <option value="pull back">拉远</option>
          <option value="pan left">左移</option>
          <option value="pan right">右移</option>
          <option value="tilt up">上移</option>
          <option value="tilt down">下移</option>
          <option value="zoom in">拉近</option>
          <option value="zoom out">拉远</option>
          <option value="orbit">环绕</option>
          <option value="static">静止</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="shot_type" className="block text-sm font-medium">
          景别
        </label>
        <select
          id="shot_type"
          {...register('shot_type')}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">选择景别</option>
          <option value="close-up">特写</option>
          <option value="medium shot">中景</option>
          <option value="full shot">全景</option>
          <option value="wide shot">远景</option>
          <option value="extreme close-up">大特写</option>
          <option value="medium close-up">中特写</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="lighting" className="block text-sm font-medium">
          光线
        </label>
        <select
          id="lighting"
          {...register('lighting')}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">选择光线</option>
          <option value="natural">自然光</option>
          <option value="soft">柔光</option>
          <option value="hard">硬光</option>
          <option value="golden hour">黄金时段</option>
          <option value="blue hour">蓝调时段</option>
          <option value="backlight">逆光</option>
          <option value="side light">侧光</option>
          <option value="dramatic">戏剧性光线</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="motion_prompt" className="block text-sm font-medium">
          主体运动描述
        </label>
        <textarea
          id="motion_prompt"
          {...register('motion_prompt')}
          placeholder="描述画面中主体的运动方式，例如：人物缓缓转身，微风吹动窗帘..."
          rows={4}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        生成视频
      </button>
    </form>
  );
}
