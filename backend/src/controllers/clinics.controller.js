import {
  searchClinics,
  getClinicById,
  compareClinics,
  getRecommendationForQuery,
  QUICK_SEARCH_TAGS,
} from '../services/clinicCatalog.service.js';

/**
 * GET /api/clinics/search
 * Query: q | query, location | zip, maxDistanceMi, treatmentBurden (low|moderate|high),
 *        useInsurance, useOutOfPocket, priorityWeight, costSensitivity, recoveryPreference
 *
 * priorityWeight: 0 = emphasize faster recovery, 100 = emphasize lower cost (matches landing slider).
 */
export async function search(req, res) {
  const payload = searchClinics(req.query);
  res.json(payload);
}

/**
 * GET /api/clinics/recommendations?query=...
 * Suggested specialty / condition label + quick tag presets for the landing chips.
 */
export async function recommendations(req, res) {
  const query = req.query.query ?? req.query.q ?? '';
  const inferred = getRecommendationForQuery(String(query));
  res.json({
    ...inferred,
    quickTags: QUICK_SEARCH_TAGS,
  });
}

/**
 * GET /api/clinics/compare?ids=a,b&condition=&specialty=&zipCode=
 * POST /api/clinics/compare  body: { ids: string[], condition?, specialty?, zipCode? }
 */
export async function compare(req, res) {
  let ids = req.query.ids;
  if (typeof ids === 'string') {
    ids = ids.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if ((!ids || ids.length === 0) && Array.isArray(req.body?.ids)) {
    ids = req.body.ids.map(String).filter(Boolean);
  }

  const condition = req.query.condition ?? req.body?.condition;
  const specialty = req.query.specialty ?? req.body?.specialty;
  const zipCode = req.query.zipCode ?? req.body?.zipCode ?? req.query.zip ?? req.body?.zip;

  const payload = compareClinics({
    ids,
    condition,
    specialty,
    zipCode,
  });
  res.json(payload);
}

/**
 * GET /api/clinics/:id
 */
export async function getById(req, res) {
  const clinic = getClinicById(req.params.id);
  res.json(clinic);
}
