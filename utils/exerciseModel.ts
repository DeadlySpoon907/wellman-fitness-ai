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
    'bicep_curls': 'bicep_curl',
    'squat': 'squat',
    'squats': 'squat',
    'pushup': 'pushup',
    'push-up': 'pushup',
    'pushups': 'pushup',
    'lunge': 'lunge',
    'lunges': 'lunge',
    'situp': 'situp',
    'sit-up': 'situp',
    'situps': 'situp',
    'dumbbell_shoulder_press': 'dumbbell_shoulder_press',
    'shoulder_press': 'dumbbell_shoulder_press',
    'dumbbell_rows': 'dumbbell_rows',
    'row': 'dumbbell_rows',
    'rows': 'dumbbell_rows',
    'tricep_extensions': 'tricep_extensions',
    'tricep_extension': 'tricep_extensions',
    'tricep_dips': 'tricep_extensions',
    'lateral_shoulder_raises': 'lateral_shoulder_raises',
    'lateral_raise': 'lateral_shoulder_raises',
    'shoulder_raise': 'lateral_shoulder_raises',
    'jumping_jacks': 'jumping_jacks',
    'jumpingjack': 'jumping_jacks',
    'jumping_jack': 'jumping_jacks',
  };

  return exerciseMap[exerciseName.toLowerCase()] || null;
}

export function isModelLoaded(): boolean {
  return modelLoaded;
}