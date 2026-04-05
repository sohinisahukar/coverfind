/**
 * clinic.model.js
 *
 * Data-access layer for the clinics table.
 * All keyword filtering is pushed into SQLite so we never load the full
 * 9,323-row table into JS memory just to do string matching.
 *
 * Query construction is dynamic (term count varies) but better-sqlite3
 * caches compiled statements by SQL string, so distinct term counts
 * (0, 1, 2, …) each compile once and are reused on subsequent calls.
 */

import { getDb } from '../services/dataLayer.service.js';

// ---------------------------------------------------------------------------
// Row mapper — canonical camelCase shape for the rest of the app
// ---------------------------------------------------------------------------
function mapRow(row) {
  let badges       = { bestValue: false, topRecommendation: false, highVisits: false, newInsurance: false };
  let specialties  = [];
  let keywords     = [];
  let highlightTags = [];

  try { badges       = JSON.parse(row.badges);        } catch {}
  try { specialties  = JSON.parse(row.specialties);   } catch {}
  try { keywords     = JSON.parse(row.keywords);      } catch {}
  try { highlightTags = JSON.parse(row.highlight_tags); } catch {}

  return {
    // identity
    id:               row.id,
    name:             row.name,
    orgName:          row.org_name,
    // location — needed by the frontend map and insurance county join
    address:          row.address          || undefined,
    city:             row.city,
    state:            row.state,
    zip:              row.zip,
    lat:              row.lat,
    lng:              row.lng,
    county:           row.county           || undefined,
    countyFips:       row.county_fips      || undefined,
    // contact
    phone:            row.phone            || undefined,
    website:          row.website          || undefined,
    // specialty / search
    specialties,
    keywords,
    // clinical outcome signals
    avgVisitsNeeded:  row.avg_visits,
    recoverySpeed:    row.recovery_speed,
    recoveryDays:     row.recovery_days,
    outcomeQuality:   row.outcome_quality,
    treatmentBurden:  row.treatment_burden,
    burdenScore:      row.burden_score,
    // cost
    totalCostEstimate: row.total_cost_est,
    perVisitCost:     row.per_visit_cost,
    perVisitCostTier: row.per_visit_tier,
    // patient-facing
    patientSummary:   row.patient_summary,
    highlightTags,
    recoveryScore:    row.recovery_score,
    costScore:        row.cost_score,
    badges,
  };
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

/**
 * Build WHERE clause + params array for a multi-term keyword search.
 * Each term must match at least one of: name, specialties, keywords.
 * Multiple terms are ANDed — "knee pain" → must match both "knee" AND "pain".
 *
 * @param {string[]} terms    Lowercased search terms
 * @param {string}  [state]   Two-letter state code filter
 * @returns {{ clause: string, params: Array }}
 */
function buildWhere(terms, state) {
  const clauses = [];
  const params  = [];

  for (const term of terms) {
    const pat = `%${term}%`;
    clauses.push(
      `(LOWER(name) LIKE ? OR LOWER(specialties) LIKE ? OR LOWER(keywords) LIKE ?)`
    );
    params.push(pat, pat, pat);
  }

  if (state) {
    clauses.push('UPPER(state) = ?');
    params.push(state.toUpperCase());
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a single clinic by its HRSA ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getClinicById(id) {
  const row = getDb().prepare('SELECT * FROM clinics WHERE id = ?').get(id);
  return row ? mapRow(row) : null;
}

/**
 * Core query function — SQL-level keyword + state filtering.
 * Distance filtering and score-based sorting happen in the service layer
 * after haversine distances are computed.
 *
 * @param {Object} opts
 * @param {string}  [opts.q]      Free-text search (split into terms, ANDed)
 * @param {string}  [opts.state]  Two-letter state code
 * @returns {Object[]}  Raw clinic objects (pre-distance)
 */
export function queryClinics({ q, state } = {}) {
  const terms = q && q.trim()
    ? q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    : [];

  const { clause, params } = buildWhere(terms, state);
  const rows = getDb().prepare(`SELECT * FROM clinics ${clause}`).all(params);
  return rows.map(mapRow);
}

/**
 * Fetch multiple clinics by an array of HRSA IDs (for the compare endpoint).
 *
 * @param {string[]} ids
 * @returns {Object[]}
 */
export function getClinicsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT * FROM clinics WHERE id IN (${placeholders})`)
    .all(ids);
  return rows.map(mapRow);
}

/**
 * Return the geographic centroid for a ZIP code derived from clinics in that ZIP.
 * Returns null if the ZIP has no clinics in the DB.
 *
 * @param {string} zip  5-digit ZIP code
 * @returns {{ zip, lat, lng, city, state, county, countyFips }|null}
 */
export function getZipCentroid(zip) {
  const row = getDb()
    .prepare(`
      SELECT zip,
             ROUND(AVG(lat), 6)  AS lat,
             ROUND(AVG(lng), 6)  AS lng,
             city, state, county, county_fips
      FROM   clinics
      WHERE  zip = ?
      GROUP  BY zip
    `)
    .get(zip);

  if (!row) return null;

  return {
    zip:        row.zip,
    lat:        row.lat,
    lng:        row.lng,
    city:       row.city,
    state:      row.state,
    county:     row.county,
    countyFips: row.county_fips,
  };
}

// ---------------------------------------------------------------------------
// Legacy aliases — kept so existing service code doesn't break
// ---------------------------------------------------------------------------

export function getClinics() {
  return queryClinics();
}

export function searchClinicsByKeyword(q) {
  return queryClinics({ q });
}
