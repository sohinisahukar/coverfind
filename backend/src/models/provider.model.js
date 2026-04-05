/**
 * provider.model.js
 *
 * Data-access layer for the insurance_plans, networks, and service_areas
 * tables.  "Provider" here refers to the insurance provider (issuer), not a
 * healthcare provider.
 *
 * All queries are prepared statements compiled once and reused, which
 * eliminates per-call parse/compile overhead on the hot search path.
 */

import { getDb } from '../services/dataLayer.service.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/index.js';

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

/**
 * Converts a raw SQLite row (snake_case) into the camelCase shape expected by
 * the rest of the application.  The sbc_* columns are nested under a single
 * `sbc` object to keep the response tidy.
 *
 * @param {Object} row
 * @returns {Object}
 */
function mapPlan(row) {
  return {
    planId:           row.plan_id,
    planName:         row.plan_name,
    issuerId:         row.issuer_id,
    issuerName:       row.issuer_name,
    planType:         row.plan_type,
    metalLevel:       row.metal_level,
    deductible:       row.deductible,
    oopMax:           row.oop_max,
    coinsurancePct:   row.coinsurance_pct,
    monthlyPremium:   row.monthly_premium,
    actuarialValue:   row.actuarial_value,
    coverageTier:     row.coverage_tier,
    networkId:        row.network_id,
    networkName:      row.network_name  ?? null,
    networkUrl:       row.network_url   ?? null,
    serviceAreaId:    row.service_area_id,
    state:            row.state,
    year:             row.year,
    referralRequired: row.referral_required === 1,
    sbc: {
      baby: {
        deductible:   row.sbc_baby_deductible,
        copay:        row.sbc_baby_copay,
        coinsurance:  row.sbc_baby_coinsurance,
      },
      diabetes: {
        deductible:   row.sbc_diabetes_deductible,
        copay:        row.sbc_diabetes_copay,
      },
      fracture: {
        deductible:   row.sbc_fracture_deductible,
        copay:        row.sbc_fracture_copay,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared SELECT fragment — keeps the column list DRY across queries
// ---------------------------------------------------------------------------
const PLAN_SELECT = `
  SELECT
    p.*,
    n.network_name,
    n.network_url
  FROM insurance_plans p
  LEFT JOIN networks n
    ON  n.network_id = p.network_id
    AND n.issuer_id  = p.issuer_id
`;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Clamp and coerce pagination params.
 * @param {*} limit
 * @param {*} offset
 * @returns {{ limit: number, offset: number }}
 */
function paginate(limit, offset) {
  const rawLimit = Number(limit);
  return {
    limit:  Math.min(
      (Number.isFinite(rawLimit) && rawLimit > 0) ? rawLimit : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    ),
    offset: Math.max(0, Number(offset) || 0),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a single plan by its CMS plan ID, with network metadata joined.
 *
 * @param {string} planId
 * @returns {Object|null}
 */
export function getPlanById(planId) {
  const row = getDb()
    .prepare(`${PLAN_SELECT} WHERE p.plan_id = ?`)
    .get(planId);
  return row ? mapPlan(row) : null;
}

/**
 * List plans with optional column filters + pagination.
 *
 * When countyFips is provided the query adds an INNER JOIN to service_areas
 * so only plans that actually cover that county are returned.  GROUP BY is
 * used to collapse the fanout caused by plans whose service area spans many
 * counties (which would otherwise produce duplicate rows).
 *
 * @param {Object}  opts
 * @param {string}  [opts.state]        Two-letter state code
 * @param {string}  [opts.countyFips]   5-digit FIPS code
 * @param {string}  [opts.planType]     HMO | PPO | EPO | POS
 * @param {string}  [opts.metalLevel]   Bronze | Silver | Gold | Platinum
 * @param {string}  [opts.coverageTier] bronze | silver | gold | premium
 * @param {number}  [opts.limit]        Rows per page (default 50, max 500)
 * @param {number}  [opts.offset]       Row offset
 * @returns {{ data: Object[], total: number }}
 */
export function listPlans({
  state,
  countyFips,
  planType,
  metalLevel,
  coverageTier,
  limit,
  offset,
} = {}) {
  const { limit: safeLimit, offset: safeOffset } = paginate(limit, offset);

  const params = [];
  const where  = [];

  // When filtering by county we must inner-join service_areas.  We use a
  // subquery to get a clean set of matching plan_ids first, then join that
  // back to insurance_plans to avoid blowing up the GROUP BY clause.
  let fromClause = `
    FROM insurance_plans p
    LEFT JOIN networks n
      ON  n.network_id = p.network_id
      AND n.issuer_id  = p.issuer_id
  `;

  if (countyFips) {
    fromClause += `
      JOIN service_areas sa
        ON  sa.service_area_id = p.service_area_id
        AND sa.issuer_id       = p.issuer_id
    `;
    where.push('sa.county_fips = ?');
    params.push(countyFips);
  }

  if (state)        { where.push('p.state        = ?'); params.push(state.toUpperCase()); }
  if (planType)     { where.push('p.plan_type     = ?'); params.push(planType); }
  if (metalLevel)   { where.push('p.metal_level   = ?'); params.push(metalLevel); }
  if (coverageTier) { where.push('p.coverage_tier = ?'); params.push(coverageTier); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // COUNT uses the same FROM + WHERE; DISTINCT plan_id guards against the
  // county fanout even in the count.
  const countSQL = `SELECT COUNT(DISTINCT p.plan_id) AS n ${fromClause} ${whereSQL}`;
  const total = getDb().prepare(countSQL).get(params).n;

  const dataSQL = `
    SELECT p.*, n.network_name, n.network_url
    ${fromClause}
    ${whereSQL}
    GROUP BY p.plan_id
    ORDER BY p.actuarial_value DESC, p.monthly_premium ASC
    LIMIT ? OFFSET ?
  `;

  const rows = getDb()
    .prepare(dataSQL)
    .all([...params, safeLimit, safeOffset]);

  return { data: rows.map(mapPlan), total };
}

/**
 * Return all plans that cover the county of the given clinic.
 * Delegates to listPlans after resolving the clinic's county_fips.
 *
 * @param {string} clinicId
 * @param {Object} paginationOpts  { limit, offset }
 * @returns {{ data: Object[], total: number, countyFips: string|null }}
 */
export function getPlansByClinicId(clinicId, { limit, offset } = {}) {
  const clinicRow = getDb()
    .prepare('SELECT county_fips FROM clinics WHERE id = ?')
    .get(clinicId);

  if (!clinicRow) return { data: [], total: 0, countyFips: null };

  const countyFips = clinicRow.county_fips;
  const result = listPlans({ countyFips, limit, offset });
  return { ...result, countyFips };
}

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

/**
 * Fetch age-banded monthly premium rows for a plan from the rates table.
 *
 * The rates table has 3.4 M rows; it is indexed on plan_id via
 * idx_rates_plan so this is a fast index-seek even at full scale.
 *
 * @param {string}  planId
 * @param {Object}  filters
 * @param {string}  [filters.age]         e.g. "40", "0-20", "Family Option"
 * @param {string}  [filters.ratingArea]  e.g. "Rating Area 1"
 * @returns {Array<{ planId, ratingArea, age, monthlyPremium }>}
 */
export function getRatesForPlan(planId, { age, ratingArea } = {}) {
  const where  = ['plan_id = ?'];
  const params = [planId];

  if (age)        { where.push('age = ?');         params.push(age); }
  if (ratingArea) { where.push('rating_area = ?'); params.push(ratingArea); }

  const rows = getDb()
    .prepare(`
      SELECT plan_id, rating_area, age, monthly_premium
      FROM   rates
      WHERE  ${where.join(' AND ')}
      ORDER  BY rating_area, age
    `)
    .all(params);

  return rows.map(r => ({
    planId:         r.plan_id,
    ratingArea:     r.rating_area,
    age:            r.age,
    monthlyPremium: r.monthly_premium,
  }));
}
