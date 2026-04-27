/**
 * BMI Estimator using TensorFlow.js
 *
 * Local ML model that predicts BMI from pose landmarks.
 * Trained on synthetic data and refined with optional user data.
 */

import * as tf from '@tensorflow/tfjs';

export const MODEL_KEY = 'bmi_model_weights';
export const FEATURE_COUNT = 28;

export interface BMISample {
  features: number[];
  bmi: number;
}

// ============================================
// Feature Extraction (28 dimensions)
// ============================================
export function extractFeaturesFromLandmarks(landmarks: any[], heightCm: number): number[] {
  if (!landmarks || landmarks.length < 33) {
    return new Array(FEATURE_COUNT).fill(0);
  }

  const get = (idx: number) => landmarks[idx] || { x: 0, y: 0, z: 0 };

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

  const torsoHeight = Math.max(Math.abs(nose.y - leftAnkle.y), 0.1);
  const norm = torsoHeight;

  // Original 16 features
  const shoulderWidth = (rightShoulder.x - leftShoulder.x) / norm;
  const hipWidth = (rightHip.x - leftHip.x) / norm;
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const waistX = shoulderMidX * 0.7 + hipMidX * 0.3;
  const waistWidth = Math.abs(waistX * 2 - (leftHip.x + rightHip.x)) / norm;

  const leftArmLen = Math.sqrt((leftWrist.x - leftShoulder.x)**2 + (leftWrist.y - leftShoulder.y)**2) / norm;
  const rightArmLen = Math.sqrt((rightWrist.x - rightShoulder.x)**2 + (rightWrist.y - rightShoulder.y)**2) / norm;
  const armLength = (leftArmLen + rightArmLen) / 2;

  const leftLegLen = Math.sqrt((leftAnkle.x - leftHip.x)**2 + (leftAnkle.y - leftHip.y)**2) / norm;
  const rightLegLen = Math.sqrt((rightAnkle.x - rightHip.x)**2 + (rightAnkle.y - rightHip.y)**2) / norm;
  const legLength = (leftLegLen + rightLegLen) / 2;

  const torsoLen = Math.abs(leftShoulder.y - leftHip.y) / norm;

  const shoulderHipRatio = shoulderWidth / (hipWidth || 0.01);
  const waistHipRatio = waistWidth / (hipWidth || 0.01);
  const armTorsoRatio = armLength / (torsoLen || 0.01);
  const legTorsoRatio = legLength / (torsoLen || 0.01);

  const shoulderDepth = Math.abs((get(11).z || 0) - (get(12).z || 0));
  const hipDepth = Math.abs((get(23).z || 0) - (get(24).z || 0));

  const leftShoulderY = leftShoulder.y / norm;
  const leftHipY = leftHip.y / norm;
  const leftKneeY = leftKnee.y / norm;
  const heightNorm = heightCm / 100;

  // New 12 features
  const shoulderAsymY = Math.abs(leftShoulder.y - rightShoulder.y) / norm;
  const shoulderAsymX = Math.abs((leftShoulder.x + rightShoulder.x)/2 - 0.5) / norm;
  const hipAsymY = Math.abs(leftHip.y - rightHip.y) / norm;
  const hipAsymX = Math.abs((leftHip.x + rightHip.x)/2 - 0.5) / norm;
  const armAsym = Math.abs(leftArmLen - rightArmLen) / (armLength || 0.01);
  const legAsym = Math.abs(leftLegLen - rightLegLen) / (legLength || 0.01);

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

  const spineAngle = angle3(leftShoulder, leftHip, leftKnee) / Math.PI;
  const kneeAngle = angle3(leftHip, leftKnee, leftAnkle) / Math.PI;
  const elbowAngle = angle3(leftShoulder, leftElbow, leftWrist) / Math.PI;

  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;
  const bodyTilt = Math.abs(shoulderMidY - hipMidY) / (torsoLen * norm || 1);

  const armToLegRatio = armLength / (legLength || 0.01);
  const torsoToLegRatio = torsoLen / (legLength || 0.01);

  return [
    shoulderWidth, hipWidth, waistWidth, armLength, legLength, torsoLen,
    shoulderHipRatio, waistHipRatio, armTorsoRatio, legTorsoRatio,
    shoulderDepth, hipDepth,
    leftShoulderY, leftHipY, leftKneeY, heightNorm,
    shoulderAsymY, shoulderAsymX, hipAsymY, hipAsymX,
    armAsym, legAsym,
    spineAngle, kneeAngle, elbowAngle,
    bodyTilt, armToLegRatio, torsoToLegRatio
  ];
}

// ============================================
// Synthetic Data Generation (28-feature consistent)
// ============================================
export function generateSyntheticData(numSamples: number = 10000): BMISample[] {
  const samples: BMISample[] = [];

  // Body type distribution
  const ectomorphRatio = 0.25, mesomorphRatio = 0.35, endomorphRatio = 0.25;

  for (let i = 0; i < numSamples; i++) {
    const heightCm = 150 + Math.random() * 40;
    const heightM = heightCm / 100;

    // BMI distribution
    const u = (Math.random()*6).toFixed(2);
    const bmi = 15 + parseFloat(u) * (25/6);

    const weight = bmi * heightM * heightM;

    // Body type
    const r = Math.random();
    let bodyType: 'ecto'|'meso'|'endo'|'balanced';
    if (r < ectomorphRatio) bodyType = 'ecto';
    else if (r < ectomorphRatio + mesomorphRatio) bodyType = 'meso';
    else if (r < ectomorphRatio + mesomorphRatio + endomorphRatio) bodyType = 'endo';
    else bodyType = 'balanced';

    // Proportions per body type
    let sHipR, wHipR, armF, legTorsoR, shoulderDepthB;
    switch (bodyType) {
      case 'ecto':
        sHipR = 0.85 + Math.random()*0.3; wHipR = 0.65 + Math.random()*0.25;
        armF = 0.38 + Math.random()*0.04; legTorsoR = 1.25 + Math.random()*0.1;
        shoulderDepthB = 0.04; break;
      case 'meso':
        sHipR = 1.05 + Math.random()*0.45; wHipR = 0.7 + Math.random()*0.25;
        armF = 0.35 + Math.random()*0.04; legTorsoR = 1.05 + Math.random()*0.08;
        shoulderDepthB = 0.08; break;
      case 'endo':
        sHipR = 0.75 + Math.random()*0.4; wHipR = 0.8 + Math.random()*0.4;
        armF = 0.33 + Math.random()*0.04; legTorsoR = 0.85 + Math.random()*0.1;
        shoulderDepthB = 0.06; break;
      default:
        sHipR = 0.95 + Math.random()*0.3; wHipR = 0.75 + Math.random()*0.2;
        armF = 0.35 + Math.random()*0.035; legTorsoR = 1.0 + Math.random()*0.1;
        shoulderDepthB = 0.05;
    }

    const hipW = heightCm * (0.16 + Math.random()*0.06) / 100;
    const shoulderW = hipW * sHipR;
    const waistW = hipW * wHipR;
    const armL = heightCm * armF / 100;
    const legL = heightCm * (0.45 + Math.random()*0.05) / 100;
    const torsoL = legL / legTorsoR;

    // Build a minimal synthetic landmark set to reuse extractFeaturesFromLandmarks
    // Using normalized coordinates (0-1) in a T-pose
    const cx = 0.5 + (Math.random()-0.5)*0.1; // center x
    const baseY = 0.15 + Math.random()*0.1;    // top of head
    const stagger = () => (Math.random()-0.5)*0.01;

    const landmarks = new Array(33).fill(null).map(() => ({x:0,y:0,z:0,visibility:1}));

    // Nose (0)
    landmarks[0] = { x: cx, y: baseY, z: 0, visibility: 1 };
    // Shoulders (11,12)
    landmarks[11] = { x: cx - shoulderW/2 + stagger(), y: baseY + 0.05, z: -shoulderDepthB/2, visibility: 1 };
    landmarks[12] = { x: cx + shoulderW/2 + stagger(), y: baseY + 0.05, z: shoulderDepthB/2, visibility: 1 };
    // Hips (23,24)
    landmarks[23] = { x: cx - hipW/2 + stagger(), y: baseY + 0.05 + torsoL*0.9, z: -0.05, visibility: 1 };
    landmarks[24] = { x: cx + hipW/2 + stagger(), y: baseY + 0.05 + torsoL*0.9, z: 0.05, visibility: 1 };
    // Elbows (13,14)
    landmarks[13] = { x: cx - shoulderW/2 - armL*0.3, y: baseY + 0.15, z: 0, visibility: 1 };
    landmarks[14] = { x: cx + shoulderW/2 + armL*0.3, y: baseY + 0.15, z: 0, visibility: 1 };
    // Wrists (15,16)
    landmarks[15] = { x: cx - shoulderW/2 - armL, y: baseY + 0.25, z: 0, visibility: 1 };
    landmarks[16] = { x: cx + shoulderW/2 + armL, y: baseY + 0.25, z: 0, visibility: 1 };
    // Knees (25,26)
    landmarks[25] = { x: cx - hipW/2 - legL*0.1, y: baseY + 0.05 + torsoL*0.9 + legL*0.9, z: 0, visibility: 1 };
    landmarks[26] = { x: cx + hipW/2 + legL*0.1, y: baseY + 0.05 + torsoL*0.9 + legL*0.9, z: 0, visibility: 1 };
    // Ankles (27,28)
    landmarks[27] = { x: cx - hipW/2 - legL*0.1, y: baseY + 0.05 + torsoL*0.9 + legL*1.05, z: 0, visibility: 1 };
    landmarks[28] = { x: cx + hipW/2 + legL*0.1, y: baseY + 0.05 + torsoL*0.9 + legL*1.05, z: 0, visibility: 1 };

    const features = extractFeaturesFromLandmarks(landmarks, heightCm);
    samples.push({ features, bmi });
  }

  return samples;
}

// ============================================
// Model Architecture
// ============================================
export function createModel(): tf.Sequential {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 128,
    activation: 'relu',
    inputShape: [FEATURE_COUNT],
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

// ============================================
// Training
// ============================================
export async function trainBMIModel(samples: BMISample[]): Promise<tf.Sequential> {
  const xs = tf.tensor2d(samples.map(s => s.features));
  const ys = tf.tensor2d(samples.map(s => [s.bmi]));

  const model = createModel();

  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 64,
    validationSplit: 0.2,
    shuffle: true,
    verbose: 0
  });

  xs.dispose(); ys.dispose();
  return model;
}

// ============================================
// Persistence (localStorage & file export)
// ============================================
export async function saveModelWeights(model: tf.Sequential): Promise<void> {
  try {
    const weights = model.getWeights();
    const serializable = await Promise.all(
      weights.map(async w => ({ shape: w.shape, data: await w.array() }))
    );
    localStorage.setItem(MODEL_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.error('Failed to save model weights:', err);
  }
}

export async function loadStoredModel(): Promise<tf.Sequential | null> {
  try {
    const saved = localStorage.getItem(MODEL_KEY);
    if (!saved) return null;
    const weightsData = JSON.parse(saved);
    const model = createModel();
    const tensors = await Promise.all(weightsData.map(async (w: any) => tf.tensor(await w.data, w.shape)));
    model.setWeights(tensors);
    return model;
  } catch (err) {
    console.warn('Could not load stored model:', err);
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

// ============================================
// Prediction
// ============================================
let modelInstance: tf.Sequential | null = null;
let modelLoadingPromise: Promise<tf.Sequential> | null = null;

export async function loadOrTrainModel(): Promise<tf.Sequential> {
  if (modelInstance) return modelInstance;
  if (modelLoadingPromise) return modelLoadingPromise;

  const trainingPromise = (async () => {
    // Try loading from localStorage
    modelInstance = await loadStoredModel();
    if (modelInstance) {
      console.log('BMI model loaded from storage');
      return modelInstance;
    }

    // Train new model
    console.log('Training new BMI model...');
    const samples = generateSyntheticData(8000);
    const model = await trainBMIModel(samples);
    await saveModelWeights(model);
    modelInstance = model;
    return model;
  })();

  modelLoadingPromise = trainingPromise;
  return trainingPromise;
}

export function prefetchModel(): void {
  loadOrTrainModel().catch(err => console.error('BMI prefetch failed:', err));
}

export async function estimateBMIFromLandmarks(
  landmarks: any[],
  heightCm: number
): Promise<{ bmi: number; confidence: number }> {
  if (!landmarks || landmarks.length < 20) {
    return { bmi: 22, confidence: 0 };
  }

  let model: tf.Sequential | null = null;
  try {
    model = await loadOrTrainModel();
  } catch (e) {
    console.error('Model loading failed:', e);
  }

  if (!model) {
    const fallbackBmi = Math.max(15, Math.min(35, heightCm > 0 ? 70 / Math.pow(heightCm/100, 2) : 22));
    return { bmi: Math.round(fallbackBmi*10)/10, confidence: 0.3 };
  }

  const features = extractFeaturesFromLandmarks(landmarks, heightCm);
  const input = tf.tensor2d([features]);
  const prediction = model.predict(input) as tf.Tensor;
  const rawBmi = prediction.dataSync()[0];
  input.dispose(); prediction.dispose();

  // Landmark quality → confidence
  const validLandmarks = landmarks.filter(l => l && (l.visibility ?? 1) > 0.5);
  const avgVis = validLandmarks.length > 0
    ? validLandmarks.reduce((s, l) => s + (l.visibility || 1), 0) / validLandmarks.length
    : 0;
  const landmarkConf = Math.min(validLandmarks.length / 33, 1) * avgVis;

  const clampedBmi = Math.max(15, Math.min(45, rawBmi));
  const inExpectedRange = clampedBmi >= 16 && clampedBmi <= 33;
  const baseConf = 0.5 + landmarkConf * 0.45;
  const finalConf = inExpectedRange ? Math.min(0.95, baseConf + 0.05) : baseConf;

  return {
    bmi: Math.round(clampedBmi * 10) / 10,
    confidence: Math.round(finalConf * 100) / 100
  };
}
