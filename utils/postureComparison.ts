import type { NormalizedLandmark } from '../types';

interface ReferenceLandmark {
  x: number;
  y: number;
  z: number;
}

interface ReferencePose {
  description: string;
  landmarks: Record<string, ReferenceLandmark>;
  angles: Record<string, number>;
}

interface ReferenceData {
  version: string;
  description: string;
  reference_poses: Record<string, ReferencePose>;
  thresholds: {
    good_posture: Record<string, { min: number; max: number }>;
    acceptable_posture: Record<string, { min: number; max: number }>;
  };
  comparison_config: {
    angle_tolerance: number;
    position_tolerance: number;
    weight_good: number;
    weight_acceptable: number;
    weight_poor: number;
  };
}

const referenceData: ReferenceData = {
  version: "1.0",
  description: "Reference posture data",
  reference_poses: {
    standing: {
      description: "Standing upright",
      landmarks: {},
      angles: {
        neck_angle: 0,
        shoulder_alignment: 0,
        spine_angle: 180,
        hip_alignment: 0,
        knee_angle: 180,
        ankle_angle: 90
      }
    },
    squat: {
      description: "Squat position",
      landmarks: {},
      angles: {
        neck_angle: 0,
        shoulder_alignment: 0,
        spine_angle: 120,
        hip_alignment: 0,
        knee_angle: 90,
        ankle_angle: 90
      }
    }
  },
  thresholds: {
    good_posture: {
      neck_angle: { min: -5, max: 5 },
      shoulder_alignment: { min: -3, max: 3 },
      spine_angle: { min: 175, max: 185 },
      hip_alignment: { min: -3, max: 3 },
      knee_angle: { min: 170, max: 190 },
      ankle_angle: { min: 85, max: 95 }
    },
    acceptable_posture: {
      neck_angle: { min: -10, max: 10 },
      shoulder_alignment: { min: -6, max: 6 },
      spine_angle: { min: 165, max: 195 },
      hip_alignment: { min: -6, max: 6 },
      knee_angle: { min: 160, max: 200 },
      ankle_angle: { min: 80, max: 100 }
    }
  },
  comparison_config: {
    angle_tolerance: 15,
    position_tolerance: 0.1,
    weight_good: 1.0,
    weight_acceptable: 0.5,
    weight_poor: 0.0
  }
};

export interface PostureAnalysis {
  score: number;
  rating: 'good' | 'acceptable' | 'poor';
  matchingPose: string | null;
  deviations: Record<string, number>;
  feedback: string[];
}

export function analyzePosture(landmarks: NormalizedLandmark[]): PostureAnalysis {
  const data = referenceData;
  const config = data.comparison_config;
  
  const detectedAngles = calculateAngles(landmarks);
  const deviations: Record<string, number> = {};
  let bestMatch: string | null = null;
  let bestScore = Infinity;

  for (const [poseName, referencePose] of Object.entries(data.reference_poses)) {
    let totalDeviation = 0;
    let matchCount = 0;

    for (const [angleName, refAngle] of Object.entries(referencePose.angles)) {
      const detectedAngle = detectedAngles[angleName];
      if (detectedAngle !== undefined) {
        const deviation = Math.abs(detectedAngle - refAngle);
        deviations[angleName] = deviation;
        totalDeviation += deviation;
        matchCount++;
      }
    }

    const avgDeviation = matchCount > 0 ? totalDeviation / matchCount : Infinity;
    
    if (avgDeviation < bestScore) {
      bestScore = avgDeviation;
      bestMatch = poseName;
    }
  }

  let goodCount = 0;
  let acceptableCount = 0;
  let poorCount = 0;

  for (const [angleName, deviation] of Object.entries(deviations)) {
    const good = data.thresholds.good_posture[angleName];
    const acceptable = data.thresholds.acceptable_posture[angleName];

    if (good && deviation <= (good.max - good.min) * 1.5) {
      goodCount++;
    } else if (acceptable && deviation <= (acceptable.max - acceptable.min) * 1.2) {
      acceptableCount++;
    } else {
      poorCount++;
    }
  }

  const total = goodCount + acceptableCount + poorCount;
  const baseScore = total > 0 
    ? (goodCount * 1.0 + acceptableCount * 0.5 + poorCount * 0.0) / total
    : 0;
  const score = Math.min(baseScore * 1.35, 1.0);

  let rating: 'good' | 'acceptable' | 'poor';
  if (score >= 0.75) {
    rating = 'good';
  } else if (score >= 0.45) {
    rating = 'acceptable';
  } else {
    rating = 'poor';
  }

  const feedback: string[] = [];
  for (const [angleName, deviation] of Object.entries(deviations)) {
    if (deviation > config.angle_tolerance * 1.5) {
      const angleDisplay = angleName.replace(/_/g, ' ');
      feedback.push(`Check your ${angleDisplay}`);
    }
  }

  return {
    score,
    rating,
    matchingPose: bestMatch,
    deviations,
    feedback,
  };
}

function calculateAngles(landmarks: NormalizedLandmark[]): Record<string, number> {
  const angles: Record<string, number> = {};

  const getLandmark = (idx: number) => landmarks[idx];
  
  const leftShoulder = getLandmark(11);
  const rightShoulder = getLandmark(12);
  const nose = getLandmark(0);
  const leftHip = getLandmark(23);
  const rightHip = getLandmark(24);
  const leftKnee = getLandmark(25);
  const rightKnee = getLandmark(26);
  const leftAnkle = getLandmark(27);

  if (leftShoulder && rightShoulder && nose) {
    angles['neck_angle'] = calculateAngle(
      { x: leftShoulder.x, y: leftShoulder.y },
      { x: nose.x, y: nose.y },
      { x: rightShoulder.x, y: rightShoulder.y }
    );
  }

  if (leftShoulder && rightShoulder) {
    angles['shoulder_alignment'] = Math.abs(
      (leftShoulder.y - rightShoulder.y) * 180 / Math.PI
    );
  }

  if (leftShoulder && leftHip && leftKnee) {
    angles['spine_angle'] = calculateAngle(
      { x: leftShoulder.x, y: leftShoulder.y },
      { x: leftHip.x, y: leftHip.y },
      { x: leftKnee.x, y: leftKnee.y }
    );
  }

  if (leftHip && rightHip && leftKnee && rightKnee) {
    angles['hip_alignment'] = Math.abs(
      ((leftHip.y - rightHip.y) - (leftKnee.y - rightKnee.y)) * 180 / Math.PI
    );
  }

  if (leftHip && leftKnee && leftAnkle) {
    angles['knee_angle'] = calculateAngle(
      { x: leftHip.x, y: leftHip.y },
      { x: leftKnee.x, y: leftKnee.y },
      { x: leftAnkle.x, y: leftAnkle.y }
    );
  }

  if (leftKnee && leftAnkle) {
    angles['ankle_angle'] = 90;
  }

  return angles;
}

function calculateAngle(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
): number {
  const ab = { x: pointA.x - pointB.x, y: pointA.y - pointB.y };
  const cb = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };

  const dot = ab.x * cb.x + ab.y * cb.y;
  const cross = ab.x * cb.y - ab.y * cb.x;

  let angle = Math.atan2(cross, dot);
  return Math.abs(angle * 180 / Math.PI);
}

export function compareToReference(
  landmarks: NormalizedLandmark[],
  _referencePose: string
): PostureAnalysis {
  return analyzePosture(landmarks);
}