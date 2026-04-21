import type { NormalizedLandmark } from '../types';

export interface BodyAnalysis {
  bodyType: BodyType;
  confidence: number;
  measurements: BodyMeasurements;
  proportions: BodyProportions;
  recommendations: string[];
  details?: BodyDetailDescription;
}

export interface BodyDetailDescription {
  overall: string;
  upperBody: string;
  lowerBody: string;
  torso: string;
  limbs: string;
  bmiCategory: string;
  stats: {
    shoulderBreadth: string;
    waistline: string;
    hipStructure: string;
    armDevelopment: string;
    legLength: string;
  };
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
    shoulderHipMin: 0.85,
    shoulderHipMax: 1.15,
    waistHipMin: 0.65,
    waistHipMax: 0.9,
    limbTorsoMin: 1.2,
    bmiRange: [14, 23]
  },
  mesomorph: {
    shoulderHipMin: 1.05,
    shoulderHipMax: 1.5,
    waistHipMin: 0.7,
    waistHipMax: 0.95,
    limbTorsoMin: 1.0,
    bmiRange: [18, 29]
  },
  endomorph: {
    shoulderHipMin: 0.75,
    shoulderHipMax: 1.15,
    waistHipMin: 0.8,
    waistHipMax: 1.2,
    limbTorsoMin: 0.8,
    bmiRange: [22, 40]
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
   const details = generateBodyDetails(measurements, proportions, bmi, bodyType, heightCm);

  return {
    bodyType,
    confidence,
    measurements,
    proportions,
    recommendations,
    details
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

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function categorizeShoulderBreadth(ratio: number): string {
  const narrowThreshold = 0.9;  // shoulders significantly narrower than hips
  const wideThreshold = 1.25;   // shoulders significantly wider than hips
  
  if (ratio < narrowThreshold) return 'Narrow and slender';
  if (ratio > wideThreshold) return 'Broad and powerful';
  return 'Well-developed';
}

function categorizeWaistline(ratio: number): string {
  const slimThreshold = 0.75;
  const thickThreshold = 0.95;
  
  if (ratio < slimThreshold) return 'Slim and tapered';
  if (ratio > thickThreshold) return 'Thick and solid';
  return 'Defined and athletic';
}

function categorizeHipStructure(shoulderToHipRatio: number): string {
  // shoulderToHipRatio = shoulderWidth / hipWidth
  // High ratio (>1.2): shoulders much wider => narrow hips
  // Low ratio (<0.9): shoulders narrower => wide hips
  if (shoulderToHipRatio > 1.2) return 'Narrow hips';
  if (shoulderToHipRatio < 0.9) return 'Wide hips';
  return 'Balanced hip width';
}

function categorizeArmCircumference(circumference: number, heightCm: number): string {
  const relativeSize = circumference / heightCm;
  const smallThreshold = 0.12;
  const largeThreshold = 0.18;
  
  if (relativeSize < smallThreshold) return 'Slender arms';
  if (relativeSize > largeThreshold) return 'Muscular arms';
  return 'Average arm development';
}

function categorizeLegLength(legLength: number, heightCm: number): string {
  const ratio = legLength / heightCm;
  const shortThreshold = 0.45;
  const longThreshold = 0.55;
  
  if (ratio < shortThreshold) return 'Compact legs';
  if (ratio > longThreshold) return 'Long legs';
  return 'Average leg length';
}

function generateBodyDetails(
  measurements: BodyMeasurements,
  proportions: BodyProportions,
  bmi: number,
  bodyType: BodyType,
  heightCm: number
): BodyDetailDescription {
  const shoulderDesc = categorizeShoulderBreadth(proportions.shoulderToHipRatio);
  const waistDesc = categorizeWaistline(proportions.waistToHipRatio);
  const hipDesc = categorizeHipStructure(proportions.shoulderToHipRatio);
  const armDesc = categorizeArmCircumference(measurements.armCircumference, heightCm);
  const legDesc = categorizeLegLength(measurements.legLength, heightCm);

  const upperBody = [
    shoulderDesc,
    `Shoulder-to-hip ratio: ${proportions.shoulderToHipRatio.toFixed(2)}`
  ];

  const lowerBody = [
    waistDesc,
    hipDesc,
    `Waist-to-hip ratio: ${proportions.waistToHipRatio.toFixed(2)}`
  ];

  const limbsArray = [
    armDesc,
    legDesc,
    measurements.armCircumference > 0 ? `Arm circumference: ~${Math.round(measurements.armCircumference)}cm` : '',
    measurements.legLength > 0 ? `Leg length: ~${Math.round(measurements.legLength)}cm` : ''
  ].filter(Boolean);

  const limbs = limbsArray.length > 0 ? limbsArray.join('. ') + '.' : 'No specific limb measurements available.';

  const overallPhrases: string[] = [];
  switch (bodyType) {
    case 'ectomorph':
      overallPhrases.push('Thin-boned with lean muscle mass');
      overallPhrases.push('Fast metabolism, difficulty gaining weight');
      overallPhrases.push('Long limbs with smaller joints');
      break;
    case 'mesomorph':
      overallPhrases.push('Naturally athletic and muscular');
      overallPhrases.push('Broad shoulders with defined muscles');
      overallPhrases.push('Responsive to strength training');
      break;
    case 'endomorph':
      overallPhrases.push('Solid build with higher body fat');
      overallPhrases.push('Slower metabolism, stores fat easily');
      overallPhrases.push('Wider waist and hips');
      break;
    case 'balanced':
      overallPhrases.push('Well-proportioned physique');
      overallPhrases.push('Moderate metabolism and response to training');
      overallPhrases.push('Balanced muscle-to-fat ratio');
      break;
  }

  const bmiCategory = getBmiCategory(bmi);
  overallPhrases.push(`BMI: ${bmi.toFixed(1)} (${bmiCategory})`);

   return {
     overall: overallPhrases.join('. ') + '.',
     upperBody: upperBody.join('. ') + '.',
     lowerBody: lowerBody.join('. ') + '.',
     limbs: limbs,
     torso: `Shoulder span: ${Math.round(measurements.shoulderWidth)}cm. Waist: ${Math.round(measurements.waistWidth)}cm. Hips: ${Math.round(measurements.hipWidth)}cm. Torso length: ${Math.round(measurements.torsoLength)}cm.`,
     bmiCategory,
     stats: {
       shoulderBreadth: shoulderDesc,
       waistline: waistDesc,
       hipStructure: hipDesc,
       armDevelopment: armDesc,
       legLength: legDesc
     }
   };
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
    recommendations: ['Scan your body to get personalized recommendations'],
    details: {
      overall: 'No body scan data available.',
      upperBody: '',
      lowerBody: '',
      limbs: '',
      torso: '',
      bmiCategory: 'Unknown',
      stats: {
        shoulderBreadth: 'N/A',
        waistline: 'N/A',
        hipStructure: 'N/A',
        armDevelopment: 'N/A',
        legLength: 'N/A'
      }
    }
  };
}

export function getBodyTypeDescription(bodyType: BodyType): string {
  switch (bodyType) {
    case 'ectomorph':
      return 'Thin-boned with lean muscle mass, narrow shoulders and hips, long limbs. Fast metabolism makes it harder to gain weight. Best with strength training and higher calorie intake.';
    case 'mesomorph':
      return 'Athletic build with broad shoulders, defined muscles, and responsive metabolism. Gains muscle easily and responds well to varied training. Naturally strong appearance.';
    case 'endomorph':
      return 'Rounder, solid build with wider waist and hips. Tends to store fat easily but can be powerful and strong. Benefits from cardio-focused routines and protein-rich diets.';
    case 'balanced':
      return 'Well-proportioned physique with balanced muscle-to-fat ratio. Adapts well to most training styles and diets. Maintain consistency for optimal results.';
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