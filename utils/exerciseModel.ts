import type { NormalizedLandmark, ExerciseType } from '../types';

interface ExercisePrediction {
  exercise: string;
  confidence: number;
}

let modelLoaded = false;
let model: any = null;

export async function loadExerciseModel(): Promise<boolean> {
  if (modelLoaded) return true;
  
  try {
    const response = await fetch('/exercise_model.json');
    if (response.ok) {
      model = await response.json();
      modelLoaded = true;
      console.log('Exercise model loaded');
      return true;
    }
  } catch (err) {
    console.warn('Could not load exercise model:', err);
  }
  
  modelLoaded = true;
  return false;
}

export function predictExercise(landmarks: NormalizedLandmark[]): ExercisePrediction | null {
  if (!landmarks || landmarks.length < 28 || !model) {
    return null;
  }

  return null;
}

export function getExerciseType(exerciseName: string): ExerciseType | null {
  const exerciseMap: Record<string, ExerciseType> = {
    'bicep_curl': 'bicep_curl',
    'squat': 'squat',
    'pushup': 'pushup',
    'push-up': 'pushup',
    'lunge': 'lunge',
    'situp': 'situp',
    'sit-up': 'situp'
  };

  return exerciseMap[exerciseName.toLowerCase()] || null;
}

export function isModelLoaded(): boolean {
  return modelLoaded;
}