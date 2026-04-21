import { generateSyntheticData, trainBMIModel, exportModelWeights, saveWeights } from './src/utils/bmiEstimator.ts';

async function trainAndSave() {
  console.log('Generating synthetic training data...');
  const samples = generateSyntheticData(20000);

  console.log('Training BMI estimation model...');
  const model = await trainBMIModel(samples);

  console.log('Exporting model weights...');
  const weights = exportModelWeights(model);

  // Save weights to JSON file in public/models/
  import { writeFileSync, mkdirSync } from 'fs';
  import { join } from 'path';

  const modelsDir = join(process.cwd(), 'public', 'models');
  mkdirSync(modelsDir, { recursive: true });

  writeFileSync(
    join(modelsDir, 'bmi-model-weights.json'),
    JSON.stringify(weights, null, 2)
  );

  console.log('Model weights saved to public/models/bmi-model-weights.json');

  // Clean up
  (model as any).dispose();
}

trainAndSave().catch(console.error);
