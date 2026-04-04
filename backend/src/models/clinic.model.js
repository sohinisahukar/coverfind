import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

/**
 * Loads and returns the full list of clinic objects from the static JSON data file.
 * @returns {Array<Object>} Array of clinic objects
 */
export function getClinics() {
  const dataPath = path.resolve(__dirname, '../../data/clinics.json');
  return require(dataPath);
}
