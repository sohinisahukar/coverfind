import { getTierSummary, getAvailableStates } from '../models/insurance.model.js';
import {
  listPlans,
  getPlanById,
  getPlansForClinic,
  getRatesForPlan,
} from '../services/insurance.service.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/insurance/tiers
 * Returns aggregate coverage-tier summary (Bronze / Silver / Gold / Platinum)
 * with avg premium, deductible, and OOP max for the given state (or national).
 *
 * Query params:
 *   state — 2-letter state code (optional)
 */
export async function tiers(req, res) {
  const { state } = req.query;
  logger.info(`insurance.tiers  state=${state || 'national'}`);

  const result = getTierSummary(state || null);
  logger.success(`insurance.tiers  → ${result.length} tier(s)`);
  res.json({ state: state || null, tiers: result });
}

/**
 * GET /api/insurance/states
 * Returns the list of state codes that have plan data in the DB.
 */
export async function states(req, res) {
  res.json(getAvailableStates());
}

/**
 * GET /api/insurance
 * Paginated list of individual insurance plans with optional filters.
 *
 * Query params:
 *   state, countyFips, planType, metalLevel, coverageTier, limit, offset
 */
export async function list(req, res) {
  const { state, countyFips, planType, metalLevel, coverageTier, limit, offset } = req.query;

  logger.info(
    `insurance.list  state=${state || '—'} county=${countyFips || '—'} ` +
    `type=${planType || '—'} metal=${metalLevel || '—'} tier=${coverageTier || '—'} ` +
    `limit=${limit ?? 50} offset=${offset ?? 0}`
  );

  const result = listPlans(req.query);
  logger.success(`insurance.list  → ${result.data.length} plan(s) (total ${result.total})`);
  res.json(result);
}

/**
 * GET /api/insurance/by-clinic/:clinicId
 * Returns plans that cover the county of the given clinic.
 *
 * Query params: limit, offset
 */
export async function byClinic(req, res) {
  const { clinicId } = req.params;
  const { limit, offset } = req.query;

  logger.info(`insurance.byClinic  clinicId="${clinicId}" limit=${limit ?? 50} offset=${offset ?? 0}`);

  const result = getPlansForClinic(clinicId, { limit, offset });
  logger.success(
    `insurance.byClinic  → ${result.data.length} plan(s) (total ${result.total}) ` +
    `county_fips=${result.countyFips}`
  );
  res.json(result);
}

/**
 * GET /api/insurance/:planId/rates
 * Age-banded monthly premiums for a specific plan.
 *
 * Query params:
 *   age        — e.g. "40", "0-20", "Family Option" (optional)
 *   ratingArea — e.g. "Rating Area 1"               (optional)
 */
export async function rates(req, res) {
  const { planId } = req.params;
  const { age, ratingArea } = req.query;

  logger.info(
    `insurance.rates  planId="${planId}" age=${age || 'all'} area=${ratingArea || 'all'}`
  );

  const rows = getRatesForPlan(planId, { age, ratingArea });
  logger.success(`insurance.rates  → ${rows.length} rate row(s)`);

  res.json({ planId, rates: rows });
}

/**
 * GET /api/insurance/:id
 * Single plan detail with network metadata.
 */
export async function getById(req, res) {
  const { id } = req.params;
  logger.info(`insurance.getById  id="${id}"`);

  const plan = getPlanById(id);
  logger.success(`insurance.getById  → "${plan.planName}" (${plan.issuerName})`);
  res.json(plan);
}
