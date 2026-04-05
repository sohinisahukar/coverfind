/**
 * clinicCatalog.service.js
 *
 * Business-logic layer for clinic search and comparison.
 * Coordinates between the SQL model (filtering) and JS post-processing
 * (haversine distance, weighted scoring, pagination).
 *
 * Separation of concerns:
 *   clinic.model     → SQL filtering (keyword, state)
 *   this service     → distance computation, scoring, sorting, pagination
 *   clinics.controller → HTTP concerns only
 */

import { queryClinics, getClinicById as _getClinicById, getTopSpecialties } from '../models/clinic.model.js';
import { haversine } from '../utils/haversine.js';

// Default center: ZIP 60616 (IIT / Bridgeport, Chicago, IL)
const DEFAULT_LAT = 41.8827;
const DEFAULT_LNG = -87.6233;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

/**
 * Quick-search preset tags shown in the recommendations UI.
 * Derived from the most common specialties in the clinics table.
 * Cached after first call so the SQL only runs once.
 */
let _quickSearchTagsCache = null;
export function getQuickSearchTags() {
  if (!_quickSearchTagsCache) {
    _quickSearchTagsCache = getTopSpecialties(6);
  }
  return _quickSearchTagsCache;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search and rank clinics.
 *
 * Pipeline:
 *   1. SQL: keyword filter (name / specialties / keywords) + optional state
 *   2. JS:  compute haversine distance from user's coordinates
 *   3. JS:  filter by maxDistanceMi
 *   4. JS:  filter by treatmentBurden
 *   5. JS:  weighted score sort (recoveryScore ↔ costScore via priorityWeight)
 *   6. JS:  paginate with limit / offset
 *
 * @param {Object}  query
 * @param {string}  [query.q]               Free-text search term
 * @param {string}  [query.state]           Two-letter state code
 * @param {number}  [query.lat]             User latitude (from ZIP geocode)
 * @param {number}  [query.lng]             User longitude (from ZIP geocode)
 * @param {number}  [query.maxDistanceMi]   Distance cap in miles
 * @param {string}  [query.treatmentBurden] low | moderate | high
 * @param {number}  [query.priorityWeight]  0 = recovery-first, 100 = cost-first
 * @param {number}  [query.limit]           Default 50, max 200
 * @param {number}  [query.offset]          Default 0
 *
 * @returns {{
 *   data:       Object[],
 *   total:      number,
 *   pagination: { total, limit, offset, hasMore },
 *   center:     { lat, lng }
 * }}
 */
export function searchClinics(query = {}) {
  const {
    q,
    state,
    maxDistanceMi,
    treatmentBurden,
    priorityWeight,
    limit,
    offset,
  } = query;

  // Resolve user center — prefer explicit lat/lng (from ZIP geocode), fall back to default
  const centerLat = query.lat != null ? Number(query.lat) : DEFAULT_LAT;
  const centerLng = query.lng != null ? Number(query.lng) : DEFAULT_LNG;

  // ── 1. SQL filter ─────────────────────────────────────────────────────────
  let clinics = queryClinics({ q, state });

  // ── 2. Attach distance ────────────────────────────────────────────────────
  clinics = clinics.map(c => ({
    ...c,
    distanceMiles: parseFloat(
      haversine(centerLat, centerLng, c.lat, c.lng).toFixed(2)
    ),
  }));

  // ── 3. Distance filter ────────────────────────────────────────────────────
  const DEFAULT_MAX_DISTANCE_MI = 100;
  const maxDist = (maxDistanceMi != null && maxDistanceMi !== '')
    ? Number(maxDistanceMi)
    : DEFAULT_MAX_DISTANCE_MI;
  if (!isNaN(maxDist) && maxDist > 0) {
    clinics = clinics.filter(c => c.distanceMiles <= maxDist);
  }

  // ── 4. Treatment burden filter ────────────────────────────────────────────
  if (treatmentBurden) {
    clinics = clinics.filter(c => c.treatmentBurden === treatmentBurden);
  }

  // ── 5. Dynamic scoring from displayed fields ─────────────────────────────
  //
  // The DB's pre-computed recoveryScore/costScore are globally normalised and
  // can give clinics invisible advantages not visible in the UI.  Instead we
  // compute both dimensions from the exact same fields shown on the cards, so
  // the ranking is always explainable by what users see.
  //
  // recoveryScore (0–1): weighted from speed + outcome quality + visits + burden
  // costScore     (0–1): normalised within this filtered set  (cheapest = 1.0)

  const SPEED_MAP   = { fast: 1.0, moderate: 0.5, slow: 0.0 };
  const OUTCOME_MAP = { high: 1.0, medium: 0.5,   low: 0.0 };
  const BURDEN_MAP  = { low:  1.0, moderate: 0.5,  high: 0.0 };

  function calcRecovery(c) {
    const speed   = SPEED_MAP[c.recoverySpeed]   ?? 0.5;
    const outcome = OUTCOME_MAP[c.outcomeQuality] ?? 0.5;
    // Fewer visits = better; scale 1 visit→1.0, 10 visits→0.0
    const visits  = Math.max(0, 1 - ((c.avgVisitsNeeded || 5) - 1) / 9);
    const burden  = BURDEN_MAP[c.treatmentBurden] ?? 0.5;
    return speed * 0.35 + outcome * 0.40 + visits * 0.15 + burden * 0.10;
  }

  // Normalise per-visit cost within this filtered set only
  const costs    = clinics.map(c => c.perVisitCost || 0).filter(x => x > 0);
  const minCost  = costs.length ? Math.min(...costs) : 0;
  const maxCost  = costs.length ? Math.max(...costs) : 1;
  const costRange = maxCost - minCost || 1;

  function calcCost(c) {
    const cost = c.perVisitCost || maxCost;
    return (maxCost - cost) / costRange; // cheapest → 1.0, priciest → 0.0
  }

  // priorityWeight: 0 = pure recovery-first, 100 = pure cost-first
  const w = priorityWeight !== undefined
    ? Math.min(100, Math.max(0, Number(priorityWeight)))
    : 50;
  const recoveryWeight = 1 - w / 100;
  const costWeight     = w / 100;

  // Attach computed scores so the frontend can display them
  clinics = clinics.map(c => ({
    ...c,
    _rScore: calcRecovery(c),
    _cScore: calcCost(c),
  }));

  clinics.sort((a, b) => {
    const sA = recoveryWeight * a._rScore + costWeight * a._cScore;
    const sB = recoveryWeight * b._rScore + costWeight * b._cScore;
    return sB - sA;
  });

  // Composite score 0–100 visible on each card; strip internal _rScore/_cScore
  clinics = clinics.map(({ _rScore, _cScore, ...c }) => ({
    ...c,
    compositeScore: Math.round((recoveryWeight * _rScore + costWeight * _cScore) * 100),
  }));

  // ── 5b. Dynamic badge assignment ─────────────────────────────────────────
  // topRecommendation → rank-1 (highest composite score)
  // bestValue         → lowest perVisitCost (cheapest per visit)
  // Never double-badge the same clinic.
  let bestValueIdx = 0;
  for (let i = 1; i < clinics.length; i++) {
    if ((clinics[i].perVisitCost || Infinity) < (clinics[bestValueIdx].perVisitCost || Infinity)) {
      bestValueIdx = i;
    }
  }

  clinics = clinics.map((c, i) => ({
    ...c,
    badges: {
      topRecommendation: i === 0,
      bestValue: i === bestValueIdx && i !== 0, // don't double-badge rank-1
    },
  }));

  // ── 6. Paginate ───────────────────────────────────────────────────────────
  const total      = clinics.length;
  const safeLimit  = Math.min(Math.max(1, Number(limit)  || DEFAULT_LIMIT), MAX_LIMIT);
  const safeOffset = Math.max(0, Number(offset) || 0);

  return {
    data: clinics.slice(safeOffset, safeOffset + safeLimit),
    total,
    pagination: {
      total,
      limit:   safeLimit,
      offset:  safeOffset,
      hasMore: safeOffset + safeLimit < total,
    },
    center: { lat: centerLat, lng: centerLng },
  };
}

// ---------------------------------------------------------------------------
// Single clinic
// ---------------------------------------------------------------------------

/**
 * Fetch a clinic by ID. Throws a 404-tagged error if not found.
 *
 * @param {string} id
 * @returns {Object}
 */
export function getClinicById(id) {
  const clinic = _getClinicById(id);
  if (!clinic) {
    const err = new Error(`Clinic not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return clinic;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

/**
 * Fetch multiple clinics by ID in the order they were requested.
 * Silently drops IDs that don't resolve.
 *
 * @param {string[]} ids
 * @returns {Object[]}
 */
export function compareClinics(ids = []) {
  return ids
    .map(id => _getClinicById(id))
    .filter(Boolean)
    .map(c => ({
      ...c,
      // Strip pre-computed DB badges — compare page has no ranked context.
      badges: { topRecommendation: false, bestValue: false },
    }));
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/**
 * Infer a specialty from a free-text query by searching the keywords
 * stored in the clinics table. Finds the most common specialty among
 * clinics whose keywords match the query terms.
 *
 * @param {string} query
 * @returns {{ specialty: string, condition: string }}
 */
export function getRecommendationForQuery(query = '') {
  if (!query.trim()) return { specialty: 'Primary Care', condition: query };

  // Find clinics matching the query and count their specialties
  const matches = queryClinics({ q: query });

  if (matches.length === 0) {
    return { specialty: 'Primary Care', condition: query };
  }

  // Tally specialties across matching clinics
  const counts = {};
  for (const clinic of matches) {
    for (const spec of clinic.specialties || []) {
      counts[spec] = (counts[spec] || 0) + 1;
    }
  }

  // Return the most common specialty (excluding "Primary Care" if there's
  // a more specific match, since most clinics have Primary Care)
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let specialty = sorted[0]?.[0] || 'Primary Care';
  if (specialty === 'Primary Care' && sorted.length > 1) {
    specialty = sorted[1][0];
  }

  return { specialty, condition: query };
}
