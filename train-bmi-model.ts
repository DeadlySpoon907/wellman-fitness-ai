import { generateSyntheticData, trainBMIModel, exportModelWeights } from './utils/bmiEstimator.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Fast training config
const TRAINING_SAMPLES = 2000;  // Minimal for speed
const EPOCHS = 25;              // Few epochs
const LIGHT_SAMPLES = 1500;

async function trainAndSave() {
  console.log('🏋️  Generating synthetic training data...');
  const samples = generateSyntheticData(TRAINING_SAMPLES);

  console.log(`🧠  Training BMI model (${TRAINING_SAMPLES} samples, ${EPOCHS} epochs)...`);
  console.log('   Progress: ');
  const model = await trainBMIModel(samples, false);

  console.log('💾  Exporting model weights...');
  const weights = await exportModelWeights(model);

  const modelsDir = join(process.cwd(), 'public', 'models');
  mkdirSync(modelsDir, { recursive: true });

  writeFileSync(
    join(modelsDir, 'bmi-model-weights-v2.json'),
    JSON.stringify(weights, null, 2)
  );

  console.log('✅  Enhanced model weights saved to public/models/bmi-model-weights-v2.json');
  console.log('   ⚠️  Users must clear localStorage or reload page to use new model.\n');

  // Also train light model for mobile
  console.log('🧠  Training light model for mobile/web...');
  const lightSamples = generateSyntheticData(LIGHT_SAMPLES);
  const lightModel = await trainBMIModel(lightSamples, true);
  const lightWeights = await exportModelWeights(lightModel);

  writeFileSync(
    join(modelsDir, 'bmi-model-weights-light.json'),
    JSON.stringify(lightWeights, null, 2)
  );

  console.log('✅  Light model weights saved to public/models/bmi-model-weights-light.json\n');

  model.dispose();
  lightModel.dispose();
}

trainAndSave().catch(err => {
  console.error('❌ Training failed:', err);
  process.exit(1);
});
