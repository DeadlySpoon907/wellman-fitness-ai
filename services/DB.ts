
import { User, GymLog } from '../types';
import { sanitizeUserForSave } from '../utils/userHelpers';

// Get API URL from environment variable - must be set in Vercel!
// Format: https://wellman-backend-production.up.railway.app (no /api suffix)
// FIX: Use .trim() to remove any accidental leading/trailing whitespace in the env var
const envApiUrl = import.meta.env.VITE_API_BASE_URL;

// Ensure we always use a full URL (not relative path)
let API_URL: string;
if (envApiUrl) {
  const trimmedUrl = envApiUrl.trim();
  // Check if it's a full URL (starts with http:// or https://)
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    API_URL = trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
  } else {
    // If not a full URL, prepend https:// and ensure it's not a relative path
    API_URL = `https://${trimmedUrl}/api`;
  }
} else {
  // Default to wellman-backend-production for Railway (the correct domain)
  API_URL = 'https://wellman-backend-production.up.railway.app/api';
}

// Remove any double /api/api patterns
API_URL = API_URL.replace('/api/api', '/api');

// DEBUG: Log the API_URL configuration - works in ALL environments (dev and production)
console.log(`[DB] Using Railway Backend: ${API_URL}`);
console.log(`[DB] Connected to PostgreSQL: nozomi.proxy.rlwy.net:26805`);
console.log('[DB] Mode:', import.meta.env.DEV ? 'Development' : 'Production');

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      // Flatten Django DRF errors into a single string
      const errorMsg = Object.entries(json)
        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
        .join('\n');
      throw new Error(errorMsg || response.statusText);
    } catch (e) {
      throw new Error(text || response.statusText);
    }
  }
  // Handle non-JSON responses gracefully
  const text = await response.text();
  if (!text.trim()) {
    return {} as any;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    // Log first 200 chars of response for debugging
    const preview = text.substring(0, 200);
    console.error('Non-JSON response received:', preview);
    throw new Error(`Invalid JSON response from server. Received: ${preview}...`);
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  const url = `${API_URL}/users/`;
  
  // DEBUG: Log the full URL being used - works in ALL environments
  console.log('[DB] getAllUsers - Full URL:', url);
  
  try {
    const response = await fetch(url);
    
    // DEBUG: Log response status
    console.log('[DB] getAllUsers - Response status:', response.status);
    console.log('[DB] getAllUsers - Response ok:', response.ok);
    
    const data = await handleResponse(response);
    
    // DEBUG: Log the number of users returned
    console.log('[DB] getAllUsers - Users count:', data?.length ?? 0);
    console.log('[DB] getAllUsers - Response data:', JSON.stringify(data).substring(0, 200));
    
    if (!data || data.length === 0) {
      console.warn('[DB] WARNING: No users returned from API!');
      console.warn('[DB] Possible causes:');
      console.warn('  1. Database is empty (no seed data)');
      console.warn('  2. Wrong API URL - check VITE_API_BASE_URL in Vercel Dashboard');
      console.warn('  3. CORS blocking the request');
      console.warn('  4. Network error - check browser console for details');
    }
    
    return data;
  } catch (error) {
    console.error('[DB] getAllUsers - ERROR:', error);
    console.error('[DB] getAllUsers - Error message:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const getUser = async (id: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_URL}/users/${id}/`);
    if (response.status === 404) return null;
    return await handleResponse(response);
  } catch (error) {
    console.error("getUser error:", error);
    return null;
  }
};

export const saveUser = async (user: User): Promise<User> => {
  // FIX: Sanitize data and use PATCH to allow partial updates (e.g. missing password)
  const sanitized = sanitizeUserForSave(user);

  // Ensure critical fields are preserved if they exist in the input
  // This handles cases where sanitizeUserForSave might strip them (e.g. password for security, or avatarUrl)
  if (user.password) {
    (sanitized as any).password = user.password;
  }
  if (user.avatarUrl) {
    (sanitized as any).avatarUrl = user.avatarUrl;
  }
  // Preserve original username to avoid validation errors
  if (user.username) {
    (sanitized as any).username = user.username;
  }

  // Preserve metrics and logs that might be stripped by sanitization
  if (user.weightLogs) (sanitized as any).weightLogs = user.weightLogs;
  if (user.activityLogs) (sanitized as any).activityLogs = user.activityLogs;
  if (user.mealLogs) (sanitized as any).mealLogs = user.mealLogs;
  if (user.postureLogs) (sanitized as any).postureLogs = user.postureLogs;
  if (user.fitnessProfile) (sanitized as any).fitnessProfile = user.fitnessProfile;
  if (user.activePlan) (sanitized as any).activePlan = user.activePlan;
  
  const response = await fetch(`${API_URL}/users/${user.id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized)
  });
  return handleResponse(response);
};

export const deleteUser = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/users/${id}/`, { method: 'DELETE' });
};

export const findUser = async (username: string): Promise<User | null> => {
  // Fallback search if no dedicated search endpoint exists
  const users = await getAllUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
};

export const registerUser = async (username: string, password?: string, email?: string): Promise<User> => {
  // Use dedicated registration endpoint
  const response = await fetch(`${API_URL}/users/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username, 
      password: password || 'password123',
      email: email || '',
      role: 'user'
    })
  });
  return handleResponse(response);
};

export const loginUser = async (username: string, password: string): Promise<User> => {
  console.log(`[DB] loginUser - Attempting login for: ${username}`);

  const response = await fetch(`${API_URL}/users/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  return handleResponse(response);
};

export const logWeight = async (userId: string, weight: number): Promise<void> => {
  const user = await getUser(userId);
  if (!user) return;
  
  const logs = user.weightLogs || [];
  logs.push({ date: new Date().toISOString(), weight });
  
  // saveUser will handle sanitization
  await saveUser({ ...user, weightLogs: logs });
};

export const recordActivity = async (userId: string): Promise<void> => {
  const user = await getUser(userId);
  if (!user) return;
  
  const today = new Date().toISOString().split('T')[0];
  const logs: any[] = user.activityLogs || [];
  
  const hasLoggedToday = logs.some((log: any) => {
    const logDate = typeof log === 'string' ? log : log.date;
    return logDate && logDate.startsWith(today);
  });

  if (!hasLoggedToday) {
    logs.push({ date: new Date().toISOString() });
    await saveUser({ ...user, activityLogs: logs });
  }
};

export const getAllGymLogs = async (): Promise<GymLog[]> => {
  const response = await fetch(`${API_URL}/gym-logs/`);
  return handleResponse(response);
};

export const getActiveGymLogs = async (): Promise<GymLog[]> => {
  const response = await fetch(`${API_URL}/gym-logs/active/`);
  return handleResponse(response);
};

// Runtime DB status check for gym logs table (useful for verifying which DB/backend is active)
export const getGymLogsDbStatus = async (): Promise<any> => {
  const url = `${API_URL}/gym-logs/db_status/`;
  console.log('[DB] getGymLogsDbStatus - Full URL:', url);
  try {
    const response = await fetch(url);
    console.log('[DB] getGymLogsDbStatus - Response status:', response.status);
    return handleResponse(response);
  } catch (error) {
    console.error('[DB] getGymLogsDbStatus - ERROR:', error);
    throw error;
  }
};

export const timeInUser = async (userId: string, _username: string): Promise<GymLog> => {
  const response = await fetch(`${API_URL}/gym-logs/time_in/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  return handleResponse(response);
};

export const timeOutUser = async (userId: string): Promise<GymLog> => {
  const response = await fetch(`${API_URL}/gym-logs/time_out/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  return handleResponse(response);
};

export const getUserGymLogs = async (userId: string): Promise<GymLog[]> => {
  const allLogs = await getAllGymLogs();
  return allLogs.filter(log => log.userId === userId || log.user === userId);
};

export const logWorkout = async (userId: string, workoutName: string, duration: string, exercises: string[], date?: string): Promise<any> => {
  const response = await fetch(`${API_URL}/users/${userId}/log_workout/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: date || new Date().toISOString().split('T')[0],
      workoutName,
      duration,
      exercises
    })
  });
  return handleResponse(response);
};

export const logMeal = async (userId: string, mealName: string, calories: number, protein: number, carbs: number, fat: number, date?: string): Promise<any> => {
  const response = await fetch(`${API_URL}/users/${userId}/log_meal/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: date || new Date().toISOString().split('T')[0],
      mealName,
      calories,
      protein,
      carbs,
      fat
    })
  });
  return handleResponse(response);
};
