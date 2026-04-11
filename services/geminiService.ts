import { GoogleGenAI } from "@google/genai";
import { FitnessProfile, MacroData, BmiEstimation, PostureAnalysis } from "../types";

const MODEL_ID = "gemini-2.0-flash-exp";

const CACHE_TTL = 15 * 60 * 1000;
const MAX_CONCURRENT_REQUESTS = 1;
const REQUEST_DELAY = 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const pendingRequests = new Map<string, Promise<any>>();

const getClient = (apiKey?: string) => {
  const key = apiKey || import.meta.env.VITE_API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please provide it in the settings or environment variables.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getCacheKey = (prefix: string, params: string): string => {
  return `${prefix}_${params}`;
};

const getFromCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`ai_cache_${key}`);
    if (!cached) return null;
    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`ai_cache_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const setCache = <T>(key: string, data: T): void => {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`ai_cache_${key}`, JSON.stringify(entry));
  } catch {}
};

const compressImage = async (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
};

let lastRequestTime = 0;
const rateLimitedRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY) {
    await new Promise(r => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
  return fn();
};

export const generateDailyFitnessPlan = async (
  weight: number,
  height: number,
  profile: FitnessProfile,
  apiKey?: string
): Promise<any> => {
  const cacheKey = getCacheKey("workout", `${weight}_${height}_${profile.goal}_${profile.intensity}_${profile.location}_${profile.focusAreas.join(",")}`);
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  const requestKey = `workout_${cacheKey}`;
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = rateLimitedRequest(async () => {
    const client = getClient(apiKey);
    const prompt = `
      Act as an expert fitness coach. Create a daily workout plan for a user with:
      Weight: ${weight}kg
      Height: ${height}cm
      Goal: ${profile.goal}
      Level: ${profile.intensity}
      Location: ${profile.location}
      Focus: ${profile.focusAreas.join(', ')}

      Return ONLY valid JSON with this structure:
      {
        "motivation": "string (short motivational quote)",
        "generatedAt": "${new Date().toISOString()}",
        "dailyWorkouts": [
          {
            "name": "string (e.g., Morning Cardio)",
            "duration": "string (e.g., 30 mins)",
            "exercises": ["string", "string"]
          }
        ]
      }
    `;

    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(cleanJson(text));
    setCache(cacheKey, result);
    return result;
  });

  pendingRequests.set(requestKey, promise);
  return promise.finally(() => pendingRequests.delete(requestKey));
};

export const analyzeMacros = async (base64Image: string, apiKey?: string): Promise<MacroData> => {
  const imageHash = base64Image.substring(0, 50);
  const cacheKey = getCacheKey("macros", imageHash);
  const cached = getFromCache<MacroData>(cacheKey);
  if (cached) return cached;

  const requestKey = `macros_${imageHash}`;
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = rateLimitedRequest(async () => {
    const client = getClient(apiKey);
    const compressedImage = await compressImage(base64Image);
    
    const prompt = `
      Analyze this food image. Estimate the nutritional content.
      Return ONLY valid JSON:
      {
        "mealName": "string (short descriptive name)",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      }
    `;

    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: compressedImage } }
        ]
      }]
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(cleanJson(text));
    setCache(cacheKey, result);
    return result;
  });

  pendingRequests.set(requestKey, promise);
  return promise.finally(() => pendingRequests.delete(requestKey));
};

export const estimateBmiFromPhoto = async (base64Image: string, apiKey?: string): Promise<BmiEstimation> => {
  const imageHash = base64Image.substring(0, 50);
  const cacheKey = getCacheKey("bmi", imageHash);
  const cached = getFromCache<BmiEstimation>(cacheKey);
  if (cached) return cached;

  const requestKey = `bmi_${imageHash}`;
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = rateLimitedRequest(async () => {
    const client = getClient(apiKey);
    const compressedImage = await compressImage(base64Image);
    
    const prompt = `
      Analyze this full body photo to estimate body metrics using computer vision principles.
      Return ONLY valid JSON:
      {
        "estimatedHeightCm": number,
        "estimatedWeightKg": number,
        "bmi": number,
        "notes": "string (brief observation about body composition)"
      }
    `;

    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: compressedImage } }
        ]
      }]
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(cleanJson(text));
    setCache(cacheKey, result);
    return result;
  });

  pendingRequests.set(requestKey, promise);
  return promise.finally(() => pendingRequests.delete(requestKey));
};

export const checkPosture = async (base64Image: string, apiKey?: string): Promise<PostureAnalysis> => {
  const imageHash = base64Image.substring(0, 50);
  const cacheKey = getCacheKey("posture", imageHash);
  const cached = getFromCache<PostureAnalysis>(cacheKey);
  if (cached) return cached;

  const requestKey = `posture_${imageHash}`;
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = rateLimitedRequest(async () => {
    const client = getClient(apiKey);
    const compressedImage = await compressImage(base64Image);
    
    const prompt = `
      Analyze this posture photo (side or front view). Identify alignment issues.
      Return ONLY valid JSON:
      {
        "score": number (0-100, where 100 is perfect),
        "findings": ["string", "string"],
        "recommendations": ["string", "string"]
      }
    `;

    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: compressedImage } }
        ]
      }]
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(cleanJson(text));
    setCache(cacheKey, result);
    return result;
  });

  pendingRequests.set(requestKey, promise);
  return promise.finally(() => pendingRequests.delete(requestKey));
};

export const clearCache = (): void => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("ai_cache_")) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
};