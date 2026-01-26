// ===== v1.0 基础类型定义 =====

export interface Workspace {
  _id: string;
  order_index: number;
  image_path?: string;
  image_url?: string;
  form_data: VideoFormData;
  video?: VideoGenerationStatus;
  ai_collaboration?: AICollaboration[];
  deleted?: DeletedInfo;
  createdAt?: string;
  updatedAt?: string;
  // v2.0: 优化应用时间戳 - 用于触发VideoForm更新
  optimization_applied_at?: number;
  // v2.0.1: 优化历史记录
  optimization_history?: OptimizationHistoryEntry[];
}

export interface VideoFormData {
  // ===== v1.0 字段 =====
  camera_movement?: string;
  shot_type?: string;
  lighting?: string;
  motion_prompt?: string;
  checkboxes?: Record<string, boolean>;

  // ===== v1.1 新增字段 =====
  // ⚠️ 注意: duration值基于Qwen API验证结果（参见v1.1-1.1任务报告）
  duration?: Duration;              // 5, 10, 15 (seconds) - Qwen API支持的值
  aspect_ratio?: AspectRatio;       // '16:9' | '9:16' | '1:1' | '4:3'
  motion_intensity?: MotionIntensity; // 1-5 scale
  quality_preset?: QualityPreset;   // 'draft' | 'standard' | 'high'

  // ===== v1.2 新增字段 =====
  angle?: string;                   // 视角 - 支持自由输入和预设选项
  frame_rate?: string;              // 帧率 - 支持自由输入和预设选项
}

export interface VideoGenerationStatus {
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

// ===== v1.1 新增类型定义 =====

/**
 * 视频时长选项（秒）
 * ⚠️ 注意: 基于Qwen wan2.6-i2v API的实际支持值
 */
export type Duration = 5 | 10 | 15;

/**
 * 视频宽高比
 */
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

/**
 * 运动强度等级 (1=最低, 5=最高)
 */
export type MotionIntensity = 1 | 2 | 3 | 4 | 5;

/**
 * 质量预设
 */
export type QualityPreset = 'draft' | 'standard' | 'high';

// ===== 常量定义（用于下拉框/选择器） =====

/**
 * 时长选项列表
 */
export const DURATION_OPTIONS: readonly Duration[] = [5, 10, 15] as const;

/**
 * 时长选项元数据
 */
export const DURATION_OPTIONS_META: Array<{
  value: Duration;
  label: string;
  description: string;
}> = [
  { value: 5, label: '5秒', description: '短视频片段' },
  { value: 10, label: '10秒', description: '标准场景长度' },
  { value: 15, label: '15秒', description: '扩展叙事片段' }
];

/**
 * 宽高比选项列表
 */
export const ASPECT_RATIO_OPTIONS: readonly AspectRatio[] = [
  '16:9',
  '9:16',
  '1:1',
  '4:3'
] as const;

/**
 * 宽高比选项元数据
 */
export const ASPECT_RATIO_OPTIONS_META: Array<{
  value: AspectRatio;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: '16:9',
    label: '横屏 16:9',
    description: 'YouTube, 传统视频',
    icon: '🖥️'
  },
  {
    value: '9:16',
    label: '竖屏 9:16',
    description: 'TikTok, Reels, Stories',
    icon: '📱'
  },
  {
    value: '1:1',
    label: '方形 1:1',
    description: 'Instagram帖子',
    icon: '◻️'
  },
  {
    value: '4:3',
    label: '经典 4:3',
    description: '传统电视格式',
    icon: '📺'
  }
];

/**
 * 运动强度等级
 */
export const MOTION_INTENSITY_LEVELS: readonly MotionIntensity[] = [
  1, 2, 3, 4, 5
] as const;

/**
 * 运动强度标签
 */
export const MOTION_INTENSITY_LABELS: Record<MotionIntensity, string> = {
  1: '极慢',
  2: '慢速',
  3: '中等',
  4: '快速',
  5: '极快'
};

/**
 * 运动强度描述
 */
export const MOTION_INTENSITY_DESCRIPTIONS: Record<MotionIntensity, string> = {
  1: '微妙变化，几乎静止',
  2: '缓慢移动，平静氛围',
  3: '自然节奏，适合大多数场景',
  4: '活跃动感，适合动作场景',
  5: '极高动态，快速运动'
};

/**
 * 质量预设选项列表
 */
export const QUALITY_PRESET_OPTIONS: readonly QualityPreset[] = [
  'draft',
  'standard',
  'high'
] as const;

/**
 * 质量预设元数据
 */
export const QUALITY_PRESET_OPTIONS_META: Array<{
  value: QualityPreset;
  label: string;
  description: string;
  resolution: string;
  estimatedTime: string;
}> = [
  {
    value: 'draft',
    label: '草稿',
    description: '快速预览',
    resolution: '720p',
    estimatedTime: '~1分钟'
  },
  {
    value: 'standard',
    label: '标准',
    description: '推荐',
    resolution: '1080p',
    estimatedTime: '~2分钟'
  },
  {
    value: 'high',
    label: '高清',
    description: '最佳质量',
    resolution: '1080p+',
    estimatedTime: '~4分钟'
  }
];

// ===== v1.2 新增常量定义 =====

/**
 * 视角预设选项（支持自由输入）
 */
export const ANGLE_PRESET_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: 'eye level', label: '平视', description: '与主体同高度视角' },
  { value: 'low angle', label: '仰视', description: '从下向上拍摄' },
  { value: 'high angle', label: '俯视', description: '从上向下拍摄' },
  { value: 'birds eye', label: '鸟瞰', description: '正上方垂直俯视' },
  { value: 'dutch angle', label: '倾斜', description: '倾斜构图，营造不稳定感' },
  { value: 'overhead', label: '顶视', description: '从正上方俯瞰' },
  { value: 'worms eye', label: '虫视', description: '极低角度仰视' }
];

/**
 * 帧率预设选项（支持自由输入）
 */
export const FRAME_RATE_PRESET_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: '24', label: '24 fps', description: '电影标准帧率' },
  { value: '25', label: '25 fps', description: 'PAL 视频标准' },
  { value: '30', label: '30 fps', description: 'NTSC 视频标准，网络常用' },
  { value: '60', label: '60 fps', description: '高帧率，流畅运动' },
  { value: '120', label: '120 fps', description: '超高帧率，慢动作素材' }
];

/**
 * 运镜方式预设选项（支持自由输入）
 */
export const CAMERA_MOVEMENT_PRESET_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: 'push forward', label: '推进', description: '镜头向前推进' },
  { value: 'pull back', label: '拉远', description: '镜头向后拉远' },
  { value: 'pan left', label: '左移', description: '镜头水平左移' },
  { value: 'pan right', label: '右移', description: '镜头水平右移' },
  { value: 'tilt up', label: '上移', description: '镜头向上倾斜' },
  { value: 'tilt down', label: '下移', description: '镜头向下倾斜' },
  { value: 'zoom in', label: '拉近', description: '变焦拉近' },
  { value: 'zoom out', label: '拉远', description: '变焦拉远' },
  { value: 'orbit', label: '环绕', description: '围绕主体环绕' },
  { value: 'static', label: '静止', description: '固定机位' }
];

/**
 * 景别预设选项（支持自由输入）
 */
export const SHOT_TYPE_PRESET_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: 'close-up', label: '特写', description: '面部或物体细节' },
  { value: 'medium shot', label: '中景', description: '腰部以上' },
  { value: 'full shot', label: '全景', description: '全身镜头' },
  { value: 'wide shot', label: '远景', description: '展示环境' },
  { value: 'extreme close-up', label: '大特写', description: '局部细节' },
  { value: 'medium close-up', label: '中特写', description: '胸部以上' }
];

/**
 * 光线预设选项（支持自由输入）
 */
export const LIGHTING_PRESET_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: 'natural', label: '自然光', description: '自然环境光线' },
  { value: 'soft', label: '柔光', description: '柔和均匀光线' },
  { value: 'hard', label: '硬光', description: '强烈对比光线' },
  { value: 'golden hour', label: '黄金时段', description: '日出日落暖光' },
  { value: 'blue hour', label: '蓝调时段', description: '黎明黄昏冷光' },
  { value: 'backlight', label: '逆光', description: '背光效果' },
  { value: 'side light', label: '侧光', description: '侧面照明' },
  { value: 'dramatic', label: '戏剧性光线', description: '强烈情绪光线' }
];

// ===== 默认值常量 =====

/**
 * v1.1 表单字段默认值
 * ⚠️ 注意: duration默认值为5秒（Qwen API最小值）
 */
export const DEFAULT_V1_1_FORM_DATA = {
  duration: 5 as Duration,  // API最小值
  aspect_ratio: '16:9' as AspectRatio,
  motion_intensity: 3 as MotionIntensity,
  quality_preset: 'standard' as QualityPreset
};

// ===== 类型守卫函数 =====

/**
 * 检查是否为有效的时长值
 */
export function isValidDuration(value: unknown): value is Duration {
  return typeof value === 'number' && DURATION_OPTIONS.includes(value as Duration);
}

/**
 * 检查是否为有效的宽高比
 */
export function isValidAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && ASPECT_RATIO_OPTIONS.includes(value as AspectRatio);
}

/**
 * 检查是否为有效的运动强度
 */
export function isValidMotionIntensity(value: unknown): value is MotionIntensity {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * 检查是否为有效的质量预设
 */
export function isValidQualityPreset(value: unknown): value is QualityPreset {
  return typeof value === 'string' && QUALITY_PRESET_OPTIONS.includes(value as QualityPreset);
}

/**
 * 验证完整的v1.1表单数据
 */
export function validateV1_1FormData(data: Partial<VideoFormData>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.duration !== undefined && !isValidDuration(data.duration)) {
    errors.push(`Invalid duration: ${data.duration}. Must be one of: ${DURATION_OPTIONS.join(', ')}`);
  }

  if (data.aspect_ratio !== undefined && !isValidAspectRatio(data.aspect_ratio)) {
    errors.push(`Invalid aspect_ratio: ${data.aspect_ratio}. Must be one of: ${ASPECT_RATIO_OPTIONS.join(', ')}`);
  }

  if (data.motion_intensity !== undefined && !isValidMotionIntensity(data.motion_intensity)) {
    errors.push(`Invalid motion_intensity: ${data.motion_intensity}. Must be between 1 and 5`);
  }

  if (data.quality_preset !== undefined && !isValidQualityPreset(data.quality_preset)) {
    errors.push(`Invalid quality_preset: ${data.quality_preset}. Must be one of: ${QUALITY_PRESET_OPTIONS.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 为旧的workspace数据填充v1.1默认值
 */
export function applyV1_1Defaults(formData: Partial<VideoFormData>): VideoFormData {
  return {
    // v1.0 fields
    camera_movement: formData.camera_movement || '',
    shot_type: formData.shot_type || '',
    lighting: formData.lighting || '',
    motion_prompt: formData.motion_prompt || '',
    checkboxes: formData.checkboxes || {},
    // v1.1 fields with defaults
    duration: formData.duration ?? DEFAULT_V1_1_FORM_DATA.duration,
    aspect_ratio: formData.aspect_ratio ?? DEFAULT_V1_1_FORM_DATA.aspect_ratio,
    motion_intensity: formData.motion_intensity ?? DEFAULT_V1_1_FORM_DATA.motion_intensity,
    quality_preset: formData.quality_preset ?? DEFAULT_V1_1_FORM_DATA.quality_preset
  };
}

// ===== 向后兼容性支持 =====

/**
 * @deprecated Use VideoFormData instead
 * 保留用于向后兼容
 */
export type FormData = VideoFormData;

/**
 * @deprecated Use VideoGenerationStatus instead
 * 保留用于向后兼容
 */
export type VideoData = VideoGenerationStatus;

// ===== v2.0 新增类型定义：优化流程相关 =====

/**
 * v2.0: 优化流程状态
 */
export interface OptimizationState {
  isActive: boolean;
  currentStep: 'intent' | 'waiting' | 'video' | 'decision' | 'complete';
  intentReport: IntentReport | null;
  videoAnalysis: VideoAnalysis | null;
  finalResult: OptimizationResult | null;
  progressMessages: ProgressMessage[];

  // v2.0.1: 新增详细分析步骤
  analysisSteps: AnalysisStep[];       // 详细的分析步骤列表
  thoughts: ThoughtMessage[];          // AI思考过程

  error: string | null;
}

/**
 * v2.0.1: 分析步骤
 */
export interface AnalysisStep {
  agent: string;                      // agent名称：intent_analysis, video_analysis, master
  phase: string;                      // 步骤阶段：visual_analysis, llm_inference等
  title: string;                      // 步骤标题（中文展示）
  description: string;                // 步骤详细说明
  status: 'running' | 'completed';    // 步骤状态
  result?: any;                       // 步骤结果（可选，完成时提供）
  timestamp: string;                  // 时间戳
}

/**
 * v2.0.1: AI思考消息
 */
export interface ThoughtMessage {
  agent: string;                      // agent名称
  thought: string;                    // 思考内容
  timestamp: string;                  // 时间戳
}

/**
 * v2.0.1: 优化历史记录条目（MongoDB数据结构）
 */
export interface OptimizationHistoryEntry {
  timestamp: string;                  // 优化时间戳
  intent_report: IntentReport;        // 意图分析报告
  video_analysis?: VideoAnalysis;     // 视频分析报告（intent_only模式无此字段）
  optimization_result?: OptimizationResult; // 优化结果（intent_only模式无此字段）
  analysis_steps?: AnalysisStep[];    // 分析步骤列表
  thoughts?: ThoughtMessage[];        // AI思考过程列表
  user_action?: 'applied' | 'rejected' | 'modified' | 'pending'; // 用户操作
  applied_at?: string;                // 应用时间
}

/**
 * 意图报告
 */
export interface IntentReport {
  user_intent: {
    scene_description: string;
    desired_mood: string;
    key_elements: string[];
    motion_expectation: string;
    energy_level?: string;
  };
  parameter_analysis?: {
    aligned: string[];
    potential_issues: string[];
  };
  confidence: number;
}

/**
 * 视频分析结果
 */
export interface VideoAnalysis {
  content_match_score: number;
  issues: Array<{
    category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    affected_parameter?: string;
  }>;
  technical_quality: {
    resolution: string;
    clarity_score: number;
    fluency_score: number;
    artifacts?: string;
  };
  strengths?: string[];
  overall_assessment: string;
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  ng_reasons: string[];
  optimized_params: Partial<VideoFormData>;
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
    reason: string;
  }>;
  confidence: number;
}

/**
 * 进度消息
 */
export interface ProgressMessage {
  type: 'agent_start' | 'agent_progress' | 'agent_complete' | 'error' | 'human_loop';
  agent?: string;
  message: string;
  timestamp: string;
}

// ===== v2.0 WebSocket 消息类型定义 =====

/**
 * 服务端 → 客户端消息
 */
export interface WSAgentStartMessage {
  type: 'agent_start';
  workspace_id: string;
  agent: 'master' | 'intent_analysis' | 'video_analysis';
  timestamp: string;
}

export interface WSAgentProgressMessage {
  type: 'agent_progress';
  workspace_id: string;
  agent: string;
  message: string;
  timestamp: string;
}

export interface WSAgentCompleteMessage {
  type: 'agent_complete';
  workspace_id: string;
  agent: string;
  timestamp: string;
}

export interface WSIntentReportMessage {
  type: 'intent_report';
  workspace_id: string;
  data: IntentReport;
  timestamp: string;
}

export interface WSHumanLoopPendingMessage {
  type: 'human_loop_pending';
  workspace_id: string;
  message: string;
  timestamp: string;
}

export interface WSVideoAnalysisMessage {
  type: 'video_analysis';
  workspace_id: string;
  data: VideoAnalysis;
  timestamp: string;
}

export interface WSOptimizationResultMessage {
  type: 'optimization_result';
  workspace_id: string;
  data: OptimizationResult;
  timestamp: string;
}

export interface WSOptimizationErrorMessage {
  type: 'optimization_error';
  workspace_id: string;
  error: string;
  phase?: 'intent_analysis' | 'video_analysis' | 'master_decision';
  timestamp: string;
}

/**
 * 客户端 → 服务端消息
 */
export interface WSHumanConfirmMessage {
  type: 'human_confirm';
  workspace_id: string;
  confirmed: boolean;
  corrections?: {
    user_intent?: Partial<IntentReport['user_intent']>;
  };
}

/**
 * v2.0 WebSocket 消息联合类型
 */
export type WSV2Message =
  | WSAgentStartMessage
  | WSAgentProgressMessage
  | WSAgentCompleteMessage
  | WSIntentReportMessage
  | WSHumanLoopPendingMessage
  | WSVideoAnalysisMessage
  | WSOptimizationResultMessage
  | WSOptimizationErrorMessage
  | WSHumanConfirmMessage;
