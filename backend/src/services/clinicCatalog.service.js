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

import { queryClinics, getClinicById as _getClinicById } from '../models/clinic.model.js';
import { haversine } from '../utils/haversine.js';

// Default center: ZIP 60616 (IIT / Bridgeport, Chicago, IL)
const DEFAULT_LAT = 41.8827;
const DEFAULT_LNG = -87.6233;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

/**
 * Quick-search preset tags shown in the recommendations UI.
 * Populated from the backend so the frontend stays in sync.
 */
export const QUICK_SEARCH_TAGS = [
  'Primary Care',
  'Urgent Care',
  'Dental',
  'Pediatrics',
  'Behavioral Health',
  "Women's Health",
];

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
  if (maxDistanceMi != null && maxDistanceMi !== '') {
    const maxDist = Number(maxDistanceMi);
    if (!isNaN(maxDist) && maxDist > 0) {
      clinics = clinics.filter(c => c.distanceMiles <= maxDist);
    }
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
 * Infer a specialty from a free-text query for the recommendations endpoint.
 *
 * @param {string} query
 * @returns {{ specialty: string, condition: string }}
 */
export function getRecommendationForQuery(query = '') {
  const q = query.toLowerCase();

  let specialty = 'Primary Care';

  if      (/knee|back|shoulder|physical.?therapy|rehab|joint/.test(q))  specialty = 'Physical Therapy';
  else if (/skin|rash|acne|eczema|dermatol/.test(q))                    specialty = 'Dermatology';
  else if (/teeth|tooth|dental|cleaning|cavity|gum/.test(q))            specialty = 'Dental';
  else if (/urgent|emergency|cut|fever|sprain/.test(q))                 specialty = 'Urgent Care';
  else if (/child|pedi|kid|infant|baby/.test(q))                        specialty = 'Pediatrics';
  else if (/mental|anxiety|depress|behav|psych|counsel/.test(q))        specialty = 'Behavioral Health';
  else if (/women|prenatal|obgyn|ob-gyn|pregnancy/.test(q))             specialty = "Women's Health";

  return { specialty, condition: query };
}
