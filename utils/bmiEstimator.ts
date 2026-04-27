import * as tf from '@tensorflow/tfjs';

const MODEL_KEY = 'bmi_model_weights';
const FEATURE_COUNT = 16; // 15 proportion features + height

// Interface for training data sample
export interface BMISample {
  features: number[];
  bmi: number;
}

// Extract features from MediaPipe landmarks + user height
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
  const nose = get(0);

  // Normalization: use torso height (nose to ankle) as reference
  const torsoHeight = Math.abs(nose.y - leftAnkle.y);
  const norm = torsoHeight || 1;

  // Widths normalized
  const shoulderWidth = (rightShoulder.x - leftShoulder.x) / norm;
  const hipWidth = (rightHip.x - leftHip.x) / norm;

  // Waist (midpoint between shoulders and hips)
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const waistX = shoulderMidX * 0.7 + hipMidX * 0.3;
  const waistWidth = Math.abs(waistX * 2 - (leftHip.x + rightHip.x)) / norm;

  // Arm length
  const armLength = (Math.abs(leftShoulder.y - leftElbow.y) + Math.abs(leftElbow.y - leftWrist.y)) / norm;

  // Leg length
  const legLength = (Math.abs(leftHip.y - leftKnee.y) + Math.abs(leftKnee.y - leftAnkle.y)) / norm;

  // Torso length
  const torsoLen = Math.abs(leftShoulder.y - leftHip.y) / norm;

  // Ratios
  const shoulderHipRatio = shoulderWidth / (hipWidth || 1);
  const waistHipRatio = waistWidth / (hipWidth || 1);
  const armTorsoRatio = armLength / (torsoLen || 1);
  const legTorsoRatio = legLength / (torsoLen || 1);

  // Depth (z) differences
  const shoulderDepth = Math.abs((get(11).z || 0) - (get(12).z || 0));
  const hipDepth = Math.abs((get(23).z || 0) - (get(24).z || 0));

  // 15 proportional features + height
  return [
    shoulderWidth,
    hipWidth,
    waistWidth,
    armLength,
    legLength,
    torsoLen,
    shoulderHipRatio,
    waistHipRatio,
    armTorsoRatio,
    legTorsoRatio,
    shoulderDepth,
    hipDepth,
    leftShoulder.y,
    leftHip.y,
    leftKnee.y,
    heightCm
  ];
}

// Generate synthetic training data with diverse body types
export function generateSyntheticData(numSamples: number = 10000): BMISample[] {
  const samples: BMISample[] = [];
  
  // Distribute body types realistically
  const ectomorphRatio = 0.25;
  const mesomorphRatio = 0.35;
  const endomorphRatio = 0.25;
  const balancedRatio = 0.15;

  for (let i = 0; i < numSamples; i++) {
    const heightCm = 150 + Math.random() * 40; // 150-190 cm
    const heightM = heightCm / 100;

    // BMI from realistic distribution (slightly right-skewed)
    const u = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) / 6;
    const bmi = 15 + u * 25; // 15-40

    // Weight from BMI
    const weight = bmi * heightM * heightM;

    // Assign body type for measurement generation
    const bodyTypeRand = Math.random();
    let bodyType: 'ecto' | 'meso' | 'endo' | 'balanced';
    if (bodyTypeRand < ectomorphRatio) bodyType = 'ecto';
    else if (bodyTypeRand < ectomorphRatio + mesomorphRatio) bodyType = 'meso';
    else if (bodyTypeRand < ectomorphRatio + mesomorphRatio + endomorphRatio) bodyType = 'endo';
    else bodyType = 'balanced';

    // Measurements from anthropometric ranges scaled to body type and height
    let shoulderToHipRatio: number;
    let waistToHipRatio: number;
    let frameFactor: number;

    switch (bodyType) {
      case 'ecto':
        shoulderToHipRatio = 0.85 + Math.random() * 0.3;
        waistToHipRatio = 0.65 + Math.random() * 0.25;
        frameFactor = 0.85 + Math.random() * 0.15;
        break;
      case 'meso':
        shoulderToHipRatio = 1.05 + Math.random() * 0.45;
        waistToHipRatio = 0.7 + Math.random() * 0.25;
        frameFactor = 1.0 + Math.random() * 0.1;
        break;
      case 'endo':
        shoulderToHipRatio = 0.75 + Math.random() * 0.4;
        waistToHipRatio = 0.8 + Math.random() * 0.4;
        frameFactor = 0.95 + Math.random() * 0.1;
        break;
      case 'balanced':
        shoulderToHipRatio = 0.95 + Math.random() * 0.3;
        waistToHipRatio = 0.75 + Math.random() * 0.2;
        frameFactor = 0.95 + Math.random() * 0.1;
        break;
    }

    const hipWidth = heightCm * (0.16 + Math.random() * 0.06) / 100;
    const shoulderWidth = hipWidth * shoulderToHipRatio;
    const waistWidth = hipWidth * waistToHipRatio;

    // Arm length varies by body type
    const armLengthFactor = bodyType === 'ecto' ? 0.38 : bodyType === 'endo' ? 0.33 : 0.35;
    const armLength = heightCm * (armLengthFactor + Math.random() * 0.04) / 100;

    // Leg and torso lengths
    const legTorsoRatio = bodyType === 'ecto' ? 1.25 : bodyType === 'endo' ? 0.85 : 1.05;
    const legLength = heightCm * (0.45 + Math.random() * 0.05) / 100;
    const torsoLength = legLength / legTorsoRatio;

    // Ratios
    const shoulderHipRatio = shoulderWidth / (hipWidth || 1);
    const armTorsoRatio = armLength / (torsoLength || 1);
    const legTorsoRatioCalc = legLength / (torsoLength || 1);

    // Depth approximations
    const shoulderDepthBase = bodyType === 'meso' ? 0.08 : 0.05;
    const shoulderDepth = shoulderDepthBase + Math.random() * 0.08;
    const hipDepth = 0.05 + Math.random() * 0.1;

    // Y coordinates - simulated typical values with noise
    const leftShoulderY = 0.18 + Math.random() * 0.12;
    const leftHipY = leftShoulderY + torsoLength * 0.8 + Math.random() * 0.02;
    const leftKneeY = leftHipY + legLength * 0.9 + Math.random() * 0.02;

    const features = [
      shoulderWidth,
      hipWidth,
      waistWidth,
      armLength,
      legLength,
      torsoLength,
      shoulderHipRatio,
      waistToHipRatio,
      armTorsoRatio,
      legTorsoRatioCalc,
      shoulderDepth,
      hipDepth,
      leftShoulderY,
      leftHipY,
      leftKneeY,
      heightCm
    ];

    samples.push({ features, bmi });
  }

  return samples;
}

// Create model architecture
function createModel(): tf.Sequential {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    inputShape: [FEATURE_COUNT],
    kernelInitializer: 'heNormal'
  }));

  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

// Train the model on synthetic data
export async function trainBMIModel(samples: BMISample[]): Promise<tf.Sequential> {
  const xs = tf.tensor2d(samples.map(s => s.features));
  const ys = tf.tensor2d(samples.map(s => [s.bmi]));

  const model = createModel();

  await model.fit(xs, ys, {
    epochs: 30,
    batchSize: 32,
    validationSplit: 0.2,
    shuffle: true,
    verbose: 0
  });

  xs.dispose();
  ys.dispose();

  return model;
}

// Save model weights to localStorage (or IndexedDB)
export async function saveModelWeights(model: tf.Sequential): Promise<void> {
  try {
    const weights = model.getWeights();
    const serializable = weights.map(w => ({
      shape: w.shape,
      data: Array.from(w.dataSync())
    }));
    localStorage.setItem(MODEL_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.error('Failed to save model weights:', err);
  }
}

// Estimate BMI from landmarks + height
export async function estimateBMIFromLandmarks(landmarks: any[], heightCm: number): Promise<{ bmi: number; confidence: number }> {
  // Validate landmarks
  if (!landmarks || landmarks.length < 20) {
    return { bmi: 22, confidence: 0 };
  }

  // Try loading model
  let model: tf.Sequential | null = null;
  try {
    model = await loadOrTrainModel();
  } catch (e) {
    console.error('Model loading failed:', e);
  }

  if (!model) {
    // Fallback: use BMI from standard formula
    const bmi = Math.max(15, Math.min(35, heightCm > 0 ? (70 / Math.pow(heightCm / 100, 2)) : 22));
    return { bmi: Math.round(bmi * 10) / 10, confidence: 0.3 };
  }

  const features = extractFeaturesFromLandmarks(landmarks, heightCm);
  const input = tf.tensor2d([features]);
  const prediction = model.predict(input) as tf.Tensor;
  const rawBmi = prediction.dataSync()[0];
  input.dispose();
  prediction.dispose();

  // Calculate landmark quality metrics
  const validLandmarks = landmarks.filter(l => l && (l.visibility ?? 1) > 0.5);
  const landmarkCount = validLandmarks.length;
  const avgVisibility = validLandmarks.length > 0 
    ? validLandmarks.reduce((sum: number, l: any) => sum + (l.visibility || 1), 0) / validLandmarks.length 
    : 0;
  
  // Higher landmark visibility = higher confidence
  const landmarkConfidence = Math.min(landmarkCount / 33, 1) * avgVisibility;
  
  // Clamp to realistic range
  const clampedBmi = Math.max(15, Math.min(40, rawBmi));
  
  // Check if prediction is within expected range
  const inExpectedRange = clampedBmi >= 16 && clampedBmi <= 32;
  
  // Confidence: 0.5-0.95 based on landmark quality
  const baseConfidence = 0.5 + landmarkConfidence * 0.45;
  const finalConfidence = inExpectedRange 
    ? Math.min(0.95, baseConfidence + 0.05)
    : baseConfidence;

  return { 
    bmi: Math.round(clampedBmi * 10) / 10, 
    confidence: Math.round(finalConfidence * 100) / 100 
  };
}

// Shared model instance/promise to avoid duplicate training
let modelInstance: tf.Sequential | null = null;
let modelLoadingPromise: Promise<tf.Sequential> | null = null;

// Load model from storage or train a new one
export async function loadOrTrainModel(): Promise<tf.Sequential> {
  // Return already loaded model
  if (modelInstance) return modelInstance;

  // If a load/train operation is already in progress, return that promise
  if (modelLoadingPromise) return modelLoadingPromise;

  try {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved) {
      const weightsData = JSON.parse(saved);
      const model = createModel();
      const tensors = weightsData.map((w: any) => tf.tensor(w.data, w.shape));
      model.setWeights(tensors);
      modelInstance = model;
      return model;
    }
  } catch (err) {
    console.warn('Could not load model, training new one:', err);
  }

  // No saved model or loading failed — train a new one
  const trainingPromise = (async () => {
    const samples = generateSyntheticData(5000);
    const model = await trainBMIModel(samples);
    await saveModelWeights(model);
    modelInstance = model;
    return model;
  })();

  modelLoadingPromise = trainingPromise;
  return trainingPromise;
}

// Prefetch model in background
export function prefetchModel(): void {
  loadOrTrainModel().catch(err => console.error('Prefetch failed:', err));
}
