
export interface User {
  id: string;
  username: string;
  email?: string;
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
  estimatedBodyType?: string;
  fitnessProfile?: FitnessProfile;
  activePlan?: FitnessPlan;
  gymLogs?: GymLog[];
}

export interface GymLog {
  id: string;
  user: string;
  userId?: string;
  username: string;
  time_in: string;
  time_out?: string;
  date: string;
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
  bodyType: string;
  notes: string;
}

export interface PostureAnalysis {
  score: number; // 0-100
  findings: string[];
  recommendations: string[];
}

export interface FitnessPlan {
  motivation: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  nutrition?: {
    protein: string;
    carbs: string;
    fats: string;
  };
  sessions: PlanSession[];
}

export interface PlanSession {
  id: string;
  day: number; // 1-30
  week: number; // 1-4
  dayOfWeek: string;
  title: string;
  focus: string;
  exercises: PlannedExercise[];
  duration: string;
  completed: boolean;
  completedAt?: string;
}

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

// Pose tracking types
export type ExerciseType = 'bicep_curl' | 'squat' | 'pushup' | 'lunge' | 'situp';

export type RepPhase = 'up' | 'down' | 'bottom';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface Violation {
  type: 'elbow_movement' | 'shoulder_drop' | 'knee_valgus' | 'back_rounding' | 'hips_rising';
  message: string;
  severity: 'warning' | 'error';
}

export interface RepState {
  phase: RepPhase;
  count: number;
  elbowAngle: number;
}

export interface ExerciseConfig {
  name: string;
  elbowAngleDown?: number;
  elbowAngleUp?: number;
  kneeAngleDown?: number;
  kneeAngleUp?: number;
  minRepDuration: number;
  detectionMode: 'angle';
}

export const EXERCISE_CONFIGS: Record<ExerciseType, ExerciseConfig> = {
  bicep_curl: {
    name: 'Bicep Curl',
    elbowAngleDown: 60,
    elbowAngleUp: 160,
    minRepDuration: 300,
    detectionMode: 'angle',
  },
  squat: {
    name: 'Squat',
    elbowAngleDown: 90,
    elbowAngleUp: 170,
    minRepDuration: 500,
    detectionMode: 'angle',
  },
  pushup: {
    name: 'Push-up',
    elbowAngleDown: 80,
    elbowAngleUp: 170,
    minRepDuration: 400,
    detectionMode: 'angle',
  },
  lunge: {
    name: 'Lunge',
    kneeAngleDown: 70,
    kneeAngleUp: 170,
    minRepDuration: 500,
    detectionMode: 'angle',
  },
  situp: {
    name: 'Sit-up',
    elbowAngleDown: 90,
    elbowAngleUp: 170,
    minRepDuration: 400,
    detectionMode: 'angle',
  },
};

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

// Hand tracking types
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface Hand {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];
