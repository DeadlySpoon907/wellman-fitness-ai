import { generateSyntheticData, trainBMIModel, exportModelWeights } from './utils/bmiEstimator.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function trainAndSave() {
  console.log('🏋️  Generating synthetic training data (12,000 samples)...');
  const samples = generateSyntheticData(12000);

  console.log('🧠  Training enhanced BMI estimation model (35 features, 120 epochs)...');
  const model = await trainBMIModel(samples, false);

  console.log('💾  Exporting model weights...');
  const weights = await exportModelWeights(model);

  const modelsDir = join(process.cwd(), 'public', 'models');
  mkdirSync(modelsDir, { recursive: true });

  writeFileSync(
    join(modelsDir, 'bmi-model-weights-v2.json'),
    JSON.stringify(weights, null, 2)
  );

  console.log('✅  Enhanced model weights saved to public/models/bmi-model-weights-v2.json\n');
  
  // Also train light model for mobile
  console.log('🧠  Training light model for mobile/web...');
  const lightSamples = generateSyntheticData(10000);
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
