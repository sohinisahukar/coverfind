import { getClinicById as _getClinicById, searchClinicsByKeyword } from '../models/clinic.model.js';
import { haversine } from '../utils/haversine.js';

// Default center coordinates (zip 60616, near IIT/Bridgeport, Chicago)
const DEFAULT_LAT = 41.8827;
const DEFAULT_LNG = -87.6233;

/**
 * Quick-search preset tags shown in the recommendations UI.
 */
export const QUICK_SEARCH_TAGS = [
  'Primary Care',
  'Urgent Care',
  'Dental',
  'Pediatrics',
  'Behavioral Health',
  "Women's Health",
];

/**
 * Search clinics based on a query object.
 *
 * @param {Object} query
 * @param {string}  [query.q]              - Free-text search term
 * @param {string}  [query.location]       - Location string or zip code (alias: zip)
 * @param {string}  [query.zip]            - Zip code (alias for location)
 * @param {number}  [query.maxDistanceMi]  - Maximum distance in miles from center
 * @param {string}  [query.treatmentBurden] - "low" | "moderate" | "high"
 * @param {number}  [query.priorityWeight] - 0 = recovery priority, 100 = cost priority
 * @param {boolean} [query.useInsurance]
 * @param {boolean} [query.useOutOfPocket]
 * @returns {Array<Object>} Sorted array of clinic objects with distanceMiles added
 */
export function searchClinics(query = {}) {
  const {
    q,
    maxDistanceMi,
    treatmentBurden,
    priorityWeight,
  } = query;

  const weight = priorityWeight !== undefined ? Number(priorityWeight) : 50;
  const centerLat = DEFAULT_LAT;
  const centerLng = DEFAULT_LNG;

  let clinics = searchClinicsByKeyword(q);

  // Attach distance to each clinic
  clinics = clinics.map((clinic) => ({
    ...clinic,
    distanceMiles: parseFloat(
      haversine(centerLat, centerLng, clinic.lat, clinic.lng).toFixed(2)
    ),
  }));

  // Distance filter
  if (maxDistanceMi !== undefined && maxDistanceMi !== null && maxDistanceMi !== '') {
    const maxDist = Number(maxDistanceMi);
    if (!isNaN(maxDist)) {
      clinics = clinics.filter((clinic) => clinic.distanceMiles <= maxDist);
    }
  }

  // Treatment burden filter
  if (treatmentBurden) {
    clinics = clinics.filter(
      (clinic) => clinic.treatmentBurden === treatmentBurden
    );
  }

  // Scoring and sort
  const recoveryWeight = 1 - weight / 100;
  const costWeight = weight / 100;

  clinics.sort((a, b) => {
    const scoreA = recoveryWeight * a.recoveryScore + costWeight * a.costScore;
    const scoreB = recoveryWeight * b.recoveryScore + costWeight * b.costScore;
    return scoreB - scoreA;
  });

  return clinics;
}

/**
 * Find a clinic by its ID. Throws a 404 error if not found.
 *
 * @param {string} id - Clinic ID
 * @returns {Object} Clinic object
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

/**
 * Compare multiple clinics by their IDs.
 *
 * @param {Object} params
 * @param {string[]} params.ids       - Array of clinic IDs to compare
 * @param {string}  [params.condition]
 * @param {string}  [params.specialty]
 * @param {string}  [params.zipCode]
 * @returns {Array<Object>} Array of clinic objects in the order of requested IDs
 */
export function compareClinics({ ids = [] } = {}) {
  return ids.map((id) => _getClinicById(id)).filter(Boolean);
}

/**
 * Infer a specialty from a free-text query string.
 *
 * @param {string} query - User's free-text query
 * @returns {{ specialty: string, condition: string }}
 */
export function getRecommendationForQuery(query = '') {
  const q = query.toLowerCase();

  let specialty = 'General Care';

  if (/knee|back|physical therapy|rehab/.test(q)) {
    specialty = 'Physical Therapy';
  } else if (/skin|rash|dermatol/.test(q)) {
    specialty = 'Dermatology';
  } else if (/teeth|dental|cleaning/.test(q)) {
    specialty = 'Dental';
  } else if (/urgent|emergency|cut|fever/.test(q)) {
    specialty = 'Urgent Care';
  }

  return { specialty, condition: query };
}
