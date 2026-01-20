import { Workspace } from '../db/mongodb.js';
import logger from '../utils/logger.js';

/**
 * v1.2: Allowed form_data fields (including v1.0, v1.1, and v1.2 fields)
 */
const ALLOWED_FORM_FIELDS = [
  // v1.0 fields
  'camera_movement',
  'shot_type',
  'lighting',
  'motion_prompt',
  'checkboxes',
  // v1.1 fields
  'duration',
  'aspect_ratio',
  'motion_intensity',
  'quality_preset',
  // v1.2 fields
  'angle',
  'frame_rate'
];

/**
 * v1.1: Validate v1.1 fields (partial update)
 */
function validateV1_1FieldsPartial(formData) {
  const errors = [];

  // Only validate fields that are present
  if ('duration' in formData && ![5, 10, 15].includes(formData.duration)) {
    errors.push(`Invalid duration: ${formData.duration}. Must be 5, 10, or 15.`);
  }

  if ('aspect_ratio' in formData && !['16:9', '9:16', '1:1', '4:3'].includes(formData.aspect_ratio)) {
    errors.push(`Invalid aspect_ratio: ${formData.aspect_ratio}. Must be 16:9, 9:16, 1:1, or 4:3.`);
  }

  if ('motion_intensity' in formData) {
    if (typeof formData.motion_intensity !== 'number' || formData.motion_intensity < 1 || formData.motion_intensity > 5) {
      errors.push(`Invalid motion_intensity: ${formData.motion_intensity}. Must be between 1 and 5.`);
    }
  }

  if ('quality_preset' in formData && !['draft', 'standard', 'high'].includes(formData.quality_preset)) {
    errors.push(`Invalid quality_preset: ${formData.quality_preset}. Must be draft, standard, or high.`);
  }

  return errors;
}

export async function handleUpdate(ws, data) {
  try {
    const { workspace_id, updates } = data;

    logger.debug(`收到更新请求: workspace_id=${workspace_id}`);
    logger.debug(`更新内容: ${JSON.stringify(updates, null, 2)}`);

    if (!workspace_id) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'workspace_id is required' }
      }));
      return;
    }

    const workspace = await Workspace.findById(workspace_id);
    if (!workspace) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Workspace not found' }
      }));
      return;
    }

    // ===== v1.1: Handle form_data incremental updates =====
    if (updates.form_data) {
      // Validate v1.1 fields
      const validationErrors = validateV1_1FieldsPartial(updates.form_data);
      if (validationErrors.length > 0) {
        logger.warn('Invalid v1.1 fields in workspace update', {
          workspace_id,
          errors: validationErrors
        });
        ws.send(JSON.stringify({
          type: 'error',
          data: {
            message: 'Invalid form data',
            errors: validationErrors
          }
        }));
        return;
      }

      // Incremental update: only update provided fields
      for (const [key, value] of Object.entries(updates.form_data)) {
        if (ALLOWED_FORM_FIELDS.includes(key)) {
          workspace.form_data[key] = value;
        }
      }

      workspace.markModified('form_data');
    }

    // Update other fields
    if (updates.image_path !== undefined) workspace.image_path = updates.image_path;
    if (updates.image_url !== undefined) workspace.image_url = updates.image_url;
    if (updates.video !== undefined) {
      workspace.video = { ...workspace.video, ...updates.video };
      workspace.markModified('video');
    }

    // Handle deleted field (soft delete functionality)
    if (updates.deleted !== undefined) {
      workspace.deleted = { ...workspace.deleted, ...updates.deleted };
      workspace.markModified('deleted');
    }

    // Handle order_index field (for reordering and restore)
    if (updates.order_index !== undefined) {
      workspace.order_index = updates.order_index;
    }

    workspace.updated_at = new Date();
    await workspace.save();

    logger.info('Workspace updated', {
      workspace_id,
      updated_fields: Object.keys(updates.form_data || {})
    });

    ws.send(JSON.stringify({
      type: 'workspace.sync_confirm',
      workspace_id,
      data: workspace.toObject()
    }));
  } catch (error) {
    logger.error('Workspace update failed', { error: error.message, stack: error.stack });
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to update workspace', details: error.message }
    }));
  }
}
