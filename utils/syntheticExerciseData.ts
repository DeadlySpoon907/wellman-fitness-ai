/**
 * Synthetic Exercise Data Generator
 * Utilities for exercise model training & evaluation.
 * NOTE: Training script reads templates from data/exercise_model.json directly.
 */

export interface ExerciseSample {
  features: Record<string, number>;
  label: string;
}

// Feature keys in fixed order (matches template JSON)
export const FEATURE_KEYS = [
  'shoulder_width', 'shoulder_level', 'hip_width', 'hip_level',
  'torso_length', 'leg_length', 'body_center_x', 'body_center_y',
  'left_arm_ext', 'left_arm_height', 'right_arm_ext', 'right_arm_height'
] as const;

export type FeatureName = typeof FEATURE_KEYS[number];

export function getFeatureKeys(): string[] {
  return [...FEATURE_KEYS];
}

// Convert feature Record → array in canonical order
export function featuresToArray(features: Record<string, number>): number[] {
  return FEATURE_KEYS.map(k => features[k] ?? 0);
}

// One-hot encode label given class list
export function labelToOneHot(label: string, classNames: string[]): number[] {
  const idx = classNames.indexOf(label);
  const vec = new Array(classNames.length).fill(0);
  if (idx >= 0) vec[idx] = 1;
  return vec;
}
