import { User } from '../types';

export const sanitizeUserForSave = (user: User): User => {
  const sanitized = { ...user };

  // Ensure arrays are initialized to prevent runtime errors
  sanitized.weightLogs = Array.isArray(sanitized.weightLogs) ? sanitized.weightLogs : [];
  sanitized.activityLogs = Array.isArray(sanitized.activityLogs) ? sanitized.activityLogs : [];
  sanitized.mealLogs = Array.isArray(sanitized.mealLogs) ? sanitized.mealLogs : [];
  sanitized.postureLogs = Array.isArray(sanitized.postureLogs) ? sanitized.postureLogs : [];

  // Ensure optional strings are defined
  sanitized.displayName = sanitized.displayName || '';
  sanitized.bio = sanitized.bio || '';
  sanitized.avatarUrl = sanitized.avatarUrl || '';
  sanitized.avatarSeed = sanitized.avatarSeed || sanitized.id;

  // Ensure numeric fields that cannot be null have a default
  // Fixes: "heightCm": ["This field may not be null."]
  sanitized.heightCm = (sanitized.heightCm === null || sanitized.heightCm === undefined) ? 0 : sanitized.heightCm;

  // Handle activePlan
  // Fixes: "activePlan": ["This field may not be null."]
  // If it's null/undefined, remove it so it's not sent as null.
  if (!sanitized.activePlan) {
    delete sanitized.activePlan;
  }

  // Handle fitnessProfile
  // Fixes: "fitnessProfile": ["This field may not be null."]
  // If it's null/undefined, remove it so it's not sent as null.
  if (!sanitized.fitnessProfile) {
    delete sanitized.fitnessProfile;
  }

  // Remove password if it's empty/null/undefined to prevent validation errors
  if (!sanitized.password) {
    delete sanitized.password;
  }

  return sanitized;
};