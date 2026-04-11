import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateDailyFitnessPlan, 
  analyzeMacros, 
  estimateBmiFromPhoto, 
  checkPosture,
  clearCache 
} from '../services/geminiService';
import type { FitnessProfile, MacroData, BmiEstimation, PostureAnalysis } from '../types';

const mockApiKey = 'test-api-key-123';

const mockProfile: FitnessProfile = {
  goal: 'weight-loss',
  intensity: 'beginner',
  location: 'home',
  focusAreas: ['Core', 'Cardio']
};

const mockBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const mockGoogleGenAI = {
  models: {
    generateContent: vi.fn()
  }
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      return mockGoogleGenAI;
    }
  }
}));

// Mock DOM APIs that compressImage uses
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    drawImage: vi.fn()
  })
});

Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/jpeg;base64,compressed-image-data'
});

Object.defineProperty(window.Image.prototype, 'onload', {
  set: (fn) => setTimeout(fn, 0)
});

Object.defineProperty(window.Image.prototype, 'onerror', {
  set: () => {}
});

describe('geminiService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Reset the mock for each test
    mockGoogleGenAI.models.generateContent.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('generateDailyFitnessPlan', () => {
    it('should generate a workout plan from profile', async () => {
      const mockResponse = {
        text: JSON.stringify({
          motivation: 'Stay strong!',
          dailyWorkouts: [
            { name: 'Morning Cardio', duration: '30 mins', exercises: ['Running', 'Jumping Jacks'] }
          ]
        })
      };
      mockGoogleGenAI.models.generateContent.mockResolvedValue(mockResponse);

      const result = await generateDailyFitnessPlan(70, 175, mockProfile, mockApiKey);

      expect(result).toBeDefined();
      expect(result.dailyWorkouts).toHaveLength(1);
      expect(result.motivation).toBe('Stay strong!');
    });

    it('should throw error when API key is missing', async () => {
      await expect(generateDailyFitnessPlan(70, 175, mockProfile, ''))
        .rejects.toThrow('API Key is missing');
    });

    it('should return cached result on repeated call', async () => {
      const cachedResult = {
        motivation: 'From cache!',
        dailyWorkouts: [] as any,
        generatedAt: new Date().toISOString()
      };
      
      const cacheKey = `workout_70_175_${mockProfile.goal}_${mockProfile.intensity}_${mockProfile.location}_${mockProfile.focusAreas.join(",")}`;
      localStorage.setItem(`ai_cache_${cacheKey}`, JSON.stringify({
        data: cachedResult,
        timestamp: Date.now()
      }));

      const result = await generateDailyFitnessPlan(70, 175, mockProfile, mockApiKey);
      expect(result.motivation).toBe('From cache!');
    });

    it('should deduplicate concurrent requests', async () => {
      const mockResponse = {
        text: JSON.stringify({
          motivation: 'Deduplicated!',
          dailyWorkouts: [] as any,
          generatedAt: new Date().toISOString()
        })
      };
      mockGoogleGenAI.models.generateContent.mockResolvedValue(mockResponse);

      const promise1 = generateDailyFitnessPlan(70, 175, mockProfile, mockApiKey);
      const promise2 = generateDailyFitnessPlan(70, 175, mockProfile, mockApiKey);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeMacros', () => {
    it('should analyze food image and return macro data', async () => {
      const mockResponse = {
        text: JSON.stringify({
          mealName: 'Grilled Chicken Salad',
          calories: 350,
          protein: 30,
          carbs: 20,
          fat: 15
        })
      };
      mockGoogleGenAI.models.generateContent.mockResolvedValue(mockResponse);

      const result = await analyzeMacros(mockBase64Image, mockApiKey);

      expect(result.calories).toBe(350);
      expect(result.protein).toBe(30);
      expect(result.carbs).toBe(20);
      expect(result.fat).toBe(15);
    });

    it('should return cached macro result', async () => {
      const cachedResult: MacroData = {
        mealName: 'Cached Meal',
        calories: 500,
        protein: 40,
        carbs: 30,
        fat: 20
      };
      
      const cacheKey = 'macros_' + mockBase64Image.substring(0, 50);
      localStorage.setItem(`ai_cache_${cacheKey}`, JSON.stringify({
        data: cachedResult,
        timestamp: Date.now()
      }));

      const result = await analyzeMacros(mockBase64Image, mockApiKey);
      expect(result.mealName).toBe('Cached Meal');
    });
  });

  describe('estimateBmiFromPhoto', () => {
    it('should estimate BMI from body photo', async () => {
      const mockResponse = {
        text: JSON.stringify({
          estimatedHeightCm: 175,
          estimatedWeightKg: 70,
          bmi: 22.9,
          notes: 'Athletic build'
        })
      };
      mockGoogleGenAI.models.generateContent.mockResolvedValue(mockResponse);

      const result = await estimateBmiFromPhoto(mockBase64Image, mockApiKey);

      expect(result.bmi).toBe(22.9);
      expect(result.estimatedHeightCm).toBe(175);
    });
  });

  describe('checkPosture', () => {
    it('should analyze posture and return score', async () => {
      const mockResponse = {
        text: JSON.stringify({
          score: 85,
          findings: ['Good shoulder alignment', 'Slight forward head'],
          recommendations: ['Chin tucks', 'Shoulder blade squeeze']
        })
      };
      mockGoogleGenAI.models.generateContent.mockResolvedValue(mockResponse);

      const result = await checkPosture(mockBase64Image, mockApiKey);

      expect(result.score).toBe(85);
      expect(result.findings).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
    });

    it('should return valid score range 0-100', async () => {
      for (let i = 0; i < 5; i++) {
        const mockResponse = {
          text: JSON.stringify({
            score: Math.floor(Math.random() * 100),
            findings: ['Test'],
            recommendations: ['Test']
          })
        };
        mockGoogleGenAI.models.generateContent.mockResolvedValue(mockResponse);

        const result = await checkPosture(mockBase64Image + i, mockApiKey);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entries', () => {
      localStorage.setItem('ai_cache_workout_test', JSON.stringify({ data: {}, timestamp: Date.now() }));
      localStorage.setItem('ai_cache_macros_test', JSON.stringify({ data: {}, timestamp: Date.now() }));
      localStorage.setItem('other_key', 'should not be cleared');

      clearCache();

      expect(localStorage.getItem('ai_cache_workout_test')).toBeNull();
      expect(localStorage.getItem('ai_cache_macros_test')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('should not be cleared');
    });
  });
});