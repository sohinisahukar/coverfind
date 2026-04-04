/**
 * Shared shapes for clinic API payloads (mock catalog uses the same fields).
 * Internal scoring fields `recoveryScore` / `costScore` are stripped before responding.
 */

export const RECOVERY_SPEED = ['fast', 'moderate', 'slow'];
export const OUTCOME_QUALITY = ['high', 'moderate', 'low'];
export const TREATMENT_BURDEN = ['low', 'moderate', 'high'];
export const PER_VISIT_TIER = ['low', 'moderate', 'high'];

/** @param {object} clinic Raw row from catalog (may include internal scores). */
export function toPublicClinic(clinic) {
  if (!clinic) return null;
  const { recoveryScore: _r, costScore: _c, keywords: _k, ...rest } = clinic;
  return rest;
}

export function toPublicClinics(clinics) {
  return clinics.map((c) => toPublicClinic(c));
}
