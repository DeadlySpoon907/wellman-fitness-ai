import { User } from '../types';

export const sanitizeUserForSave = (user: User): User => {
  const sanitized = { ...user };

  // Ensure arrays are initialized to prevent runtime errors
  sanitized.weightLogs = Array.isArray(sanitized.weightLogs) ? sanitized.weightLogs : [];
  sanitized.activityLogs = Array.isArray(sanitized.activityLogs) ? sanitized.activityLogs : [];
  sanitized.mealLogs = Array.isArray(sanitized.mealLogs) ? sanitized.mealLogs : [];
  sanitized.postureLogs = Array.isArray(sanitized.postureLogs) ? sanitized.postureLogs : [];

  // Ensure optional strings are defined - but don't send empty strings to Django
  sanitized.displayName = sanitized.displayName || '';
  sanitized.bio = sanitized.bio || '';
  // Remove avatarUrl if it's empty to avoid Django "This field may not be blank" error
  if (!sanitized.avatarUrl || sanitized.avatarUrl.trim() === '') {
    delete sanitized.avatarUrl;
  }
  sanitized.avatarSeed = sanitized.avatarSeed || sanitized.id;

  // Ensure numeric fields that cannot be null have a default
  // Fixes: "heightCm": ["This field may not be null."]
  sanitized.heightCm = (sanitized.heightCm === null || sanitized.heightCm === undefined) ? 0 : sanitized.heightCm;

  // Handle activePlan: allow null to clear the active plan
  // Only remove if undefined; null is a valid value to indicate deletion.
  if (sanitized.activePlan === undefined) {
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