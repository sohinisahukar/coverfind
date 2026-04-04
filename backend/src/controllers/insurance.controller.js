import { getTierSummary, getAvailableStates } from '../models/insurance.model.js';
import { logger } from '../utils/logger.js';

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
