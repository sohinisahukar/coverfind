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

  // ── 5. Weighted score sort ────────────────────────────────────────────────
  // priorityWeight: 0 = pure recovery, 100 = pure cost
  const w = priorityWeight !== undefined
    ? Math.min(100, Math.max(0, Number(priorityWeight)))
    : 50;
  const recoveryWeight = 1 - w / 100;
  const costWeight     = w / 100;

  clinics.sort((a, b) => {
    const sA = recoveryWeight * (a.recoveryScore || 0) + costWeight * (a.costScore || 0);
    const sB = recoveryWeight * (b.recoveryScore || 0) + costWeight * (b.costScore || 0);
    return sB - sA;
  });

  // ── 5b. Dynamic badge reassignment ───────────────────────────────────────
  // Clear pre-computed badges; assign based on actual ranked results.
  // topRecommendation → rank-1 clinic (highest weighted score)
  // bestValue         → clinic with highest costScore (cheapest per visit)
  let bestValueIdx = 0;
  for (let i = 1; i < clinics.length; i++) {
    if ((clinics[i].costScore || 0) > (clinics[bestValueIdx].costScore || 0)) {
      bestValueIdx = i;
    }
  }
  clinics = clinics.map((c, i) => ({
    ...c,
    badges: {
      ...(c.badges || {}),
      topRecommendation: i === 0,
      bestValue: i === bestValueIdx,
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
  return ids.map(id => _getClinicById(id)).filter(Boolean);
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
