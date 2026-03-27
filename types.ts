
export interface User {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarSeed?: string;
  avatarUrl?: string;
  password?: string;
  role: 'admin' | 'member' | 'user';
  membershipExpires: string; // ISO string
  isPremium?: boolean;
  trialEndsAt?: string; // ISO string
  createdAt: string; // ISO string
  weightLogs: WeightLog[];
  mealLogs?: MealLog[];
  postureLogs?: PostureLog[];
  activityLogs: { date: string }[]; // Array of objects with date property
  heightCm?: number;
  fitnessProfile?: FitnessProfile;
  activePlan?: FitnessPlan;
}

export interface FitnessProfile {
  goal: 'weight-loss' | 'muscle-gain' | 'endurance' | 'flexibility';
  intensity: 'beginner' | 'intermediate' | 'advanced';
  location: 'home' | 'gym' | 'outdoors';
  focusAreas: string[];
}

export interface WeightLog {
  date: string;
  weight: number;
}

export interface MealLog extends MacroData {
  date: string;
}

export interface PostureLog extends PostureAnalysis {
  date: string;
}

export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealName: string;
}

export interface BmiEstimation {
  estimatedHeightCm: number;
  estimatedWeightKg: number;
  bmi: number;
  notes: string;
}

export interface PostureAnalysis {
  score: number; // 0-100
  findings: string[];
  recommendations: string[];
}

export interface FitnessPlan {
  dailyWorkouts: {
    name: string;
    exercises: string[];
    duration: string;
  }[];
  motivation: string;
  generatedAt: string;
}
