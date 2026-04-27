import type { NormalizedLandmark, ExerciseType } from '../types';

interface ExerciseTemplate {
  features: {
    shoulder_width: { mean: number; std: number };
    shoulder_level: { mean: number; std: number };
    hip_width: { mean: number; std: number };
    hip_level: { mean: number; std: number };
    torso_length: { mean: number; std: number };
    leg_length: { mean: number; std: number };
    body_center_x: { mean: number; std: number };
    body_center_y: { mean: number; std: number };
    left_arm_ext: { mean: number; std: number };
    left_arm_height: { mean: number; std: number };
    right_arm_ext: { mean: number; std: number };
    right_arm_height: { mean: number; std: number };
  };
}

interface ExercisePrediction {
  exercise: string;
  confidence: number;
}

type ModelData = Record<string, ExerciseTemplate['features']>;

let modelLoaded = false;
let modelData: ModelData | null = null;

export async function loadExerciseModel(): Promise<boolean> {
  if (modelLoaded) return true;

  try {
    const response = await fetch('/exercise_model.json');
    if (response.ok) {
      const data = await response.json();
      // The JSON has a 'templates' object; extract it
      modelData = data.templates || data;
      modelLoaded = true;
      console.log('Exercise model loaded (templates:', Object.keys(modelData || {}).join(', '), ')');
      return true;
    }
  } catch (err) {
    console.warn('Could not load exercise model:', err);
  }

  modelLoaded = true;
  return false;
}

// Compute Gaussian log probability density safely
function logGaussianProb(x: number, mean: number, std: number): number {
  if (std < 1e-8) {
    // If std is 0, probability is 1 if x == mean, else 0 (use large negative log-prob)
    return x === mean ? 0 : -1e9;
  }
  const coeff = Math.log(2 * Math.PI * std * std);
  const exponent = ((x - mean) * (x - mean)) / (2 * std * std);
  return -0.5 * coeff - exponent;
}

// Extract 12 pose features matching the training template
export function extractExerciseFeatures(landmarks: NormalizedLandmark[]): Record<string, number> {
  const get = (i: number) => landmarks[i] || { x: 0, y: 0, z: 0 };
  const ls = get(11); // left shoulder
  const rs = get(12); // right shoulder
  const le = get(13); // left elbow
  const lw = get(15); // left wrist
  const lh = get(23); // left hip
  const rh = get(24); // right hip
  const lk = get(25); // left knee
  const la = get(27); // left ankle
  const ra = get(28); // right ankle
  const nose = get(0);

  // Shoulder width (normalized horizontal distance)
  const shoulderWidth = Math.abs(rs.x - ls.x);
  const shoulderLevel = Math.abs(ls.y - rs.y);

  // Hip width & level
  const hipWidth = Math.abs(rh.x - lh.x);
  const hipLevel = Math.abs(lh.y - rh.y);

  // Torso length (vertical shoulder to hip)
  const torsoLength = Math.abs(ls.y - lh.y);

  // Leg length (hip to ankle) - average of both legs
  const leftLegLen = Math.sqrt(Math.pow(la.x - lh.x, 2) + Math.pow(la.y - lh.y, 2));
  const rightLegLen = Math.sqrt(Math.pow(ra.x - rh.x, 2) + Math.pow(ra.y - rh.y, 2));
  const legLength = (leftLegLen + rightLegLen) / 2;

  // Body centroid (average of major joints)
  const cx = (ls.x + rs.x + lh.x + rh.x + la.x + ra.x) / 6;
  const cy = (ls.y + rs.y + lh.y + rh.y + la.y + ra.y) / 6;

  // Arm extension (shoulder to wrist distance) and height (wrist y relative to shoulder)
  const leftArmExt = Math.sqrt(Math.pow(lw.x - ls.x, 2) + Math.pow(lw.y - ls.y, 2));
  const leftArmHeight = lw.y - ls.y; // negative means above shoulder

  const rw = get(16); // right wrist
  const rightArmExt = Math.sqrt(Math.pow(rw.x - rs.x, 2) + Math.pow(rw.y - rs.y, 2));
  const rightArmHeight = rw.y - rs.y;

  return {
    shoulder_width: shoulderWidth,
    shoulder_level: shoulderLevel,
    hip_width: hipWidth,
    hip_level: hipLevel,
    torso_length: torsoLength,
    leg_length: legLength,
    body_center_x: cx,
    body_center_y: cy,
    left_arm_ext: leftArmExt,
    left_arm_height: leftArmHeight,
    right_arm_ext: rightArmExt,
    right_arm_height: rightArmHeight,
  };
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

export function predictExercise(landmarks: NormalizedLandmark[]): ExercisePrediction | null {
  if (!landmarks || landmarks.length < 28 || !modelData) {
    return null;
  }

  const features = extractExerciseFeatures(landmarks);

  // Compute log-likelihood for each exercise class using independent Gaussians
  const scores: Record<string, number> = {};
  for (const [exerciseName, template] of Object.entries(modelData)) {
    let logProb = 0;
    for (const [featName, stat] of Object.entries(template)) {
      const value = features[featName as keyof typeof features];
      if (value !== undefined) {
        logProb += logGaussianProb(value, stat.mean, stat.std);
      }
    }
    scores[exerciseName] = logProb;
  }

  // Find best exercise
  let bestExercise = '';
  let bestScore = -Infinity;
  for (const [ex, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestExercise = ex;
    }
  }

  // Convert log-probs to probabilities via softmax for confidence
  const maxLog = Math.max(...Object.values(scores));
  const expScores: Record<string, number> = {};
  let sumExp = 0;
  for (const [ex, logScore] of Object.entries(scores)) {
    const exp = Math.exp(logScore - maxLog);
    expScores[ex] = exp;
    sumExp += exp;
  }

  const confidence = sumExp > 0 ? expScores[bestExercise] / sumExp : 0;

  // Only return if confidence is reasonable (> 0.3)
  if (confidence < 0.3) {
    return null;
  }

  return { exercise: bestExercise, confidence };
}

export function isModelLoaded(): boolean {
  return modelLoaded;
}