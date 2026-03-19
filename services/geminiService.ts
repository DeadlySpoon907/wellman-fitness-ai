import { GoogleGenAI } from "@google/genai";
import { FitnessProfile, MacroData, BmiEstimation, PostureAnalysis } from "../types";

const MODEL_ID = "gemini-3-flash-preview";

// Helper to initialize the AI client with the provided key or environment variable
const getClient = (apiKey?: string) => {
  const key = apiKey || (import.meta as any).env.VITE_API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please provide it in the settings or environment variables.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to clean Markdown code blocks from JSON responses
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const generateDailyFitnessPlan = async (
  weight: number, 
  height: number, 
  profile: FitnessProfile,
  apiKey?: string
): Promise<any> => {
  const client = getClient(apiKey);
  
  const prompt = `
    Act as an expert fitness coach. Create a daily workout plan for a user with:
    Weight: ${weight}kg
    Height: cm
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
  
  const text = response.response.text();
  if (!text) throw new Error("No response from AI");
  return JSON.parse(cleanJson(text));
};

export const analyzeMacros = async (base64Image: string, apiKey?: string): Promise<MacroData> => {
  const client = getClient(apiKey);
  
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
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }]
  });

  const text = response.response.text();
  if (!text) throw new Error("No response from AI");
  return JSON.parse(cleanJson(text));
};

export const estimateBmiFromPhoto = async (base64Image: string, apiKey?: string): Promise<BmiEstimation> => {
  const client = getClient(apiKey);
  
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
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }]
  });

  const text = response.response.text();
  if (!text) throw new Error("No response from AI");
  return JSON.parse(cleanJson(text));
};

export const checkPosture = async (base64Image: string, apiKey?: string): Promise<PostureAnalysis> => {
  const client = getClient(apiKey);
  
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
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }]
  });

  const text = response.response.text();
  if (!text) throw new Error("No response from AI");
  return JSON.parse(cleanJson(text));
};
