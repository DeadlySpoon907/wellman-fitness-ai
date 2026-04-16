import type { NormalizedLandmark } from '../types';

export interface BodyAnalysis {
  bodyType: BodyType;
  confidence: number;
  measurements: BodyMeasurements;
  proportions: BodyProportions;
  recommendations: string[];
}

export type BodyType = 'ectomorph' | 'mesomorph' | 'endomorph' | 'balanced';

export interface BodyMeasurements {
  shoulderWidth: number;
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  armCircumference: number;
  legLength: number;
  torsoLength: number;
}

export interface BodyProportions {
  shoulderToHipRatio: number;
  waistToHipRatio: number;
  limbToTorsoRatio: number;
  heightToWeight: number;
}

const BODY_TYPE_THRESHOLDS = {
  ectomorph: {
    shoulderHipMin: 0.9,
    shoulderHipMax: 1.1,
    waistHipMin: 0.7,
    waistHipMax: 0.85,
    limbTorsoMin: 1.3,
    bmiRange: [16, 22]
  },
  mesomorph: {
    shoulderHipMin: 1.1,
    shoulderHipMax: 1.4,
    waistHipMin: 0.75,
    waistHipMax: 0.9,
    limbTorsoMin: 1.1,
    bmiRange: [20, 27]
  },
  endomorph: {
    shoulderHipMin: 0.8,
    shoulderHipMax: 1.1,
    waistHipMin: 0.85,
    waistHipMax: 1.1,
    limbTorsoMin: 0.9,
    bmiRange: [24, 35]
  }
};

export function analyzeBodyType(
  landmarks: NormalizedLandmark[],
  bmi: number,
  heightCm: number,
  weightKg: number
): BodyAnalysis {
  if (!landmarks || landmarks.length < 33) {
    return getDefaultAnalysis();
  }

  const measurements = calculateMeasurements(landmarks, heightCm);
  const proportions = calculateProportions(measurements, heightCm, weightKg);
  
  const bodyType = determineBodyType(proportions, bmi);
  const confidence = calculateConfidence(proportions, bmi);
  const recommendations = generateRecommendations(bodyType, proportions, bmi);

  return {
    bodyType,
    confidence,
    measurements,
    proportions,
    recommendations
  };
}

function calculateMeasurements(landmarks: NormalizedLandmark[], heightCm: number): BodyMeasurements {
  const scale = heightCm;
  
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftElbow = landmarks[13];
  const leftWrist = landmarks[15];
  const leftHipJoint = landmarks[23];
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];

  const shoulderWidth = leftShoulder && rightShoulder 
    ? Math.abs(rightShoulder.x - leftShoulder.x) * scale * 2
    : 0;

  const chestWidth = shoulderWidth * 0.85;
  
  const waistWidth = leftHip && rightHip && leftShoulder && rightShoulder
    ? ((rightHip.x - leftHip.x) + (rightShoulder.x - leftShoulder.x)) / 2 * scale * 2
    : shoulderWidth * 0.75;

  const hipWidth = leftHip && rightHip
    ? Math.abs(rightHip.x - leftHip.x) * scale * 2
    : waistWidth * 0.95;

  const armLength = leftElbow && leftWrist && leftShoulder
    ? Math.sqrt(Math.pow(leftWrist.x - leftElbow.x, 2) + Math.pow(leftWrist.y - leftElbow.y, 2)) * scale * 2 +
      Math.sqrt(Math.pow(leftElbow.x - leftShoulder.x, 2) + Math.pow(leftElbow.y - leftShoulder.y, 2)) * scale * 2
    : heightCm * 0.4;

  const armCircumference = armLength * 0.15;

  const legLength = leftHipJoint && leftKnee && leftAnkle
    ? Math.sqrt(Math.pow(leftKnee.x - leftHipJoint.x, 2) + Math.pow(leftKnee.y - leftHipJoint.y, 2)) * scale +
      Math.sqrt(Math.pow(leftAnkle.x - leftKnee.x, 2) + Math.pow(leftAnkle.y - leftKnee.y, 2)) * scale
    : heightCm * 0.5;

  const torsoLength = leftShoulder && leftHipJoint
    ? Math.abs(leftHipJoint.y - leftShoulder.y) * scale
    : heightCm * 0.35;

  return {
    shoulderWidth,
    chestWidth,
    waistWidth,
    hipWidth,
    armCircumference,
    legLength,
    torsoLength
  };
}

function calculateProportions(
  measurements: BodyMeasurements,
  heightCm: number,
  weightKg: number
): BodyProportions {
  const shoulderToHipRatio = measurements.shoulderWidth / measurements.hipWidth;
  const waistToHipRatio = measurements.waistWidth / measurements.hipWidth;
  const limbToTorsoRatio = (measurements.legLength + measurements.armCircumference * 8) / measurements.torsoLength;
  const heightToWeight = heightCm / weightKg;

  return {
    shoulderToHipRatio,
    waistToHipRatio,
    limbToTorsoRatio,
    heightToWeight
  };
}

function determineBodyType(proportions: BodyProportions, bmi: number): BodyType {
  const { shoulderToHipRatio, waistToHipRatio } = proportions;

  let ectomorphScore = 0;
  let mesomorphScore = 0;
  let endomorphScore = 0;

  if (shoulderToHipRatio >= BODY_TYPE_THRESHOLDS.ectomorph.shoulderHipMin && 
      shoulderToHipRatio <= BODY_TYPE_THRESHOLDS.ectomorph.shoulderHipMax) {
    ectomorphScore += 2;
  }
  if (waistToHipRatio >= BODY_TYPE_THRESHOLDS.ectomorph.waistHipMin && 
      waistToHipRatio <= BODY_TYPE_THRESHOLDS.ectomorph.waistHipMax) {
    ectomorphScore += 2;
  }
  if (bmi >= BODY_TYPE_THRESHOLDS.ectomorph.bmiRange[0] && bmi <= BODY_TYPE_THRESHOLDS.ectomorph.bmiRange[1]) {
    ectomorphScore += 1;
  }

  if (shoulderToHipRatio >= BODY_TYPE_THRESHOLDS.mesomorph.shoulderHipMin) {
    mesomorphScore += 3;
  }
  if (waistToHipRatio >= BODY_TYPE_THRESHOLDS.mesomorph.waistHipMin && 
      waistToHipRatio <= BODY_TYPE_THRESHOLDS.mesomorph.waistHipMax) {
    mesomorphScore += 2;
  }
  if (bmi >= BODY_TYPE_THRESHOLDS.mesomorph.bmiRange[0] && bmi <= BODY_TYPE_THRESHOLDS.mesomorph.bmiRange[1]) {
    mesomorphScore += 1;
  }

  if (shoulderToHipRatio <= BODY_TYPE_THRESHOLDS.endomorph.shoulderHipMax) {
    endomorphScore += 1;
  }
  if (waistToHipRatio >= BODY_TYPE_THRESHOLDS.endomorph.waistHipMin) {
    endomorphScore += 3;
  }
  if (bmi >= BODY_TYPE_THRESHOLDS.endomorph.bmiRange[0]) {
    endomorphScore += 2;
  }

  const maxScore = Math.max(ectomorphScore, mesomorphScore, endomorphScore);
  
  if (maxScore < 3) {
    return 'balanced';
  }

  if (ectomorphScore === maxScore) return 'ectomorph';
  if (mesomorphScore === maxScore) return 'mesomorph';
  return 'endomorph';
}

function calculateConfidence(proportions: BodyProportions, bmi: number): number {
  const { shoulderToHipRatio, waistToHipRatio } = proportions;
  
  let confidence = 0.65;

  if (shoulderToHipRatio >= 1.0 && shoulderToHipRatio <= 1.3) {
    confidence += 0.12;
  }
  if (waistToHipRatio >= 0.75 && waistToHipRatio <= 0.95) {
    confidence += 0.12;
  }
  if (bmi >= 18.5 && bmi <= 30) {
    confidence += 0.06;
  }

  return Math.min(confidence, 0.9);
}

function generateRecommendations(
  bodyType: BodyType,
  proportions: BodyProportions,
  bmi: number
): string[] {
  const recommendations: string[] = [];

  switch (bodyType) {
    case 'ectomorph':
      recommendations.push('Focus on compound strength exercises');
      recommendations.push('Higher carbohydrate intake for energy');
      recommendations.push('Progressive overload with moderate weights');
      break;
    case 'mesomorph':
      recommendations.push('Balanced training with strength and cardio');
      recommendations.push('Moderate protein and complex carbs');
      recommendations.push('Varied workout intensities for optimal gains');
      break;
    case 'endomorph':
      recommendations.push('Higher intensity cardio for fat loss');
      recommendations.push('Lower carb, higher protein diet');
      recommendations.push('Focus on full-body compound movements');
      break;
    case 'balanced':
      recommendations.push('Maintain balanced diet and exercise');
      recommendations.push('Varied training for overall fitness');
      break;
  }

  if (bmi < 18.5) {
    recommendations.push('Consider increasing caloric intake');
  } else if (bmi > 25) {
    recommendations.push('Focus on calorie deficit with exercise');
  }

  return recommendations;
}

function getDefaultAnalysis(): BodyAnalysis {
  return {
    bodyType: 'balanced',
    confidence: 0,
    measurements: {
      shoulderWidth: 0,
      chestWidth: 0,
      waistWidth: 0,
      hipWidth: 0,
      armCircumference: 0,
      legLength: 0,
      torsoLength: 0
    },
    proportions: {
      shoulderToHipRatio: 1,
      waistToHipRatio: 0.85,
      limbToTorsoRatio: 1.2,
      heightToWeight: 2.5
    },
    recommendations: ['Scan your body to get personalized recommendations']
  };
}

export function getBodyTypeDescription(bodyType: BodyType): string {
  switch (bodyType) {
    case 'ectomorph':
      return 'Lean and long body type, typically with narrow shoulders and hips';
    case 'mesomorph':
      return 'Athletic build with broad shoulders and muscular development';
    case 'endomorph':
      return 'Rounder body type with tendency to store fat easily';
    case 'balanced':
      return 'Well-proportioned body type';
  }
}

export function getBodyTypeIcon(bodyType: BodyType): string {
  switch (bodyType) {
    case 'ectomorph': return '🧘';
    case 'mesomorph': return '🏋️';
    case 'endomorph': return '⭕';
    case 'balanced': return '⚖️';
  }
}