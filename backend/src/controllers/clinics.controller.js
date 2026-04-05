import {
  searchClinics,
  getClinicById,
  compareClinics,
  getRecommendationForQuery,
  QUICK_SEARCH_TAGS,
} from '../services/clinicCatalog.service.js';

/**
 * GET /api/clinics
 * GET /api/clinics/search
 * Search clinics by condition, location, and preferences.
 */
export async function search(req, res) {
  const clinics = searchClinics(req.query);
  res.json(clinics);
}

/**
 * GET /api/clinics/recommendations
 * Infer specialty from a free-text query and return quick-search tags.
 */
export async function recommendations(req, res) {
  const query = req.query.query || req.query.q || '';
  const inferred = getRecommendationForQuery(query);
  res.json({ ...inferred, quickTags: QUICK_SEARCH_TAGS });
}

/**
 * GET  /api/clinics/compare?ids=id1,id2
 * POST /api/clinics/compare  { ids: ["id1","id2"] }
 * Compare clinics side-by-side.
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
    ids = rawIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    ({ condition, specialty, zipCode } = req.query);
  }

  if (!ids.length) {
    return res.status(400).json({ error: 'Provide at least one clinic id (use ids query or JSON body)' });
  }

  const result = compareClinics({ ids, condition, specialty, zipCode });
  res.json(result);
}

/**
 * GET /api/clinics/:id
 * Return a single clinic by ID.
 */
export async function getById(req, res) {
  const clinic = getClinicById(req.params.id);
  res.json(clinic);
}
