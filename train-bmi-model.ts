import { generateSyntheticData, trainBMIModel, exportModelWeights } from './utils/bmiEstimator.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function trainAndSave() {
  console.log('🏋️  Generating synthetic training data (8,000 samples)...');
  const samples = generateSyntheticData(8000);

  console.log('🧠  Training BMI estimation model (28 features, 50 epochs)...');
  const model = await trainBMIModel(samples);

  console.log('💾  Exporting model weights...');
  const weights = await exportModelWeights(model);

  const modelsDir = join(process.cwd(), 'public', 'models');
  mkdirSync(modelsDir, { recursive: true });

  writeFileSync(
    join(modelsDir, 'bmi-model-weights.json'),
    JSON.stringify(weights, null, 2)
  );

  console.log('✅  Model weights saved to public/models/bmi-model-weights.json\n');

  model.dispose();
}

trainAndSave().catch(err => {
  console.error('❌ Training failed:', err);
  process.exit(1);
});
