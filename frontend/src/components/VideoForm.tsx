import { useState, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { wsClient } from '../services/websocket';
import { api } from '../services/api';
import { ComboboxInput } from './ComboboxInput';
import type {
  VideoFormData,
  Duration,
  MotionIntensity,
  QualityPreset
} from '../types/workspace';

import {
  DURATION_OPTIONS_META,
  ASPECT_RATIO_OPTIONS_META,
  MOTION_INTENSITY_LEVELS,
  MOTION_INTENSITY_LABELS,
  MOTION_INTENSITY_DESCRIPTIONS,
  QUALITY_PRESET_OPTIONS_META,
  DEFAULT_V1_1_FORM_DATA,
  validateV1_1FormData,
  CAMERA_MOVEMENT_PRESET_OPTIONS,
  SHOT_TYPE_PRESET_OPTIONS,
  LIGHTING_PRESET_OPTIONS,
  ANGLE_PRESET_OPTIONS,
  FRAME_RATE_PRESET_OPTIONS
} from '../types/workspace';

interface Props {
  workspaceId: string;
  formData: VideoFormData;
  optimizationAppliedAt?: number;  // v2.0: 优化应用时间戳
}

export function VideoForm({ workspaceId, formData: initialFormData, optimizationAppliedAt }: Props) {
  // Initialize form state with v1.1 defaults
  const [formData, setFormData] = useState<VideoFormData>({
    // v1.0 fields
    camera_movement: initialFormData.camera_movement || '',
    shot_type: initialFormData.shot_type || '',
    lighting: initialFormData.lighting || '',
    motion_prompt: initialFormData.motion_prompt || '',
    checkboxes: initialFormData.checkboxes || {},
    // v1.1 fields with defaults
    duration: initialFormData.duration ?? DEFAULT_V1_1_FORM_DATA.duration,
    aspect_ratio: initialFormData.aspect_ratio ?? DEFAULT_V1_1_FORM_DATA.aspect_ratio,
    motion_intensity: initialFormData.motion_intensity ?? DEFAULT_V1_1_FORM_DATA.motion_intensity,
    quality_preset: initialFormData.quality_preset ?? DEFAULT_V1_1_FORM_DATA.quality_preset,
    // v1.2 fields
    angle: initialFormData.angle || '',
    frame_rate: initialFormData.frame_rate || ''
  });

  // Auto-save (debounce 300ms)
  const autoSave = useMemo(
    () => debounce((data: VideoFormData) => {
      wsClient.send({
        type: 'workspace.update',
        data: { workspace_id: workspaceId, updates: { form_data: data } }
      });
    }, 300),
    [workspaceId]
  );

  // Sync with props when initialFormData changes (e.g., when applying optimization)
  // Use a ref to track if we should skip auto-save (to prevent infinite loop)
  const skipAutoSaveRef = useRef(false);
  // Track the workspace ID to detect workspace switches
  const prevWorkspaceIdRef = useRef(workspaceId);
  // Track optimization application timestamp
  const prevOptimizationAppliedAtRef = useRef(optimizationAppliedAt);

  useEffect(() => {
    // Only reset form when:
    // 1. Switching to a different workspace
    // 2. Optimization was applied (optimizationAppliedAt changed)
    const isWorkspaceSwitch = prevWorkspaceIdRef.current !== workspaceId;
    const isOptimizationApplied = optimizationAppliedAt !== undefined &&
                                  optimizationAppliedAt !== prevOptimizationAppliedAtRef.current;

    if (isWorkspaceSwitch || isOptimizationApplied) {
      if (isWorkspaceSwitch) {
        console.log('[VideoForm] Workspace switched, resetting form state', { from: prevWorkspaceIdRef.current, to: workspaceId });
        prevWorkspaceIdRef.current = workspaceId;
      }

      if (isOptimizationApplied) {
        console.log('[VideoForm] Optimization applied, updating form state', { timestamp: optimizationAppliedAt });
        prevOptimizationAppliedAtRef.current = optimizationAppliedAt;
      }

      // Set flag to skip auto-save for this update
      skipAutoSaveRef.current = true;

      setFormData({
        // v1.0 fields
        camera_movement: initialFormData.camera_movement || '',
        shot_type: initialFormData.shot_type || '',
        lighting: initialFormData.lighting || '',
        motion_prompt: initialFormData.motion_prompt || '',
        checkboxes: initialFormData.checkboxes || {},
        // v1.1 fields with defaults
        duration: initialFormData.duration ?? DEFAULT_V1_1_FORM_DATA.duration,
        aspect_ratio: initialFormData.aspect_ratio ?? DEFAULT_V1_1_FORM_DATA.aspect_ratio,
        motion_intensity: initialFormData.motion_intensity ?? DEFAULT_V1_1_FORM_DATA.motion_intensity,
        quality_preset: initialFormData.quality_preset ?? DEFAULT_V1_1_FORM_DATA.quality_preset,
        // v1.2 fields
        angle: initialFormData.angle || '',
        frame_rate: initialFormData.frame_rate || ''
      });

      // Reset flag after state update
      setTimeout(() => {
        skipAutoSaveRef.current = false;
      }, 0);
    } else {
      // Same workspace and no optimization: props update is likely from auto-save sync, don't reset form
      console.log('[VideoForm] Props updated (same workspace), keeping current form state');
    }
  }, [workspaceId, initialFormData, optimizationAppliedAt]);

  // Generic change handler
  const handleChange = <K extends keyof VideoFormData>(field: K, value: VideoFormData[K]) => {
    const newFormData = {
      ...formData,
      [field]: value
    };

    setFormData(newFormData);

    // Only trigger auto-save if this is a user-initiated change (not from props sync)
    if (!skipAutoSaveRef.current) {
      autoSave(newFormData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate v1.1 fields
    const { valid, errors } = validateV1_1FormData(formData);
    if (!valid) {
      console.error('Validation errors:', errors);
      alert(`表单验证失败:\n${errors.join('\n')}`);
      return;
    }

    // Submit to backend
    try {
      await api.generateVideo(workspaceId, formData);
    } catch (error) {
      console.error('Failed to generate video:', error);
      alert('视频生成失败，请稍后重试');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded p-4 space-y-6">
      {/* ===== 基础参数区域 (v1.1新增) ===== */}
      <div className="form-section bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">基础参数</h3>

        {/* Duration 时长选择 */}
        <div className="mb-4">
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            视频时长
          </label>
          <select
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={(e) => handleChange('duration', Number(e.target.value) as Duration)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DURATION_OPTIONS_META.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio 宽高比选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            宽高比
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ASPECT_RATIO_OPTIONS_META.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('aspect_ratio', option.value)}
                className={`
                  relative p-3 border-2 rounded-lg transition-all text-center
                  ${formData.aspect_ratio === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                  }
                `}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className="text-xs font-semibold">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality Preset 质量预设 */}
        <div className="mb-0">
          <label htmlFor="quality_preset" className="block text-sm font-medium text-gray-700 mb-2">
            质量预设
          </label>
          <select
            id="quality_preset"
            name="quality_preset"
            value={formData.quality_preset}
            onChange={(e) => handleChange('quality_preset', e.target.value as QualityPreset)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {QUALITY_PRESET_OPTIONS_META.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.resolution}, {option.estimatedTime}) {option.value === 'standard' ? '✓ 推荐' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            预计生成时间：{
              QUALITY_PRESET_OPTIONS_META.find(o => o.value === formData.quality_preset)?.estimatedTime
            }
          </p>
        </div>
      </div>

      {/* ===== 运动控制区域 (v1.0 + v1.1) ===== */}
      <div className="form-section p-4 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">运动控制</h3>

        {/* Motion Intensity 运动强度滑块 (v1.1) */}
        <div className="mb-4">
          <label htmlFor="motion_intensity" className="block text-sm font-medium text-gray-700 mb-2">
            运动强度
          </label>

          {/* 滑块 */}
          <div className="relative">
            <input
              type="range"
              id="motion_intensity"
              name="motion_intensity"
              min={1}
              max={5}
              step={1}
              value={formData.motion_intensity}
              onChange={(e) => handleChange('motion_intensity', Number(e.target.value) as MotionIntensity)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />

            {/* 刻度标记 */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {MOTION_INTENSITY_LEVELS.map(level => (
                <span key={level} className={formData.motion_intensity === level ? 'font-bold text-blue-600' : ''}>
                  {level}
                </span>
              ))}
            </div>
          </div>

          {/* 当前选中的强度标签和描述 */}
          <div className="mt-2 text-center">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {MOTION_INTENSITY_LABELS[formData.motion_intensity!]}
            </span>
            <p className="text-xs text-gray-600 mt-1">
              {MOTION_INTENSITY_DESCRIPTIONS[formData.motion_intensity!]}
            </p>
          </div>
        </div>

        {/* Motion Prompt (v1.0 保留) */}
        <div className="mb-0">
          <label htmlFor="motion_prompt" className="block text-sm font-medium text-gray-700 mb-2">
            主体运动描述
          </label>
          <textarea
            id="motion_prompt"
            name="motion_prompt"
            value={formData.motion_prompt}
            onChange={(e) => handleChange('motion_prompt', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="描述画面中主体的动作、情绪、变化等..."
          />
        </div>
      </div>

      {/* ===== 镜头控制区域 (v1.0 保留 + v1.2 增强) ===== */}
      <div className="form-section space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">镜头控制</h3>

        {/* 运镜方式 - 改为 ComboboxInput */}
        <ComboboxInput
          id="camera_movement"
          name="camera_movement"
          label="运镜方式"
          value={formData.camera_movement || ''}
          onChange={(value) => handleChange('camera_movement', value)}
          options={CAMERA_MOVEMENT_PRESET_OPTIONS}
          placeholder="自由输入或选择预设运镜方式..."
        />

        {/* 景别 - 改为 ComboboxInput */}
        <ComboboxInput
          id="shot_type"
          name="shot_type"
          label="景别"
          value={formData.shot_type || ''}
          onChange={(value) => handleChange('shot_type', value)}
          options={SHOT_TYPE_PRESET_OPTIONS}
          placeholder="自由输入或选择预设景别..."
        />

        {/* 光线 - 改为 ComboboxInput */}
        <ComboboxInput
          id="lighting"
          name="lighting"
          label="光线"
          value={formData.lighting || ''}
          onChange={(value) => handleChange('lighting', value)}
          options={LIGHTING_PRESET_OPTIONS}
          placeholder="自由输入或选择预设光线..."
        />

        {/* v1.2 新增：视角 */}
        <ComboboxInput
          id="angle"
          name="angle"
          label="视角"
          value={formData.angle || ''}
          onChange={(value) => handleChange('angle', value)}
          options={ANGLE_PRESET_OPTIONS}
          placeholder="自由输入或选择预设视角..."
        />

        {/* v1.2 新增：帧率 */}
        <ComboboxInput
          id="frame_rate"
          name="frame_rate"
          label="帧率"
          value={formData.frame_rate || ''}
          onChange={(value) => handleChange('frame_rate', value)}
          options={FRAME_RATE_PRESET_OPTIONS}
          placeholder="自由输入或选择预设帧率..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        生成视频
      </button>
    </form>
  );
}
