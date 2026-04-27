/**
 * Train Exercise Classification Model
 *
 * Reads templates from data/exercise_model.json, generates synthetic data,
 * trains a neural network, evaluates, and saves weights.
 */

import * as tf from '@tensorflow/tfjs';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TemplateFeature {
  mean: number;
  std: number;
  min?: number;
  max?: number;
}

interface ExerciseTemplates {
  [exercise: string]: Record<string, TemplateFeature>;
}

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function generateSample(template: Record<string, TemplateFeature>): Record<string, number> {
  const features: Record<string, number> = {};
  for (const [name, stat] of Object.entries(template)) {
    let val = gaussianRandom(stat.mean, stat.std);
    features[name] = clamp(val, 0, 1);
  }
  // Basic plausibility constraints
  features.leg_length = clamp(features.leg_length || 0, 0.2, 0.8);
  features.shoulder_level = clamp(features.shoulder_level || 0, 0, 0.25);
  features.hip_level = clamp(features.hip_level || 0, 0, 0.3);
  features.body_center_x = clamp(features.body_center_x || 0.5, 0.3, 0.7);
  features.body_center_y = clamp(features.body_center_y || 0.5, 0.3, 0.7);
  return features;
}

function generateDataset(templates: ExerciseTemplates, samplesPerClass: number): Array<{features: Record<string, number>; label: string}> {
  const dataset: Array<{features: Record<string, number>; label: string}> = [];
  const exercises = Object.keys(templates);
  console.log('  Exercises:', exercises.join(', '), `(${exercises.length} classes)`);
  for (const ex of exercises) {
    const template = templates[ex];
    for (let i = 0; i < samplesPerClass; i++) {
      const base = generateSample(template);
      // jitter
      for (const k of Object.keys(base)) {
        base[k] = clamp(base[k] + (Math.random() - 0.5) * 0.01, 0, 1);
      }
      dataset.push({ features: base, label: ex });
    }
  }
  // shuffle
  for (let i = dataset.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
  }
  return dataset;
}

function getFeatureKeys(): string[] {
  return [
    'shoulder_width', 'shoulder_level', 'hip_width', 'hip_level',
    'torso_length', 'leg_length', 'body_center_x', 'body_center_y',
    'left_arm_ext', 'left_arm_height', 'right_arm_ext', 'right_arm_height'
  ];
}

function labelToOneHot(label: string, classNames: string[]): number[] {
  const idx = classNames.indexOf(label);
  const vec = new Array(classNames.length).fill(0);
  if (idx >= 0) vec[idx] = 1;
  return vec;
}

function datasetToTensors(dataset: any[], classNames: string[]) {
  const featureKeys = getFeatureKeys();
  const xs = dataset.map(s => featureKeys.map(k => s.features[k] ?? 0));
  const ys = dataset.map(s => labelToOneHot(s.label, classNames));
  return { xs: tf.tensor2d(xs), ys: tf.tensor2d(ys) };
}

async function evaluateModel(model: tf.Sequential, dataset: any[], classNames: string[], setName: string) {
  const { xs, ys } = datasetToTensors(dataset, classNames);
  const result = model.evaluate(xs, ys, { batchSize: 32 }) as tf.Tensor[];
  const loss = (result[0] as tf.Scalar).dataSync()[0];
  const acc = (result[1] as tf.Scalar).dataSync()[0];
  console.log(`\n  ${setName} Set: loss=${loss.toFixed(4)} acc=${(acc*100).toFixed(2)}%`);

  const preds = model.predict(xs) as tf.Tensor;
  const predLabels = preds.argMax(-1).arraySync() as number[];
  const trueLabels = ys.argMax(-1).arraySync() as number[];

  const stats: Record<number, {tp: number; fp: number; fn: number}> = {};
  classNames.forEach((_, i) => stats[i] = { tp: 0, fp: 0, fn: 0 });
  for (let i = 0; i < predLabels.length; i++) {
    const p = predLabels[i], t = trueLabels[i];
    if (p === t) stats[p].tp++;
    else { stats[p].fp++; stats[t].fn++; }
  }

  console.log(`    Per-class:`);
  classNames.forEach((name, i) => {
    const { tp, fp, fn } = stats[i];
    const p = tp + fp > 0 ? tp / (tp + fp) : 0;
    const r = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = p + r > 0 ? 2 * p * r / (p + r) : 0;
    console.log(`      ${name.padEnd(30)} P=${(p*100).toFixed(1)}% R=${(r*100).toFixed(1)}% F1=${(f1*100).toFixed(1)}%`);
  });

  xs.dispose(); ys.dispose(); preds.dispose(); result.forEach(t => t.dispose());
  return { loss, acc };
}

function createModel(inputDim: number, numClasses: number): tf.Sequential {
  const m = tf.sequential();
  m.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [inputDim], kernelInitializer: 'heNormal' }));
  m.add(tf.layers.dropout({ rate: 0.3 }));
  m.add(tf.layers.dense({ units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  m.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));
  m.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  return m;
}

async function saveModelWeights(model: tf.Sequential): Promise<void> {
  const weights = model.getWeights();
  const serializable = await Promise.all(weights.map(async w => ({ shape: w.shape, data: await w.array() })));
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'public', 'models');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'exercise-model-weights.json'), JSON.stringify(serializable, null, 2));
  console.log('\n✓ Saved to public/models/exercise-model-weights.json');
}

async function main() {
  console.log('🏋️ Loading templates from data/exercise_model.json...');
  const raw = readFileSync(join(process.cwd(), 'data', 'exercise_model.json'), 'utf-8');
  const data = JSON.parse(raw);
  const templates: ExerciseTemplates = data.templates;
  const classNames = Object.keys(templates);
  console.log(`  Loaded ${classNames.length} exercise classes`);

  const SAMPLES_PER_CLASS = 2000;
  const dataset = generateDataset(templates, SAMPLES_PER_CLASS);
  const train = dataset.slice(0, dataset.length * 0.7);
  const val = dataset.slice(Math.floor(dataset.length * 0.7), Math.floor(dataset.length * 0.85));
  const test = dataset.slice(Math.floor(dataset.length * 0.85));
  console.log(`  Train:${train.length} Val:${val.length} Test:${test.length}`);

  // Baseline template matcher
  let correct = 0;
  for (const s of test) {
    let best = '', bestScore = -Infinity;
    for (const ex of classNames) {
      let logP = 0;
      for (const [feat, stat] of Object.entries(templates[ex])) {
        const v = s.features[feat];
        if (v !== undefined) {
          const std = stat.std;
          if (std < 1e-8) logP += v === stat.mean ? 0 : -1e9;
          else logP += -0.5 * Math.log(2*Math.PI*std*std) - Math.pow(v - stat.mean, 2) / (2*std*std);
        }
      }
      if (logP > bestScore) { bestScore = logP; best = ex; }
    }
    if (best === s.label) correct++;
  }
  console.log(`\n📊 Baseline (template matcher): ${(correct/test.length*100).toFixed(2)}%`);

  console.log('\n🔄 Building model...');
  const model = createModel(getFeatureKeys().length, classNames.length);
  model.summary();

  const { xs, ys } = datasetToTensors(train, classNames);
  const { xs: valX, ys: valY } = datasetToTensors(val, classNames);

  console.log('\n🚀 Training...');
  await model.fit(xs, ys, {
    epochs: 100,
    batchSize: 64,
    validationData: [valX, valY],
    callbacks: tf.callbacks.earlyStopping({ monitor: 'val_acc', patience: 15 })
    // verbose: 1 is already default? let's set to 0 for less noise
    , verbose: 0
  });

  xs.dispose(); ys.dispose(); valX.dispose(); valY.dispose();

  console.log('\n✅ Training complete. Evaluating...');
  await evaluateModel(model, train, classNames, 'Train');
  await evaluateModel(model, val, classNames, 'Val');
  await evaluateModel(model, test, classNames, 'Test');

  await saveModelWeights(model);
  model.dispose();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
