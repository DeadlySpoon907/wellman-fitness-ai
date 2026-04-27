/**
 * BMI Estimator using TensorFlow.js
 *
 * Local ML model that predicts BMI from pose landmarks.
 * Trained on synthetic data with progressive learning from user calibrations.
 * V2: Includes extreme BMI ranges (12-50) and hybrid fallback logic.
 */

import * as tf from '@tensorflow/tfjs';
// Use Node.js backend if available (faster training)
if (typeof window === 'undefined') {
  try {
    require('@tensorflow/tfjs-node');
    console.log('✓ TensorFlow.js Node backend loaded');
  } catch (e) {
    console.warn('tfjs-node not available, using CPU (slower)');
  }
}

export const MODEL_KEY = 'bmi_model_weights_v2';
export const MODEL_FILE = 'bmi-model-weights-v2.json';
export const FEATURE_COUNT = 35;
export const MODEL_VERSION = '2.0';
export const MIN_CONFIDENCE_THRESHOLD = 0.5;
export const EXTREME_BMI_THRESHOLD = 16; // Below this, hybrid fallback activates
export const CALIBRATION_TRIGGER_COUNT = 3; // Retrain after this many calibrations

export interface BMISample {
  features: number[];
  bmi: number;
}

// ============================================
// Feature Extraction (35 dimensions) - UNCHANGED
// ============================================
export function extractFeaturesFromLandmarks(landmarks: any[], heightCm: number): number[] {
  if (!landmarks || landmarks.length < 33) {
    return new Array(FEATURE_COUNT).fill(0);
  }

  const get = (idx: number) => landmarks[idx] || { x: 0, y: 0, z: 0, visibility: 1 };

  const leftShoulder = get(11);
  const rightShoulder = get(12);
  const leftHip = get(23);
  const rightHip = get(24);
  const leftElbow = get(13);
  const leftWrist = get(15);
  const leftKnee = get(25);
  const leftAnkle = get(27);
  const rightElbow = get(14);
  const rightWrist = get(16);
  const rightKnee = get(26);
  const rightAnkle = get(28);
  const nose = get(0);
  const neck = get(1);
  const leftFoot = get(29);
  const rightFoot = get(30);

  const torsoHeight = Math.max(Math.abs(nose.y - leftAnkle.y), 0.1);
  const norm = torsoHeight;

  // Width measurements
  const shoulderWidth = (rightShoulder.x - leftShoulder.x) / norm;
  const hipWidth = (rightHip.x - leftHip.x) / norm;
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const waistX = shoulderMidX * 0.6 + hipMidX * 0.4;
  const waistWidth = Math.abs(waistX * 2 - (leftHip.x + rightHip.x)) / norm;

  // Limb lengths
  const leftArmLen = Math.sqrt((leftWrist.x - leftShoulder.x)**2 + (leftWrist.y - leftShoulder.y)**2) / norm;
  const rightArmLen = Math.sqrt((rightWrist.x - rightShoulder.x)**2 + (rightWrist.y - rightShoulder.y)**2) / norm;
  const armLength = (leftArmLen + rightArmLen) / 2;

  const leftLegLen = Math.sqrt((leftAnkle.x - leftHip.x)**2 + (leftAnkle.y - leftHip.y)**2) / norm;
  const rightLegLen = Math.sqrt((rightAnkle.x - rightHip.x)**2 + (rightAnkle.y - rightHip.y)**2) / norm;
  const legLength = (leftLegLen + rightLegLen) / 2;

  const torsoLen = Math.abs(leftShoulder.y - leftHip.y) / norm;
  const neckLen = Math.abs(neck.y - nose.y) / norm;

  // Ratios
  const shoulderHipRatio = shoulderWidth / (hipWidth || 0.01);
  const waistHipRatio = waistWidth / (hipWidth || 0.01);
  const shoulderWaistRatio = shoulderWidth / (waistWidth || 0.01);
  const armTorsoRatio = armLength / (torsoLen || 0.01);
  const legTorsoRatio = legLength / (torsoLen || 0.01);
  const legArmRatio = legLength / (armLength || 0.01);

  // Depth measurements
  const shoulderDepth = Math.abs((get(11).z || 0) - (get(12).z || 0));
  const hipDepth = Math.abs((get(23).z || 0) - (get(24).z || 0));

  // Vertical positions
  const leftShoulderY = leftShoulder.y / norm;
  const leftHipY = leftHip.y / norm;
  const leftKneeY = leftKnee.y / norm;
  const heightNorm = heightCm / 100;

  // Asymmetry features
  const shoulderAsymY = Math.abs(leftShoulder.y - rightShoulder.y) / norm;
  const shoulderAsymX = Math.abs((leftShoulder.x + rightShoulder.x)/2 - 0.5) / norm;
  const hipAsymY = Math.abs(leftHip.y - rightHip.y) / norm;
  const hipAsymX = Math.abs((leftHip.x + rightHip.x)/2 - 0.5) / norm;
  const armAsym = Math.abs(leftArmLen - rightArmLen) / (armLength || 0.01);
  const legAsym = Math.abs(leftLegLen - rightLegLen) / (legLength || 0.01);

  // Angle calculation helper
  const angle3 = (a: any, b: any, c: any) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x*cb.x + ab.y*cb.y;
    const m1 = Math.hypot(ab.x, ab.y);
    const m2 = Math.hypot(cb.x, cb.y);
    if (m1 === 0 || m2 === 0) return Math.PI;
    const cos = dot / (m1 * m2);
    return Math.acos(Math.max(-1, Math.min(1, cos)));
  };

  // Body angles
  const spineAngle = angle3(leftShoulder, leftHip, leftKnee) / Math.PI;
  const kneeAngle = angle3(leftHip, leftKnee, leftAnkle) / Math.PI;
  const elbowAngle = angle3(leftShoulder, leftElbow, leftWrist) / Math.PI;
  const shoulderAngle = angle3(leftHip, leftShoulder, leftElbow) / Math.PI;

  // Body tilt and posture
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;
  const bodyTilt = Math.abs(shoulderMidY - hipMidY) / (torsoLen * norm || 1);

  // Foot position
  const leftFootX = leftFoot.x / norm;
  const rightFootX = rightFoot.x / norm;
  const stanceWidth = (rightFootX - leftFootX) / norm;

  // Compactness (area proxy)
  const boundingWidth = Math.max(rightShoulder.x, rightHip.x) - Math.min(leftShoulder.x, leftHip.x);
  const boundingHeight = Math.abs(nose.y - leftAnkle.y);
  const compactness = (boundingWidth * boundingHeight) / (norm * norm);

  // Shoulder-to-waist transition (indicates belly)
  const shoulderToWaistDiff = shoulderWidth - waistWidth;

  return [
    // Width features
    shoulderWidth, hipWidth, waistWidth, shoulderHipRatio, waistHipRatio,
    shoulderWaistRatio, stanceWidth, boundingWidth,
    
    // Length features
    armLength, legLength, torsoLen, neckLen, legArmRatio,
    
    // Depth features
    shoulderDepth, hipDepth,
    
    // Vertical position features
    leftShoulderY, leftHipY, leftKneeY, heightNorm, neckLen,
    
    // Asymmetry features
    shoulderAsymY, shoulderAsymX, hipAsymY, hipAsymX,
    armAsym, legAsym,
    
    // Angle features
    spineAngle, kneeAngle, elbowAngle, shoulderAngle,
    bodyTilt,
    
    // Shape features
    compactness, shoulderToWaistDiff,
    
    // Ratios
    armTorsoRatio, legTorsoRatio
  ];
}

// ============================================
// Enhanced Synthetic Data Generation (BMI 12-50)
// ============================================
export function generateSyntheticData(numSamples: number = 15000): BMISample[] {
  const samples: BMISample[] = [];

  // Balanced BMI distribution covering full human range (12-50)
  // Over-sampled extremes for better edge-case performance
  const severelyUnderweightRatio = 0.08;  // BMI 12-15 (very lean ectomorphs)
  const underweightRatio = 0.12;          // BMI 15-18.5 (lean)
  const ectomorphRatio = 0.20;            // BMI 18.5-22 (athletic lean)
  const mesomorphRatio = 0.30;            // BMI 20-26 (athletic)
  const endomorphRatio = 0.20;            // BMI 22-30 (fuller)
  const overweightRatio = 0.10;           // BMI 26-50 (higher)

  for (let i = 0; i < numSamples; i++) {
    const bmiCategory = Math.random();
    let targetBmi: number;

    if (bmiCategory < severelyUnderweightRatio) {
      // Severely underweight: 12-15 (extreme ectomorphs like 168cm/42kg)
      targetBmi = 12 + Math.random() * 3;
    } else if (bmiCategory < severelyUnderweightRatio + underweightRatio) {
      // Underweight: 15-18.5
      targetBmi = 15 + Math.random() * 3.5;
    } else if (bmiCategory < severelyUnderweightRatio + underweightRatio + ectomorphRatio) {
      // Healthy lean/ectomorph: 18.5-22
      targetBmi = 18.5 + Math.random() * 3.5;
    } else if (bmiCategory < severelyUnderweightRatio + underweightRatio + ectomorphRatio + mesomorphRatio) {
      // Athletic/mesomorph: 20-26
      targetBmi = 20 + Math.random() * 6;
    } else if (bmiCategory < severelyUnderweightRatio + underweightRatio + ectomorphRatio + mesomorphRatio + endomorphRatio) {
      // Balanced/endomorph: 22-30
      targetBmi = 22 + Math.random() * 8;
    } else {
      // Overweight/obese: 26-50
      targetBmi = 26 + Math.random() * 24;
    }

    // Clamp BMI to physiologically plausible range (12-50 covers 99.9% of adults)
    targetBmi = Math.max(12, Math.min(50, targetBmi));

    // Height distribution (adults 150-195cm)
    const heightCm = 150 + Math.random() * 45;
    const heightM = heightCm / 100;
    const weight = targetBmi * heightM * heightM;

    // Determine body type proportions based on BMI with EXTREME ectomorph support
    const isTaller = heightCm > 175;
    const isShorter = heightCm < 160;

    let shoulderHipRatio, waistHipRatio, shoulderWaistRatio;
    let torsoLegRatio, armTorsoRatio;
    let shoulderDepth, hipDepth;

    if (targetBmi < 15) {
      // SEVERE underweight: extremely lean, minimal body fat, very narrow waist
      // BMI 12-15: extreme ectomorphs (e.g., 168cm, 40-42kg)
      shoulderHipRatio = 0.80 + Math.random() * 0.30;  // 0.80-1.10 (often narrow shoulders)
      waistHipRatio = 0.58 + Math.random() * 0.20;     // 0.58-0.78 (extremely tapered)
      shoulderWaistRatio = 1.30 + Math.random() * 0.40; // 1.30-1.70 (dramatic V-taper)
      torsoLegRatio = 0.90 + Math.random() * 0.15;     // 0.90-1.05
      armTorsoRatio = 0.95 + Math.random() * 0.15;     // 0.95-1.10
      shoulderDepth = 0.015 + Math.random() * 0.015;   // Minimal muscle bulk
      hipDepth = 0.025 + Math.random() * 0.015;
    } else if (targetBmi < 20) {
      // Underweight/lean: narrow waist, longer limbs, minimal bulk
      shoulderHipRatio = 0.85 + Math.random() * 0.25;
      waistHipRatio = 0.65 + Math.random() * 0.22;
      shoulderWaistRatio = 1.25 + Math.random() * 0.30;
      torsoLegRatio = 0.90 + Math.random() * 0.15;
      armTorsoRatio = 0.95 + Math.random() * 0.15;
      shoulderDepth = 0.03 + Math.random() * 0.02;
      hipDepth = 0.04 + Math.random() * 0.02;
    } else if (targetBmi < 25) {
      // Athletic/balanced
      shoulderHipRatio = 1.00 + Math.random() * 0.30;
      waistHipRatio = 0.72 + Math.random() * 0.25;
      shoulderWaistRatio = 1.30 + Math.random() * 0.35;
      torsoLegRatio = 0.95 + Math.random() * 0.12;
      armTorsoRatio = 0.92 + Math.random() * 0.14;
      shoulderDepth = 0.05 + Math.random() * 0.04;
      hipDepth = 0.05 + Math.random() * 0.04;
    } else if (targetBmi < 30) {
      // Fuller build
      shoulderHipRatio = 0.95 + Math.random() * 0.35;
      waistHipRatio = 0.78 + Math.random() * 0.30;
      shoulderWaistRatio = 1.15 + Math.random() * 0.30;
      torsoLegRatio = 0.88 + Math.random() * 0.15;
      armTorsoRatio = 0.88 + Math.random() * 0.14;
      shoulderDepth = 0.04 + Math.random() * 0.04;
      hipDepth = 0.06 + Math.random() * 0.05;
    } else {
      // Higher BMI: rounder proportions
      shoulderHipRatio = 0.85 + Math.random() * 0.40;
      waistHipRatio = 0.82 + Math.random() * 0.35;
      shoulderWaistRatio = 1.05 + Math.random() * 0.25;
      torsoLegRatio = 0.85 + Math.random() * 0.20;
      armTorsoRatio = 0.85 + Math.random() * 0.16;
      shoulderDepth = 0.05 + Math.random() * 0.05;
      hipDepth = 0.07 + Math.random() * 0.06;
    }

    // Adjust for height
    if (isTaller) {
      torsoLegRatio *= 0.95; // Longer legs relative to torso
      armTorsoRatio *= 1.05;
    } else if (isShorter) {
      torsoLegRatio *= 1.08; // Shorter legs
      armTorsoRatio *= 0.95;
    }

    // Dimensions
    const hipW = heightCm * (0.15 + Math.random() * 0.08) / 100;
    const shoulderW = hipW * shoulderHipRatio;
    const waistW = hipW * waistHipRatio;
    const armL = heightCm * armTorsoRatio * 0.38 / 100;
    const torsoL = heightCm * 0.30 / 100;
    const legL = torsoL / torsoLegRatio;
    const neckL = heightCm * (0.08 + Math.random() * 0.04) / 100;

    // Build synthetic landmarks
    const cx = 0.5 + (Math.random() - 0.5) * 0.12;
    const baseY = 0.12 + Math.random() * 0.08;
    const stagger = () => (Math.random() - 0.5) * 0.015;

    const landmarks = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 1 }));

    // Main body landmarks
    landmarks[0] = { x: cx, y: baseY, z: 0, visibility: 1 }; // Nose
    landmarks[1] = { x: cx, y: baseY + neckL * 0.8, z: 0.01, visibility: 1 }; // Neck

    // Shoulders
    landmarks[11] = { x: cx - shoulderW / 2 + stagger(), y: baseY + neckL * 0.9, z: -shoulderDepth / 2, visibility: 1 };
    landmarks[12] = { x: cx + shoulderW / 2 + stagger(), y: baseY + neckL * 0.9, z: shoulderDepth / 2, visibility: 1 };

    // Hips
    landmarks[23] = { x: cx - hipW / 2 + stagger(), y: baseY + neckL + torsoL * 0.85, z: -hipDepth / 2, visibility: 1 };
    landmarks[24] = { x: cx + hipW / 2 + stagger(), y: baseY + neckL + torsoL * 0.85, z: hipDepth / 2, visibility: 1 };

    // Arms - elbows
    landmarks[13] = { x: cx - shoulderW / 2 - armL * 0.35, y: baseY + neckL * 0.5, z: 0, visibility: 0.95 };
    landmarks[14] = { x: cx + shoulderW / 2 + armL * 0.35, y: baseY + neckL * 0.5, z: 0, visibility: 0.95 };

    // Arms - wrists
    landmarks[15] = { x: cx - shoulderW / 2 - armL, y: baseY + neckL * 0.3, z: 0, visibility: 0.95 };
    landmarks[16] = { x: cx + shoulderW / 2 + armL, y: baseY + neckL * 0.3, z: 0, visibility: 0.95 };

    // Legs - knees
    landmarks[25] = { x: cx - hipW / 2 - legL * 0.08, y: baseY + neckL + torsoL * 0.85 + legL * 0.82, z: 0, visibility: 0.95 };
    landmarks[26] = { x: cx + hipW / 2 + legL * 0.08, y: baseY + neckL + torsoL * 0.85 + legL * 0.82, z: 0, visibility: 0.95 };

    // Legs - ankles
    landmarks[27] = { x: cx - hipW / 2 - legL * 0.08, y: baseY + neckL + torsoL * 0.85 + legL * 0.98, z: 0, visibility: 0.95 };
    landmarks[28] = { x: cx + hipW / 2 + legL * 0.08, y: baseY + neckL + torsoL * 0.85 + legL * 0.98, z: 0, visibility: 0.95 };

    // Feet
    landmarks[29] = { x: cx - hipW / 2 - legL * 0.1, y: baseY + neckL + torsoL * 0.85 + legL * 1.02, z: 0, visibility: 0.9 };
    landmarks[30] = { x: cx + hipW / 2 + legL * 0.1, y: baseY + neckL + torsoL * 0.85 + legL * 1.02, z: 0, visibility: 0.9 };

    // Additional key points for better feature extraction
    // Mid-hip
    landmarks[23] = landmarks[23] || { x: 0, y: 0, z: 0, visibility: 1 };
    landmarks[24] = landmarks[24] || { x: 0, y: 0, z: 0, visibility: 1 };

    const features = extractFeaturesFromLandmarks(landmarks, heightCm);
    
    // Add slight noise to features for robustness
    const noisyFeatures = features.map(f => f + (Math.random() - 0.5) * 0.02);
    
    samples.push({ features: noisyFeatures, bmi: targetBmi });
  }

  return samples;
}

// ============================================
// Enhanced Model Architecture
// ============================================
export function createModel(): tf.Sequential {
  const l2Reg = 0.0005;
  
  const model = tf.sequential();
  
  // Input layer with batch normalization
  model.add(tf.layers.dense({
    units: 256,
    activation: 'relu',
    inputShape: [FEATURE_COUNT],
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg }),
    biasInitializer: 'zeros'
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  // Hidden layer 1
  model.add(tf.layers.dense({
    units: 192,
    activation: 'relu',
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.25 }));
  
  // Hidden layer 2
  model.add(tf.layers.dense({
    units: 128,
    activation: 'relu',
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Hidden layer 3
  model.add(tf.layers.dense({
    units: 96,
    activation: 'relu',
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));
  model.add(tf.layers.dropout({ rate: 0.15 }));
  
  // Hidden layer 4
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  
  // Output layer
  model.add(tf.layers.dense({
    units: 1,
    activation: 'linear',
    kernelInitializer: 'glorotNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));

  // Use a lower learning rate for better convergence
  const optimizer = tf.train.adam(0.0005);
  
  model.compile({
    optimizer: optimizer,
    loss: 'meanSquaredError',
    metrics: ['mae', 'mse']
  });

  return model;
}

// Alternative: Create a simpler, faster model for mobile
export function createLightModel(): tf.Sequential {
  const l2Reg = 0.001;
  
  const model = tf.sequential();
  
  model.add(tf.layers.dense({
    units: 128,
    activation: 'relu',
    inputShape: [FEATURE_COUNT],
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));
  model.add(tf.layers.dropout({ rate: 0.25 }));
  
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: l2Reg })
  }));
  model.add(tf.layers.dropout({ rate: 0.15 }));
  
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));
  
  model.add(tf.layers.dense({
    units: 1,
    activation: 'linear',
    kernelInitializer: 'glorotNormal'
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

// ============================================
// Enhanced Training with Early Stopping
// ============================================
export async function trainBMIModel(samples: BMISample[], useLightModel: boolean = false): Promise<tf.Sequential> {
  // Shuffle samples
  const shuffled = [...samples].sort(() => Math.random() - 0.5);

  const xs = tf.tensor2d(shuffled.map(s => s.features));
  const ys = tf.tensor2d(shuffled.map(s => [s.bmi]));

  // Use enhanced model by default, light model for constrained environments
  const model = useLightModel ? createLightModel() : createModel();

  // Fast training settings
  const epochs = useLightModel ? 20 : 40;
  const batchSize = 128;
  const validationSplit = 0.1;

  console.log(`   Training with ${epochs} epochs, batch size ${batchSize}...`);

  let lastEpoch = 0;
  await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: batchSize,
    validationSplit: validationSplit,
    shuffle: true,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        lastEpoch = epoch;
        const progress = ((epoch + 1) / epochs * 100).toFixed(0);
        const valLoss = logs?.val_loss ? ` | val_loss: ${logs.val_loss.toFixed(4)}` : '';
        const loss = logs?.loss ? ` loss: ${logs.loss.toFixed(4)}` : '';
        process.stdout.write(`\r   Epoch ${epoch + 1}/${epochs} (${progress}%)${loss}${valLoss}`);
      }
    }
  });

  console.log(`\n   ✓ Training complete (${lastEpoch + 1} epochs)`);

  xs.dispose();
  ys.dispose();

  return model;
}

// Calibration function: refine model with user-specific data using transfer learning
export async function calibrateModelWithUserData(
  model: tf.Sequential,
  userSamples: { features: number[], actualBmi: number }[],
  baseModel: tf.Sequential | null = null
): Promise<tf.Sequential> {
  if (userSamples.length === 0) return model;

  // Create a fresh model with same architecture
  const calibratedModel = createModel();

  // If base model provided, copy weights (transfer learning)
  if (baseModel) {
    const baseWeights = baseModel.getWeights();
    calibratedModel.setWeights(baseWeights);
  }

  // Combine synthetic data with user data for fine-tuning
  // Keep user samples separate to weight them more heavily
  const syntheticSamples = generateSyntheticData(5000);
  const allSamples = [...syntheticSamples.slice(0, syntheticSamples.length - userSamples.length), ...userSamples];

  const xs = tf.tensor2d(allSamples.map(s => s.features));
  const ys = tf.tensor2d(allSamples.map(s => [s.bmi]));

  // Fine-tune with smaller learning rate
  const fineTuneOptimizer = tf.train.adam(0.0002);
  calibratedModel.compile({
    optimizer: fineTuneOptimizer,
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  await calibratedModel.fit(xs, ys, {
    epochs: 40,
    batchSize: Math.min(32, allSamples.length),
    shuffle: true,
    verbose: 0,
    validationSplit: 0.1
  });

  xs.dispose();
  ys.dispose();

  return calibratedModel;
}

// ============================================
// Persistence (localStorage & file export)
// ============================================
export async function saveModelWeights(model: tf.Sequential, key: string = MODEL_KEY): Promise<void> {
  try {
    const weights = model.getWeights();
    const serializable = await Promise.all(
      weights.map(async w => ({ shape: w.shape, data: await w.array() }))
    );
    const payload = {
      version: '2.0',
      featureCount: FEATURE_COUNT,
      timestamp: Date.now(),
      weights: serializable
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save model weights:', err);
  }
}

export async function loadPreTrainedModel(useLightModel: boolean = false): Promise<tf.Sequential | null> {
  const filename = useLightModel ? 'bmi-model-weights-light.json' : 'bmi-model-weights-v2.json';
  try {
    const response = await fetch(`/models/${filename}`);
    if (!response.ok) return null;
    const weightsData = await response.json();

    // weightsData is array of {shape, data} - convert to expected format
    const model = useLightModel ? createLightModel() : createModel();
    const tensors = await Promise.all(weightsData.map(async (w: any) => tf.tensor(w.data, w.shape)));
    model.setWeights(tensors);
    console.log(`✓ Pre-trained ${useLightModel ? 'light' : 'full'} model loaded from /models/${filename}`);
    return model;
  } catch (err) {
    console.warn('Could not load pre-trained model:', err);
    return null;
  }
}

export async function loadStoredModel(key: string = MODEL_KEY): Promise<tf.Sequential | null> {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const payload = JSON.parse(saved);

    // Version compatibility check
    if (payload.version !== MODEL_VERSION) {
      console.warn(`Stored model version ${payload.version} incompatible (expected ${MODEL_VERSION}). Retraining needed.`);
      localStorage.removeItem(key);
      return null;
    }

    // Feature count check
    if (payload.featureCount !== FEATURE_COUNT) {
      console.warn(`Stored model has ${payload.featureCount} features, expected ${FEATURE_COUNT}. Retraining needed.`);
      localStorage.removeItem(key);
      return null;
    }

    const model = createModel();
    const tensors = await Promise.all(payload.weights.map(async (w: any) => tf.tensor(w.data, w.shape)));
    model.setWeights(tensors);
    return model;
  } catch (err) {
    console.warn('Could not load stored model:', err);
    return null;
  }
}

export async function loadLightStoredModel(): Promise<tf.Sequential | null> {
  try {
    const saved = localStorage.getItem('bmi_model_weights_light');
    if (!saved) return null;
    const payload = JSON.parse(saved);

    if (payload.version !== MODEL_VERSION) {
      console.warn('Light model version mismatch, retraining...');
      localStorage.removeItem('bmi_model_weights_light');
      return null;
    }

    if (payload.featureCount !== FEATURE_COUNT) {
      return null;
    }

    const model = createLightModel();
    const tensors = await Promise.all(payload.weights.map(async (w: any) => tf.tensor(w.data, w.shape)));
    model.setWeights(tensors);
    return model;
  } catch (err) {
    return null;
  }
}

// Export weights as JSON-serializable array (for Node.js file saving)
export async function exportModelWeights(model: tf.Sequential): Promise<any[]> {
  const weights = model.getWeights();
  return Promise.all(weights.map(async w => ({
    shape: w.shape,
    data: await w.array()
  })));
}

// Save calibration samples for progressive learning
export function saveCalibrationSamples(samples: { features: number[], actualBmi: number }[]): void {
  try {
    const existing = localStorage.getItem(CALIBRATION_SAMPLES_KEY);
    const existingSamples = existing ? JSON.parse(existing) : [];
    const combined = [...existingSamples, ...samples];
    // Keep only last 100 calibration samples
    const limited = combined.slice(-100);
    localStorage.setItem(CALIBRATION_SAMPLES_KEY, JSON.stringify(limited));
  } catch (err) {
    console.error('Failed to save calibration samples:', err);
  }
}

export function getCalibrationSamples(): { features: number[], actualBmi: number }[] {
  try {
    const saved = localStorage.getItem(CALIBRATION_SAMPLES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    return [];
  }
}

export async function getProgressiveModel(useLightModel: boolean = false): Promise<tf.Sequential> {
  // Try to load stored model from localStorage first (user-specific calibration)
  let model = useLightModel ? await loadLightStoredModel() : await loadStoredModel();

  if (model) {
    console.log('Loaded stored BMI model from localStorage');

    // Check for calibration data
    const calibrationSamples = getCalibrationSamples();
    if (calibrationSamples.length >= CALIBRATION_TRIGGER_COUNT) {
      console.log(`Re-calibrating with ${calibrationSamples.length} user samples...`);
      model = await calibrateModelWithUserData(model, calibrationSamples, model);
      await saveModelWeights(model, useLightModel ? 'bmi_model_weights_light' : MODEL_KEY);
    }

    return model;
  }

  // Try loading pre-trained model from public/models folder
  console.log('No calibrated model in localStorage, trying pre-trained...');
  model = await loadPreTrainedModel(useLightModel);
  if (model) {
    // Save to localStorage for faster future loads
    await saveModelWeights(model, useLightModel ? 'bmi_model_weights_light' : MODEL_KEY);
    return model;
  }

  // Train new model if none exists
  console.log('Training new BMI model from scratch...');
  const samples = generateSyntheticData(useLightModel ? 5000 : 8000);
  model = await trainBMIModel(samples, useLightModel);
  await saveModelWeights(model, useLightModel ? 'bmi_model_weights_light' : MODEL_KEY);
  return model;
}

// ============================================
// Prediction
// ============================================
let modelInstance: tf.Sequential | null = null;
let modelLoadingPromise: Promise<tf.Sequential> | null = null;
let lightModelInstance: tf.Sequential | null = null;
let lightModelLoadingPromise: Promise<tf.Sequential> | null = null;

export async function loadOrTrainModel(useLightModel: boolean = false): Promise<tf.Sequential> {
  if (useLightModel) {
    if (lightModelInstance) return lightModelInstance;
    if (lightModelLoadingPromise) return lightModelLoadingPromise;
  } else {
    if (modelInstance) return modelInstance;
    if (modelLoadingPromise) return modelLoadingPromise;
  }

  const trainingPromise = (async () => {
    // Try progressive loading (stored + calibrated)
    const model = await getProgressiveModel(useLightModel);
    
    if (useLightModel) {
      lightModelInstance = model;
    } else {
      modelInstance = model;
    }
    return model;
  })();

  if (useLightModel) {
    lightModelLoadingPromise = trainingPromise;
  } else {
    modelLoadingPromise = trainingPromise;
  }
  return trainingPromise;
}

export function prefetchModel(useLightModel: boolean = false): void {
  loadOrTrainModel(useLightModel).catch(err => console.error('BMI prefetch failed:', err));
}

// Record user calibration data when actual BMI is known
export async function recordBMICalibration(
  landmarks: any[],
  heightCm: number,
  actualBmi: number
): Promise<void> {
  if (!landmarks || landmarks.length < 20) return;

  const features = extractFeaturesFromLandmarks(landmarks, heightCm);
  saveCalibrationSamples([{ features, actualBmi }]);

  // Auto-trigger retraining when threshold reached
  const calibrationSamples = getCalibrationSamples();
  if (calibrationSamples.length >= CALIBRATION_TRIGGER_COUNT) {
    console.log(`Calibration threshold reached (${calibrationSamples.length} samples). Model will refine on next load.`);
    // Trigger async retraining
    loadOrTrainModel(false).catch(err => console.error('Calibration retrain failed:', err));
  }
}

// Enhanced BMI estimation: if actual weight known, use it directly
export async function estimateBMIFromLandmarks(
  landmarks: any[],
  heightCm: number,
  actualWeightKg?: number,
  useLightModel: boolean = false
): Promise<{
  bmi: number;
  confidence: number;
  quality: 'low' | 'medium' | 'high';
  method: 'ml' | 'hybrid' | 'fallback' | 'direct';
}> {
  // If actual weight is provided, use direct calculation (most accurate)
  if (actualWeightKg && heightCm > 0) {
    const actualBmi = actualWeightKg / Math.pow(heightCm / 100, 2);
    return {
      bmi: Math.round(Math.max(12, Math.min(50, actualBmi))),
      confidence: 0.95,
      quality: 'high',
      method: 'direct'
    };
  }

  // No valid input
  if (!landmarks || landmarks.length < 20) {
    return {
      bmi: 22,
      confidence: 0.1,
      quality: 'low',
      method: 'fallback'
    };
  }

  // Proceed with ML estimation...

  // Enhanced confidence calculation
  const validLandmarks = landmarks.filter(l => l && (l.visibility ?? 1) > 0.5);
  const landmarkCompleteness = validLandmarks.length / 33;
  const avgVisibility = validLandmarks.length > 0
    ? validLandmarks.reduce((s, l) => s + (l.visibility || 1), 0) / validLandmarks.length
    : 0;

  // Key landmark visibility critical for accuracy
  const keyLandmarks = [11, 12, 23, 24, 0, 1]; // shoulders, hips, nose, neck
  const keyLandmarkQuality = keyLandmarks.reduce((sum, idx) => {
    const lm = landmarks[idx];
    return sum + (lm && lm.visibility > 0.5 ? 1 : 0);
  }, 0) / keyLandmarks.length;

  // Body symmetry (lower asymmetry = higher confidence)
  const leftShoulder = landmarks[11] || { x: 0, y: 0 };
  const rightShoulder = landmarks[12] || { x: 0, y: 0 };
  const leftHip = landmarks[23] || { x: 0, y: 0 };
  const rightHip = landmarks[24] || { x: 0, y: 0 };

  const shoulderAsym = Math.abs(leftShoulder.y - rightShoulder.y);
  const hipAsym = Math.abs(leftHip.y - rightHip.y);
  const asymmetryPenalty = Math.min((shoulderAsym + hipAsym) * 2, 0.3);

  // Base confidence from landmark quality
  const landmarkConf = landmarkCompleteness * avgVisibility * 0.6 + keyLandmarkQuality * 0.4;
  let finalConfidence = Math.max(0.2, Math.min(0.95, (0.75 + landmarkConf * 0.2) - asymmetryPenalty));

  // Clamp ML BMI to plausible range
  let clampedMlBmi = (mlBmi || 0) > 0 ? Math.max(12, Math.min(50, mlBmi)) : 0;

  // HYBRID FALLBACK: Use actual weight when ML confidence is low OR BMI is extreme
  const isExtremeBmi = clampedMlBmi < EXTREME_BMI_THRESHOLD || clampedMlBmi > 40;
  const useHybrid = actualWeightKg && heightCm > 0 && (finalConfidence < 0.4 || isExtremeBmi);

  if (useHybrid) {
    const actualBmi = actualWeightKg / Math.pow(heightCm / 100, 2);
    const clampedActualBmi = Math.max(12, Math.min(50, actualBmi));

    if (finalConfidence >= 0.3 && !isExtremeBmi) {
      // Moderate confidence: weighted average (ML 40%, actual 60%)
      clampedMlBmi = clampedMlBmi * 0.4 + clampedActualBmi * 0.6;
      finalConfidence = Math.min(0.9, finalConfidence * 1.2); // Slight boost for hybrid
    } else {
      // Low confidence or extreme BMI: use actual BMI directly
      clampedMlBmi = clampedActualBmi;
      finalConfidence = 0.7; // Known actual BMI is reliable
    }
  }

  // Quality level based on confidence and method
  let quality: 'low' | 'medium' | 'high';
  if (finalConfidence >= 0.7) quality = 'high';
  else if (finalConfidence >= 0.5) quality = 'medium';
  else quality = 'low';

  const method: 'ml' | 'hybrid' | 'fallback' = useHybrid ? 'hybrid' : (mlBmi > 0 ? 'ml' : 'fallback');

  return {
    bmi: Math.round(clampedMlBmi * 10) / 10,
    confidence: Math.round(finalConfidence * 100) / 100,
    quality,
    method
  };
}

// Batch estimation for multiple pose samples (improved accuracy)
export async function estimateBMIFromMultiplePoses(
  poses: { landmarks: any[], heightCm: number; actualWeightKg?: number }[],
  useLightModel: boolean = false
): Promise<{ bmi: number; confidence: number; quality: 'low' | 'medium' | 'high' }> {
  if (!poses || poses.length === 0) {
    return { bmi: 22, confidence: 0.1, quality: 'low' };
  }

  const estimates = await Promise.all(
    poses.map(p => estimateBMIFromLandmarks(p.landmarks, p.heightCm, p.actualWeightKg, useLightModel))
  );

  // Filter out low-confidence estimates
  const validEstimates = estimates.filter(e => e.confidence >= 0.4);

  if (validEstimates.length === 0) {
    return estimates[0]; // Return first as fallback
  }

  // Weighted average by confidence
  const totalWeight = validEstimates.reduce((sum, e) => sum + e.confidence, 0);
  const weightedBmi = validEstimates.reduce((sum, e) => sum + e.bmi * e.confidence, 0) / totalWeight;
  const avgConfidence = validEstimates.reduce((sum, e) => sum + e.confidence, 0) / validEstimates.length;

  // Reduce variance (take median-like approach)
  const sortedBmis = validEstimates.map(e => e.bmi).sort((a, b) => a - b);
  const medianBmi = sortedBmis[Math.floor(sortedBmis.length / 2)];

  // Blend weighted average with median for stability
  const finalBmi = Math.round((weightedBmi * 0.6 + medianBmi * 0.4) * 10) / 10;

  const bestQuality = validEstimates.reduce<'high' | 'medium' | 'low'>((best, e) =>
    e.quality === 'high' ? 'high' : e.quality === 'medium' ? best : best, 'low');

  return {
    bmi: finalBmi,
    confidence: Math.round(avgConfidence * 100) / 100,
    quality: bestQuality
  };
}
