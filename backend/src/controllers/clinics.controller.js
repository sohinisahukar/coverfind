import {
  searchClinics,
  getClinicById,
  compareClinics,
  getRecommendationForQuery,
  QUICK_SEARCH_TAGS,
} from '../services/clinicCatalog.service.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/clinics
 * GET /api/clinics/search
 *
 * Query params: q, state, lat, lng, maxDistanceMi, treatmentBurden,
 *               priorityWeight, limit, offset
 *
 * Response: { data: Clinic[], total, pagination, center }
 */
export async function search(req, res) {
  const { q, state, lat, lng, priorityWeight, maxDistanceMi, treatmentBurden, limit, offset } = req.query;

  logger.info(
    `clinics.search  q="${q || ''}" state=${state || '—'} ` +
    `lat=${lat ?? '—'} lng=${lng ?? '—'} ` +
    `priority=${priorityWeight ?? 50} maxDist=${maxDistanceMi ?? '—'} ` +
    `burden=${treatmentBurden || '—'} limit=${limit ?? 50} offset=${offset ?? 0}`
  );

  const result = searchClinics(req.query);

  // Return flat array — frontend (design-ui) expects Clinic[], not a pagination envelope
  const clinics = Array.isArray(result) ? result : (result.data ?? []);

  logger.success(`clinics.search  → ${clinics.length} clinic(s) returned`);

  res.json(clinics);
}

/**
 * GET /api/clinics/recommendations
 *
 * Query params: query | q
 * Response: { specialty, condition, quickTags }
 */
export async function recommendations(req, res) {
  const query = req.query.query || req.query.q || '';
  logger.info(`clinics.recommendations  query="${query}"`);

  const inferred = getRecommendationForQuery(query);
  logger.success(`clinics.recommendations  → specialty="${inferred.specialty}"`);

  res.json({ ...inferred, quickTags: QUICK_SEARCH_TAGS });
}

/**
 * GET  /api/clinics/compare?ids=id1,id2
 * POST /api/clinics/compare  { ids: ["id1","id2"] }
 *
 * Response: Clinic[]  (ordered by the requested ids)
 */
export async function compare(req, res) {
  let ids = [];

  if (req.method === 'POST') {
    ids = (req.body?.ids ?? []).map(String).filter(Boolean);
  } else {
    ids = (req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  logger.info(`clinics.compare  ids=[${ids.join(', ') || 'none'}]`);

  if (ids.length === 0) {
    logger.warn('clinics.compare  → no IDs provided');
    return res.json([]);
  }

  const result = compareClinics(ids);
  const missing = ids.length - result.length;
  logger.success(
    `clinics.compare  → ${result.length} clinic(s)` +
    (missing ? ` (${missing} not found)` : '')
  );

  res.json(result);
}

/**
 * GET /api/clinics/:id
 *
 * Response: Clinic (full shape)
 */
export async function getById(req, res) {
  logger.info(`clinics.getById  id="${req.params.id}"`);

  const clinic = getClinicById(req.params.id);

  logger.success(`clinics.getById  → "${clinic.name}" (${clinic.city}, ${clinic.state})`);
  res.json(clinic);
}
