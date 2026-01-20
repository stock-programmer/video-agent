import { describe, test, expect } from 'vitest';
import {
  VideoFormData,
  Duration,
  AspectRatio,
  MotionIntensity,
  QualityPreset,
  DURATION_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  MOTION_INTENSITY_LEVELS,
  QUALITY_PRESET_OPTIONS,
  isValidDuration,
  isValidAspectRatio,
  isValidMotionIntensity,
  isValidQualityPreset,
  validateV1_1FormData,
  applyV1_1Defaults,
  DEFAULT_V1_1_FORM_DATA
} from './workspace';

describe('v1.1 Type Definitions', () => {
  describe('Type Guards', () => {
    test('isValidDuration - valid values', () => {
      expect(isValidDuration(5)).toBe(true);
      expect(isValidDuration(10)).toBe(true);
      expect(isValidDuration(15)).toBe(true);
    });

    test('isValidDuration - invalid values', () => {
      expect(isValidDuration(4)).toBe(false);
      expect(isValidDuration(20)).toBe(false);
      expect(isValidDuration('5')).toBe(false);
      expect(isValidDuration(null)).toBe(false);
      expect(isValidDuration(undefined)).toBe(false);
    });

    test('isValidAspectRatio - valid values', () => {
      expect(isValidAspectRatio('16:9')).toBe(true);
      expect(isValidAspectRatio('9:16')).toBe(true);
      expect(isValidAspectRatio('1:1')).toBe(true);
      expect(isValidAspectRatio('4:3')).toBe(true);
    });

    test('isValidAspectRatio - invalid values', () => {
      expect(isValidAspectRatio('21:9')).toBe(false);
      expect(isValidAspectRatio('16:10')).toBe(false);
      expect(isValidAspectRatio(169)).toBe(false);
      expect(isValidAspectRatio(null)).toBe(false);
    });

    test('isValidMotionIntensity - valid values', () => {
      expect(isValidMotionIntensity(1)).toBe(true);
      expect(isValidMotionIntensity(2)).toBe(true);
      expect(isValidMotionIntensity(3)).toBe(true);
      expect(isValidMotionIntensity(4)).toBe(true);
      expect(isValidMotionIntensity(5)).toBe(true);
    });

    test('isValidMotionIntensity - invalid values', () => {
      expect(isValidMotionIntensity(0)).toBe(false);
      expect(isValidMotionIntensity(6)).toBe(false);
      expect(isValidMotionIntensity(3.5)).toBe(false);
      expect(isValidMotionIntensity('3')).toBe(false);
    });

    test('isValidQualityPreset - valid values', () => {
      expect(isValidQualityPreset('draft')).toBe(true);
      expect(isValidQualityPreset('standard')).toBe(true);
      expect(isValidQualityPreset('high')).toBe(true);
    });

    test('isValidQualityPreset - invalid values', () => {
      expect(isValidQualityPreset('ultra')).toBe(false);
      expect(isValidQualityPreset('low')).toBe(false);
      expect(isValidQualityPreset('')).toBe(false);
    });
  });

  describe('Validation', () => {
    test('validateV1_1FormData - all valid data', () => {
      const result = validateV1_1FormData({
        duration: 10,
        aspect_ratio: '16:9',
        motion_intensity: 3,
        quality_preset: 'standard'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateV1_1FormData - valid partial data', () => {
      const result = validateV1_1FormData({
        duration: 5,
        aspect_ratio: '9:16'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateV1_1FormData - invalid duration', () => {
      const result = validateV1_1FormData({
        duration: 20
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid duration');
      expect(result.errors[0]).toContain('20');
    });

    test('validateV1_1FormData - invalid aspect ratio', () => {
      const result = validateV1_1FormData({
        aspect_ratio: '21:9' as AspectRatio
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid aspect_ratio');
    });

    test('validateV1_1FormData - invalid motion intensity', () => {
      const result = validateV1_1FormData({
        motion_intensity: 10
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid motion_intensity');
    });

    test('validateV1_1FormData - invalid quality preset', () => {
      const result = validateV1_1FormData({
        quality_preset: 'ultra' as QualityPreset
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid quality_preset');
    });

    test('validateV1_1FormData - multiple errors', () => {
      const result = validateV1_1FormData({
        duration: 100,
        aspect_ratio: '21:9' as AspectRatio,
        motion_intensity: 0,
        quality_preset: 'ultra' as QualityPreset
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });

    test('validateV1_1FormData - empty data is valid', () => {
      const result = validateV1_1FormData({});

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Defaults', () => {
    test('applyV1_1Defaults - fills missing v1.1 fields', () => {
      const oldData: Partial<VideoFormData> = {
        camera_movement: 'push',
        motion_prompt: 'test'
      };

      const result = applyV1_1Defaults(oldData);

      expect(result.duration).toBe(5);
      expect(result.aspect_ratio).toBe('16:9');
      expect(result.motion_intensity).toBe(3);
      expect(result.quality_preset).toBe('standard');
      expect(result.camera_movement).toBe('push');
      expect(result.motion_prompt).toBe('test');
    });

    test('applyV1_1Defaults - preserves existing v1.1 values', () => {
      const existingData: Partial<VideoFormData> = {
        duration: 15,
        aspect_ratio: '9:16',
        motion_intensity: 5,
        quality_preset: 'high'
      };

      const result = applyV1_1Defaults(existingData);

      expect(result.duration).toBe(15);
      expect(result.aspect_ratio).toBe('9:16');
      expect(result.motion_intensity).toBe(5);
      expect(result.quality_preset).toBe('high');
    });

    test('applyV1_1Defaults - handles empty data', () => {
      const result = applyV1_1Defaults({});

      expect(result.duration).toBe(DEFAULT_V1_1_FORM_DATA.duration);
      expect(result.aspect_ratio).toBe(DEFAULT_V1_1_FORM_DATA.aspect_ratio);
      expect(result.motion_intensity).toBe(DEFAULT_V1_1_FORM_DATA.motion_intensity);
      expect(result.quality_preset).toBe(DEFAULT_V1_1_FORM_DATA.quality_preset);
      expect(result.camera_movement).toBe('');
      expect(result.shot_type).toBe('');
      expect(result.lighting).toBe('');
      expect(result.motion_prompt).toBe('');
    });

    test('applyV1_1Defaults - handles zero values correctly', () => {
      // duration: 0 should be replaced with default (5)
      // motion_intensity: 0 is invalid, but function doesn't validate, just applies defaults
      const result = applyV1_1Defaults({
        duration: 0
      });

      // ?? operator: 0 is falsy but should be preserved
      // Actually, 0 is not in DURATION_OPTIONS, but the function doesn't validate
      // The function uses ?? which preserves 0
      expect(result.duration).toBe(0);
    });
  });

  describe('Constants', () => {
    test('DURATION_OPTIONS contains correct values', () => {
      expect(DURATION_OPTIONS).toEqual([5, 10, 15]);
    });

    test('ASPECT_RATIO_OPTIONS contains correct values', () => {
      expect(ASPECT_RATIO_OPTIONS).toEqual(['16:9', '9:16', '1:1', '4:3']);
    });

    test('MOTION_INTENSITY_LEVELS contains correct values', () => {
      expect(MOTION_INTENSITY_LEVELS).toEqual([1, 2, 3, 4, 5]);
    });

    test('QUALITY_PRESET_OPTIONS contains correct values', () => {
      expect(QUALITY_PRESET_OPTIONS).toEqual(['draft', 'standard', 'high']);
    });

    test('DEFAULT_V1_1_FORM_DATA has correct default values', () => {
      expect(DEFAULT_V1_1_FORM_DATA.duration).toBe(5);
      expect(DEFAULT_V1_1_FORM_DATA.aspect_ratio).toBe('16:9');
      expect(DEFAULT_V1_1_FORM_DATA.motion_intensity).toBe(3);
      expect(DEFAULT_V1_1_FORM_DATA.quality_preset).toBe('standard');
    });
  });

  describe('Type Compatibility', () => {
    test('Duration type accepts valid values', () => {
      const validDurations: Duration[] = [5, 10, 15];
      expect(validDurations).toHaveLength(3);
    });

    test('AspectRatio type accepts valid values', () => {
      const validRatios: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3'];
      expect(validRatios).toHaveLength(4);
    });

    test('MotionIntensity type accepts valid values', () => {
      const validIntensities: MotionIntensity[] = [1, 2, 3, 4, 5];
      expect(validIntensities).toHaveLength(5);
    });

    test('QualityPreset type accepts valid values', () => {
      const validPresets: QualityPreset[] = ['draft', 'standard', 'high'];
      expect(validPresets).toHaveLength(3);
    });

    test('VideoFormData interface includes all fields', () => {
      const formData: VideoFormData = {
        // v1.0 fields
        camera_movement: 'push',
        shot_type: 'wide',
        lighting: 'natural',
        motion_prompt: 'test',
        checkboxes: { test: true },
        // v1.1 fields
        duration: 10,
        aspect_ratio: '16:9',
        motion_intensity: 3,
        quality_preset: 'standard'
      };

      expect(formData).toBeDefined();
      expect(formData.duration).toBe(10);
    });
  });
});
