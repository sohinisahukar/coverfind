import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTierSummary, getAvailableStates } from '../models/insurance.model.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * GET /api/insurance
 * Returns coverage tier summary for a state (or national averages).
 * Query params:
 *   state — 2-letter state code (optional)
 */
export async function list(req, res) {
  const { state } = req.query;
  logger.info(`insurance/list  state=${state || 'national'}`);

  const tiers = getTierSummary(state || null);
  logger.success(`insurance/list  → ${tiers.length} tiers`);
  res.json({ state: state || null, tiers });
}

/**
 * GET /api/insurance/states
 * Returns list of states with available plan data.
 */
export async function states(req, res) {
  res.json(getAvailableStates());
}

/**
 * GET /api/insurance/providers
 * Return insurers with nested policies (mock catalog for UI flow).
 */
export async function listProviders(req, res) {
  const dataPath = path.resolve(__dirname, '../../data/insuranceProviders.json');
  const providers = require(dataPath);
  res.json(providers);
}
