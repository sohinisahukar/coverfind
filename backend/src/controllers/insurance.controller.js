import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

/**
 * GET /api/insurance
 * Return the list of supported insurance plans.
 */
export async function list(req, res) {
  const dataPath = path.resolve(__dirname, '../../data/insurance.json');
  const plans = require(dataPath);
  res.json(plans);
}
