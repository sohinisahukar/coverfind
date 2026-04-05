/**
 * insurance.controller.js — HTTP handlers for insurance endpoints.
 *
 * Each function maps to a route in insurance.routes.js.
 * Delegates to insurance.service.js (plans, rates) and insurance.model.js
 * (tier summaries, states, provider wizard data).
 */

import { getTierSummary, getAvailableStates } from '../models/insurance.model.js';
import {
  listPlans,
  getPlanById,
  getPlansForClinic,
  getRatesForPlan,
  getProvidersForWizard,
} from '../services/insurance.service.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// GET /api/insurance
// Frontend (design-ui) calls this to get tier summaries for the sidebar filter.
// Returns { state, tiers } — same shape as the old /api/insurance/tiers endpoint.
// ---------------------------------------------------------------------------
export async function list(req, res) {
  const { state } = req.query;
  logger.info(`insurance.list  state=${state || 'national'}`);

  const result = getTierSummary(state || null);
  logger.success(`insurance.list  → ${result.length} tier(s)`);
  res.json({ state: state || null, tiers: result });
}

// ---------------------------------------------------------------------------
// GET /api/insurance/providers
// Returns the UI-catalog JSON array used by the home-page insurance wizard.
// Shape: [ { id, name, policies: [ { id, name, type } ] } ]
// ---------------------------------------------------------------------------
export async function listProviders(req, res) {
  const { state } = req.query;
  logger.info(`insurance.listProviders  state=${state || 'all'}`);

  const providers = getProvidersForWizard(state || null);

  logger.success(`insurance.listProviders  → ${providers.length} provider(s)`);
  res.json(providers);
}

// ---------------------------------------------------------------------------
// GET /api/insurance/tiers  (kept for backward compat / API docs)
// ---------------------------------------------------------------------------
export async function tiers(req, res) {
  const { state } = req.query;
  logger.info(`insurance.tiers  state=${state || 'national'}`);

  const result = getTierSummary(state || null);
  logger.success(`insurance.tiers  → ${result.length} tier(s)`);
  res.json({ state: state || null, tiers: result });
}

// ---------------------------------------------------------------------------
// GET /api/insurance/states
// ---------------------------------------------------------------------------
export async function states(req, res) {
  res.json(getAvailableStates());
}

// ---------------------------------------------------------------------------
// GET /api/insurance/by-clinic/:clinicId
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /api/insurance/:planId/rates
// ---------------------------------------------------------------------------
export async function rates(req, res) {
  const { planId } = req.params;
  const { age, ratingArea } = req.query;

  logger.info(`insurance.rates  planId="${planId}" age=${age || 'all'} area=${ratingArea || 'all'}`);

  const rows = getRatesForPlan(planId, { age, ratingArea });
  logger.success(`insurance.rates  → ${rows.length} rate row(s)`);
  res.json({ planId, rates: rows });
}

// ---------------------------------------------------------------------------
// GET /api/insurance/plans  (paginated raw plans — internal / API docs)
// ---------------------------------------------------------------------------
export async function plans(req, res) {
  const { state, countyFips, planType, metalLevel, coverageTier, limit, offset } = req.query;

  logger.info(
    `insurance.plans  state=${state || '—'} county=${countyFips || '—'} ` +
    `type=${planType || '—'} metal=${metalLevel || '—'} tier=${coverageTier || '—'} ` +
    `limit=${limit ?? 50} offset=${offset ?? 0}`
  );

  const result = listPlans(req.query);
  logger.success(`insurance.plans  → ${result.data.length} plan(s) (total ${result.total})`);
  res.json(result);
}

// ---------------------------------------------------------------------------
// GET /api/insurance/:id
// ---------------------------------------------------------------------------
export async function getById(req, res) {
  const { id } = req.params;
  logger.info(`insurance.getById  id="${id}"`);

  const plan = getPlanById(id);
  logger.success(`insurance.getById  → "${plan.planName}" (${plan.issuerName})`);
  res.json(plan);
}
