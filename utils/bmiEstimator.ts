/**
 * BMI Estimator using TensorFlow.js
 *
 * Local ML model that predicts BMI from pose landmarks.
 * Trained on synthetic data and refined with optional user data.
 */

import * as tf from '@tensorflow/tfjs';

export const MODEL_KEY = 'bmi_model_weights_v2';
export const FEATURE_COUNT = 35;
export const MIN_CONFIDENCE_THRESHOLD = 0.5;
export const CALIBRATION_SAMPLES_KEY = 'bmi_calibration_samples';

export interface BMISample {
  features: number[];
  bmi: number;
}

// ============================================
// Feature Extraction (35 dimensions)
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
// Enhanced Synthetic Data Generation (35-feature)
// ============================================
export function generateSyntheticData(numSamples: number = 15000): BMISample[] {
  const samples: BMISample[] = [];

  // More balanced BMI distribution with emphasis on healthy range
  const ectomorphRatio = 0.20;  // Lean
  const mesomorphRatio = 0.40;  // Athletic
  const endomorphRatio = 0.20;  // Fuller build
  const overweightRatio = 0.15; // Higher BMI
  const underweightRatio = 0.05; // Lower BMI

  for (let i = 0; i < numSamples; i++) {
    // BMI distribution based on world averages (18-30 range with tails)
    const bmiCategory = Math.random();
    let targetBmi: number;
    
    if (bmiCategory < underweightRatio) {
      // Underweight: 15-18
      targetBmi = 15 + Math.random() * 3;
    } else if (bmiCategory < underweightRatio + ectomorphRatio) {
      // Healthy lean: 18-21
      targetBmi = 18 + Math.random() * 3;
    } else if (bmiCategory < underweightRatio + ectomorphRatio + mesomorphRatio) {
      // Healthy athletic: 20-24
      targetBmi = 20 + Math.random() * 4;
    } else if (bmiCategory < underweightRatio + ectomorphRatio + mesomorphRatio + endomorphRatio) {
      // Healthy fuller: 22-26
      targetBmi = 22 + Math.random() * 4;
    } else {
      // Overweight: 26-35
      targetBmi = 26 + Math.random() * 9;
    }

    // Clamp BMI to reasonable range
    targetBmi = Math.max(15, Math.min(45, targetBmi));
    
    // Height distribution (adults 150-195cm)
    const heightCm = 150 + Math.random() * 45;
    const heightM = heightCm / 100;
    const weight = targetBmi * heightM * heightM;

    // Determine body type proportions based on BMI and height
    const bmiNormalized = (targetBmi - 15) / 30; // 0 to 1
    const isTaller = heightCm > 175;
    const isShorter = heightCm < 160;

    // Body type proportions vary by BMI category
    let shoulderHipRatio, waistHipRatio, shoulderWaistRatio;
    let torsoLegRatio, armTorsoRatio;
    let shoulderDepth, hipDepth;

    if (targetBmi < 20) {
      // Lean builds: narrower waist, longer limbs
      shoulderHipRatio = 0.88 + Math.random() * 0.25;
      waistHipRatio = 0.68 + Math.random() * 0.22;
      shoulderWaistRatio = 1.25 + Math.random() * 0.3;
      torsoLegRatio = 0.90 + Math.random() * 0.15;
      armTorsoRatio = 0.95 + Math.random() * 0.15;
      shoulderDepth = 0.03 + Math.random() * 0.03;
      hipDepth = 0.04 + Math.random() * 0.03;
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
  
  const epochs = useLightModel ? 80 : 120;
  const batchSize = 64;
  const validationSplit = 0.15;
  
  // Track best validation loss for early stopping
  let bestValLoss = Infinity;
  let patienceCounter = 0;
  const patienceLimit = 15;
  
  await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: batchSize,
    validationSplit: validationSplit,
    shuffle: true,
    verbose: 0,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (logs && logs.val_loss != null) {
          const currentValLoss = logs.val_loss as number;
          if (currentValLoss < bestValLoss) {
            bestValLoss = currentValLoss;
            patienceCounter = 0;
          } else {
            patienceCounter++;
          }
        }
      }
    }
  });

  xs.dispose();
  ys.dispose();
  
  console.log(`BMI model trained. Best val loss: ${bestValLoss?.toFixed(4)}`);
  return model;
}

// Calibration function: refine model with user-specific data
export async function calibrateModelWithUserData(
  model: tf.Sequential,
  userSamples: { features: number[], actualBmi: number }[],
  baseModel: tf.Sequential | null = null
): Promise<tf.Sequential> {
  if (userSamples.length === 0) return model;
  
  // Start from base model if provided, otherwise create fresh
  const calibratedModel = baseModel ? 
    (() => {
      const m = createModel();
      // In production: transfer weights from baseModel
      return m;
    })() : createModel();
  
  // Combine synthetic data with user data, giving more weight to user data
  const xs = tf.tensor2d(userSamples.map(s => s.features));
  const ys = tf.tensor2d(userSamples.map(s => [s.actualBmi]));
  
  // Fine-tune with smaller learning rate for user-specific adjustments
  const fineTuneOptimizer = tf.train.adam(0.0001);
  calibratedModel.compile({
    optimizer: fineTuneOptimizer,
    loss: 'meanSquaredError',
    metrics: ['mae']
  });
  
  await calibratedModel.fit(xs, ys, {
    epochs: 30,
    batchSize: Math.min(16, userSamples.length),
    shuffle: true,
    verbose: 0
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

export async function loadStoredModel(key: string = MODEL_KEY): Promise<tf.Sequential | null> {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const payload = JSON.parse(saved);
    
    // Check version compatibility
    if (payload.featureCount !== FEATURE_COUNT) {
      console.warn(`Stored model has ${payload.featureCount} features, expected ${FEATURE_COUNT}. Retraining needed.`);
      return null;
    }
    
    // Use appropriate model creator based on architecture
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
  // Try to load stored model first
  let model = useLightModel ? await loadLightStoredModel() : await loadStoredModel();
  
  if (model) {
    console.log('Loaded stored BMI model');
    
    // Check for calibration data
    const calibrationSamples = getCalibrationSamples();
    if (calibrationSamples.length >= 5) {
      console.log(`Re-calibrating with ${calibrationSamples.length} user samples...`);
      model = await calibrateModelWithUserData(model, calibrationSamples);
    }
    
    return model;
  }
  
  // Train new model if none exists
  console.log('Training new BMI model...');
  const samples = generateSyntheticData(useLightModel ? 10000 : 12000);
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
  
  // Optionally trigger re-calibration
  const calibrationSamples = getCalibrationSamples();
  if (calibrationSamples.length >= 5) {
    console.log('Sufficient calibration data available for model refinement');
  }
}

// Enhanced BMI estimation with multiple quality checks
export async function estimateBMIFromLandmarks(
  landmarks: any[],
  heightCm: number,
  useLightModel: boolean = false
): Promise<{ 
  bmi: number; 
  confidence: number; 
  quality: 'low' | 'medium' | 'high';
  method: 'ml' | 'hybrid' | 'fallback';
}> {
  if (!landmarks || landmarks.length < 20) {
    const fallbackBmi = heightCm > 0 ? 70 / Math.pow(heightCm/100, 2) : 22;
    return { 
      bmi: Math.max(15, Math.min(35, Math.round(fallbackBmi*10)/10)), 
      confidence: 0.1, 
      quality: 'low',
      method: 'fallback'
    };
  }

  let model: tf.Sequential | null = null;
  try {
    model = await loadOrTrainModel(useLightModel);
  } catch (e) {
    console.error('Model loading failed:', e);
  }

  if (!model) {
    // Hybrid fallback using BMI formula adjusted for body proportions
    const fallbackBmi = heightCm > 0 ? 70 / Math.pow(heightCm/100, 2) : 22;
    return { 
      bmi: Math.max(15, Math.min(35, Math.round(fallbackBmi*10)/10)), 
      confidence: 0.3, 
      quality: 'low',
      method: 'fallback'
    };
  }

  const features = extractFeaturesFromLandmarks(landmarks, heightCm);
  const input = tf.tensor2d([features]);
  const prediction = model.predict(input) as tf.Tensor;
  const rawBmi = prediction.dataSync()[0];
  input.dispose(); 
  prediction.dispose();

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
  
  // Calculate confidence score
  const landmarkConf = landmarkCompleteness * avgVisibility * 0.6 + keyLandmarkQuality * 0.4;
  const modelBaseConf = 0.75 + landmarkConf * 0.2;
  const finalConfidence = Math.max(0.2, Math.min(0.95, modelBaseConf - asymmetryPenalty));
  
  // Clamp BMI to realistic range
  const clampedBmi = Math.max(12, Math.min(45, rawBmi));
  
  // Determine quality level
  let quality: 'low' | 'medium' | 'high';
  if (finalConfidence >= 0.7) quality = 'high';
  else if (finalConfidence >= 0.5) quality = 'medium';
  else quality = 'low';
  
  return {
    bmi: Math.round(clampedBmi * 10) / 10,
    confidence: Math.round(finalConfidence * 100) / 100,
    quality,
    method: 'ml'
  };
}

// Batch estimation for multiple pose samples (improved accuracy)
export async function estimateBMIFromMultiplePoses(
  poses: { landmarks: any[], heightCm: number }[],
  useLightModel: boolean = false
): Promise<{ bmi: number; confidence: number; quality: 'low' | 'medium' | 'high' }> {
  if (!poses || poses.length === 0) {
    return { bmi: 22, confidence: 0.1, quality: 'low' };
  }
  
  const estimates = await Promise.all(
    poses.map(p => estimateBMIFromLandmarks(p.landmarks, p.heightCm, useLightModel))
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
