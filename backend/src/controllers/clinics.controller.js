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
 */
export async function search(req, res) {
  const { q, priorityWeight, maxDistanceMi, treatmentBurden } = req.query;
  logger.info(`search  q="${q || ''}" priority=${priorityWeight ?? 50} maxDist=${maxDistanceMi ?? '—'} burden=${treatmentBurden || '—'}`);

  const clinics = searchClinics(req.query);
  logger.success(`search  → ${clinics.length} clinic(s) returned`);
  res.json(clinics);
}

/**
 * GET /api/clinics/recommendations
 */
export async function recommendations(req, res) {
  const query = req.query.query || req.query.q || '';
  logger.info(`recommendations  query="${query}"`);

  const inferred = getRecommendationForQuery(query);
  logger.success(`recommendations  → specialty="${inferred.specialty}"`);
  res.json({ ...inferred, quickTags: QUICK_SEARCH_TAGS });
}

/**
 * GET  /api/clinics/compare?ids=id1,id2
 * POST /api/clinics/compare  { ids: ["id1","id2"] }
 */
export async function compare(req, res) {
  let ids = [];
  let condition, specialty, zipCode;

  if (req.method === 'POST') {
    const body = req.body || {};
    ({ condition, specialty, zipCode } = body);
    ids = body.ids;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array of clinic id strings' });
    }
  } else {
    const rawIds = req.query.ids || '';
    ids = rawIds.split(',').map((s) => s.trim()).filter(Boolean);
    ({ condition, specialty, zipCode } = req.query);
  }

  logger.info(`compare  ids=[${ids.join(', ') || 'none'}]`);

  if (ids.length === 0) {
    logger.warn('compare  → no IDs provided, returning empty array');
    return res.json([]);
  }

  const result = compareClinics({ ids, condition, specialty, zipCode });
  const missing = ids.length - result.length;
  logger.success(`compare  → ${result.length} clinic(s) returned${missing ? ` (${missing} not found)` : ''}`);
  res.json(result);
}

/**
 * GET /api/clinics/:id
 */
export async function getById(req, res) {
  logger.info(`getById  id="${req.params.id}"`);
  const clinic = getClinicById(req.params.id);
  logger.success(`getById  → "${clinic.name}"`);
  res.json(clinic);
}
