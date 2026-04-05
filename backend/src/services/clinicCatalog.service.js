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
  const usingDefaultLocation = query.lat == null || query.lng == null;
  const centerLat = !usingDefaultLocation ? Number(query.lat) : DEFAULT_LAT;
  const centerLng = !usingDefaultLocation ? Number(query.lng) : DEFAULT_LNG;

  // ── 1. SQL filter ─────────────────────────────────────────────────────────
  const rawClinics = queryClinics({ q, state });
  // Deduplicate by ID — the DB can contain duplicate rows for the same clinic
  const seen = new Set();
  let clinics = rawClinics.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // ── 2. Attach distance ────────────────────────────────────────────────────
  clinics = clinics.map(c => ({
    ...c,
    distanceMiles: parseFloat(
      haversine(centerLat, centerLng, c.lat, c.lng).toFixed(2)
    ),
  }));

  // ── 3. Distance filter ────────────────────────────────────────────────────
  const DEFAULT_MAX_DISTANCE_MI = 100;
  const rawDist = (maxDistanceMi != null && maxDistanceMi !== '') ? Number(maxDistanceMi) : null;
  // Clamp negative/invalid values to default — never skip the filter entirely
  const maxDist = (rawDist != null && Number.isFinite(rawDist) && rawDist > 0)
    ? rawDist
    : DEFAULT_MAX_DISTANCE_MI;
  clinics = clinics.filter(c => c.distanceMiles <= maxDist);

  // ── 4. Treatment burden filter ────────────────────────────────────────────
  if (treatmentBurden) {
    clinics = clinics.filter(c => c.treatmentBurden === treatmentBurden);
  }

  // ── 5. Weighted score sort ────────────────────────────────────────────────
  // priorityWeight (0–100) controls the recovery-vs-cost tradeoff:
  //   0   = pure recovery-first  (fastest healing, best outcomes)
  //   50  = equal weight (default)
  //   100 = pure cost-first (lowest estimated total cost)
  //
  // Formula: score = (1 - w) * recoveryScore + w * costScore
  // Both recoveryScore and costScore are 0–1 floats from the DB.
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

  // ── 6. Paginate ───────────────────────────────────────────────────────────
  const total      = clinics.length;
  const rawLimit   = Number(limit);
  const safeLimit  = Math.min(
    (Number.isFinite(rawLimit) && rawLimit > 0) ? rawLimit : DEFAULT_LIMIT,
    MAX_LIMIT
  );
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
    usingDefaultLocation,
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

  // Score each specialty: prefer direct query-word matches, deprioritize generics.
  // This prevents "Urgent Care" from winning when all specialties tie in count.
  const GENERIC = new Set(['Primary Care', 'Urgent Care']);
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = Object.entries(counts).map(([spec, cnt]) => {
    const specWords = spec.toLowerCase().split(/\s+/);
    const directMatch = queryWords.some(w =>
      specWords.some(s => s.includes(w) || w.includes(s))
    );
    return { spec, cnt, directMatch, generic: GENERIC.has(spec) };
  });
  scored.sort((a, b) => {
    // 1. Direct query matches first
    if (a.directMatch !== b.directMatch) return a.directMatch ? -1 : 1;
    // 2. Non-generic before generic
    if (a.generic !== b.generic) return a.generic ? 1 : -1;
    // 3. Higher count wins
    return b.cnt - a.cnt;
  });
  const specialty = scored[0]?.spec || 'Primary Care';

  return { specialty, condition: query };
}
