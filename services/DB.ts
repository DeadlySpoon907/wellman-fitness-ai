
import { User } from '../types';
import { sanitizeUserForSave } from '../utils/userHelpers';

// Get API URL from environment variable - must be set in Vercel!
// Format: https://wellman-fitness-ai-production.up.railway.app (no /api suffix)
// FIX: Use .trim() to remove any accidental leading/trailing whitespace in the env var
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
const API_URL = envApiUrl ? `${envApiUrl.trim()}/api`.replace('//api/api', '/api') : 'http://localhost:8000/api';

// Debug log in development only
if (import.meta.env.DEV) {
  console.log('[DB] API_URL:', API_URL);
}

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
  return response.json();
};

export const getAllUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users/`);
  return handleResponse(response);
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

export const registerUser = async (username: string, password?: string): Promise<User> => {
  const response = await fetch(`${API_URL}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username, 
      password: password || 'password123',
      weightLogs: [],
      activityLogs: [],
      mealLogs: [],
      postureLogs: [],
      role: 'user',
      membershipExpires: new Date().toISOString()
    })
  });
  return handleResponse(response);
};

export const loginUser = async (username: string, password: string): Promise<User> => {
  // 1. Try dedicated login endpoint
  try {
    const response = await fetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (response.ok) return response.json();
  } catch (e) {
    // Fallback to manual check
  }

  // 2. Fallback: Find user and verify (Prototype/Dev only)
  const user = await findUser(username);
  if (!user) throw new Error("User not found");
  
  // Note: This relies on the backend returning the password, which is insecure but common in prototypes.
  if (user.password && user.password !== password) {
     throw new Error("Invalid credentials");
  }
  return user;
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
