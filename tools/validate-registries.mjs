// Validates all data registries. Run: npm run validate:data
import { validateRegistries } from '../src/data/index.js';
const errors = validateRegistries();
if (errors.length) {
  console.error('REGISTRY VALIDATION FAILED');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('Registries valid.');
