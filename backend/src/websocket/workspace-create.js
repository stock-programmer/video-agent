import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

/**
 * v1.1: Default values for new fields
 * ⚠️ Note: duration values based on Qwen API verification (5, 10, 15)
 */
const V1_1_DEFAULTS = {
  duration: 5,  // API minimum value
  aspect_ratio: '16:9',
  motion_intensity: 3,
  quality_preset: 'standard'
};

/**
 * v1.1: Validate new fields
 */
function validateV1_1Fields(formData) {
  const errors = [];

  // Validate duration (Qwen API supports 5, 10, 15)
  if (formData.duration !== undefined && ![5, 10, 15].includes(formData.duration)) {
    errors.push(`Invalid duration: ${formData.duration}. Must be 5, 10, or 15.`);
  }

  // Validate aspect_ratio
  if (formData.aspect_ratio !== undefined && !['16:9', '9:16', '1:1', '4:3'].includes(formData.aspect_ratio)) {
    errors.push(`Invalid aspect_ratio: ${formData.aspect_ratio}. Must be 16:9, 9:16, 1:1, or 4:3.`);
  }

  // Validate motion_intensity
  if (formData.motion_intensity !== undefined) {
    if (typeof formData.motion_intensity !== 'number' || formData.motion_intensity < 1 || formData.motion_intensity > 5) {
      errors.push(`Invalid motion_intensity: ${formData.motion_intensity}. Must be between 1 and 5.`);
    }
  }

  // Validate quality_preset
  if (formData.quality_preset !== undefined && !['draft', 'standard', 'high'].includes(formData.quality_preset)) {
    errors.push(`Invalid quality_preset: ${formData.quality_preset}. Must be draft, standard, or high.`);
  }

  return errors;
}

export async function handleCreate(ws, data) {
  try {
    const { form_data = {}, image_path = '', image_url = '' } = data;

    // ===== v1.1: Merge with default values =====
    const completeFormData = {
      // v1.0 fields
      camera_movement: form_data.camera_movement || '',
      shot_type: form_data.shot_type || '',
      lighting: form_data.lighting || '',
      motion_prompt: form_data.motion_prompt || '',
      checkboxes: form_data.checkboxes || {},

      // v1.1 fields (merge with defaults)
      duration: form_data.duration ?? V1_1_DEFAULTS.duration,
      aspect_ratio: form_data.aspect_ratio ?? V1_1_DEFAULTS.aspect_ratio,
      motion_intensity: form_data.motion_intensity ?? V1_1_DEFAULTS.motion_intensity,
      quality_preset: form_data.quality_preset ?? V1_1_DEFAULTS.quality_preset
    };

    // ===== v1.1: Validate fields =====
    const validationErrors = validateV1_1Fields(completeFormData);
    if (validationErrors.length > 0) {
      logger.warn('Invalid v1.1 fields in workspace create', { errors: validationErrors });
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'Invalid form data',
          errors: validationErrors
        }
      }));
      return;
    }

    // 计算新的 order_index
    const maxOrder = await Workspace.findOne().sort({ order_index: -1 });
    const newOrder = (maxOrder?.order_index || 0) + 1;

    const workspace = await Workspace.create({
      order_index: newOrder,
      image_path,
      image_url,
      form_data: completeFormData,
      video: {
        status: 'pending',
        task_id: '',
        url: '',
        error: ''
      },
      ai_collaboration: []
    });

    logger.info('Workspace created with v1.1 fields', {
      workspace_id: workspace._id,
      duration: completeFormData.duration,
      aspect_ratio: completeFormData.aspect_ratio,
      motion_intensity: completeFormData.motion_intensity,
      quality_preset: completeFormData.quality_preset
    });

    ws.send(JSON.stringify({
      type: 'workspace.created',
      data: workspace
    }));
  } catch (error) {
    logger.error('Workspace create failed', { error: error.message, stack: error.stack });
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to create workspace', details: error.message }
    }));
  }
}
