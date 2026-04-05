/**
 * insurance.service.js
 *
 * Business-logic layer for insurance plan queries.  Controllers call this;
 * this calls the model.  The separation means the model stays a thin query
 * wrapper while domain rules (404 semantics, cross-entity lookups) live here.
 */

import {
  getPlanById      as _getPlanById,
  getPlansByClinicId,
  listPlans        as _listPlans,
  getRatesForPlan  as _getRatesForPlan,
} from '../models/provider.model.js';
import { getProviders as _getProviders, getProvidersForWizard as _getProvidersForWizard } from '../models/insurance.model.js';

/**
 * List insurance plans with optional filters and pagination.
 *
 * @param {Object} query  Raw query-string params from the request
 * @returns {{ data: Object[], total: number, pagination: Object }}
 */
export function listPlans(query = {}) {
  const { state, countyFips, planType, metalLevel, coverageTier, limit, offset } = query;

  const result = _listPlans({ state, countyFips, planType, metalLevel, coverageTier, limit, offset });

  const safeLimit  = Math.min(Math.max(1, Number(limit)  || 50), 500);
  const safeOffset = Math.max(0, Number(offset) || 0);

  return {
    ...result,
    pagination: {
      total:   result.total,
      limit:   safeLimit,
      offset:  safeOffset,
      hasMore: safeOffset + safeLimit < result.total,
    },
  };
}

/**
 * Get a single plan by ID.  Throws a 404-tagged error if not found.
 *
 * @param {string} planId
 * @returns {Object}
 */
export function getPlanById(planId) {
  const plan = _getPlanById(planId);
  if (!plan) {
    const err = new Error(`Insurance plan not found: ${planId}`);
    err.status = 404;
    throw err;
  }
  return plan;
}

/**
 * Return plans that cover a clinic's county, together with the resolved
 * county FIPS code.  Throws a 404-tagged error if the clinic ID doesn't exist.
 *
 * @param {string} clinicId
 * @param {Object} paginationOpts  { limit, offset }
 * @returns {{ data: Object[], total: number, countyFips: string, pagination: Object }}
 */
/**
 * Fetch age-banded rate rows for a plan.
 * Throws 404 if the plan ID doesn't exist.
 *
 * @param {string} planId
 * @param {Object} filters  { age?, ratingArea? }
 * @returns {Array}
 */
export function getRatesForPlan(planId, filters = {}) {
  // Validate plan exists before hitting the 3.4M-row rates table
  const plan = _getPlanById(planId);
  if (!plan) {
    const err = new Error(`Insurance plan not found: ${planId}`);
    err.status = 404;
    throw err;
  }
  return _getRatesForPlan(planId, filters);
}

/**
 * Return unique insurance issuers with plan counts.
 *
 * @param {string|null} state
 * @returns {Array}
 */
export function getProviders(state = null) {
  return _getProviders(state || null);
}

/**
 * Return issuers in the wizard-friendly shape:
 *   [ { id, name, policies: [{ id, name, type }] } ]
 */
export function getProvidersForWizard(state = null) {
  return _getProvidersForWizard(state || null);
}

export function getPlansForClinic(clinicId, { limit, offset } = {}) {
  const result = getPlansByClinicId(clinicId, { limit, offset });

  if (result.countyFips === null) {
    const err = new Error(`Clinic not found: ${clinicId}`);
    err.status = 404;
    throw err;
  }

  const safeLimit  = Math.min(Math.max(1, Number(limit)  || 50), 500);
  const safeOffset = Math.max(0, Number(offset) || 0);

  return {
    ...result,
    pagination: {
      total:   result.total,
      limit:   safeLimit,
      offset:  safeOffset,
      hasMore: safeOffset + safeLimit < result.total,
    },
  };
}
