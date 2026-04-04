import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPublicClinic, toPublicClinics } from '../models/clinic.model.js';
import { HttpError } from '../middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../../data/mockClinics.json');

let _cache = null;

function loadCatalog() {
  if (!_cache) {
    const raw = readFileSync(DATA_PATH, 'utf8');
    _cache = JSON.parse(raw);
  }
  return _cache;
}

const SPECIALTY_RULES = [
  { re: /knee|physical\s*therapy|\bpt\b|rehab/i, specialty: 'Physical Therapy', condition: 'Knee Pain' },
  { re: /dental|teeth|cleaning|dentist/i, specialty: 'General Dentistry', condition: 'Dental Cleaning' },
  { re: /rash|skin|derm|acne/i, specialty: 'Dermatology', condition: 'Skin Rash' },
  { re: /urgent|walk-?in|flu|injury/i, specialty: 'Urgent Care', condition: 'Urgent Care' },
];

export const QUICK_SEARCH_TAGS = [
  { tag: 'Physical Therapy', query: 'physical therapy knee pain', specialty: 'Physical Therapy' },
  { tag: 'Dental Cleaning', query: 'dental cleaning', specialty: 'General Dentistry' },
  { tag: 'Skin Rash', query: 'skin rash', specialty: 'Dermatology' },
  { tag: 'Urgent Care', query: 'urgent care', specialty: 'Urgent Care' },
];

function inferSpecialtyFromText(text) {
  const q = (text || '').trim();
  if (!q) {
    return { specialty: 'Primary Care', condition: 'General care' };
  }
  for (const rule of SPECIALTY_RULES) {
    if (rule.re.test(q)) {
      return { specialty: rule.specialty, condition: rule.condition };
    }
  }
  return { specialty: 'Primary Care', condition: q };
}

function normalizeBurden(v) {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase();
  if (['low', 'moderate', 'high'].includes(s)) return s;
  return null;
}

function parseBool(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return defaultValue;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function textMatchesClinic(query, clinic) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const blob = [
    clinic.name,
    ...(clinic.keywords || []),
    ...(clinic.specialties || []),
  ]
    .join(' ')
    .toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.some((t) => blob.includes(t));
}

function zipRoughMatch(searchZip, clinicZip) {
  if (!searchZip) return true;
  const z = String(searchZip).replace(/\D/g, '').slice(0, 5);
  if (z.length < 5) return true;
  const cz = String(clinicZip || '').replace(/\D/g, '').slice(0, 5);
  if (!cz) return true;
  return cz === z || cz.slice(0, 3) === z.slice(0, 3);
}

/** @returns {{ specialty: string, condition: string }} */
export function getRecommendationForQuery(query) {
  return inferSpecialtyFromText(query);
}

/**
 * Search clinics (mock catalog + heuristic ranking).
 */
export function searchClinics(params) {
  const catalog = loadCatalog();
  const query = params.q ?? params.query ?? '';
  const location = params.location ?? params.zip ?? '';
  const maxDistanceMi = clamp(parseNumber(params.maxDistanceMi, 10), 1, 100);
  const treatmentBurden = normalizeBurden(params.treatmentBurden);
  const useInsurance = parseBool(params.useInsurance, false);
  const useOutOfPocket = parseBool(params.useOutOfPocket, false);
  let priorityWeight = clamp(parseNumber(params.priorityWeight, 50), 0, 100);
  const costSensitivity = clamp(parseNumber(params.costSensitivity, 50), 0, 100);
  const recoveryPreference = clamp(parseNumber(params.recoveryPreference, 50), 0, 100);

  if (useOutOfPocket) {
    priorityWeight = clamp(priorityWeight + 15, 0, 100);
  }

  let costW = clamp(
    priorityWeight + costSensitivity * 0.35 - recoveryPreference * 0.35,
    0,
    100
  );
  const recoveryW = 100 - costW;

  const inferred = inferSpecialtyFromText(query);
  const specialtyLower = inferred.specialty.toLowerCase();

  let rows = catalog.filter((c) => {
    if (!textMatchesClinic(query, c)) return false;
    if (!zipRoughMatch(location, c.zip)) return false;
    if (c.distanceMiles > maxDistanceMi) return false;
    if (treatmentBurden && c.treatmentBurden !== treatmentBurden) return false;
    const specMatch = (c.specialties || []).some(
      (s) => s.toLowerCase() === specialtyLower
    );
    if (inferred.specialty !== 'Primary Care' && !specMatch) return false;
    return true;
  });

  if (rows.length === 0) {
    rows = catalog.filter(
      (c) =>
        zipRoughMatch(location, c.zip) &&
        c.distanceMiles <= maxDistanceMi &&
        (!treatmentBurden || c.treatmentBurden === treatmentBurden)
    );
  }

  rows = rows.map((c) => {
    const rank =
      (recoveryW / 100) * (c.recoveryScore ?? 0.5) +
      (costW / 100) * (c.costScore ?? 0.5);
    let insuranceBoost = 0;
    if (useInsurance && c.badges?.newInsurance) insuranceBoost = 0.05;
    return { ...c, _rank: rank + insuranceBoost };
  });

  rows.sort((a, b) => b._rank - a._rank);

  if (useInsurance) {
    rows.sort((a, b) => {
      const ai = a.badges?.newInsurance ? 1 : 0;
      const bi = b.badges?.newInsurance ? 1 : 0;
      if (bi !== ai) return bi - ai;
      return b._rank - a._rank;
    });
  }

  const stripped = rows.map(({ _rank, ...c }) => c);

  return {
    searchContext: {
      query: query || null,
      location: location || null,
      zipCode: location ? String(location).replace(/\D/g, '').slice(0, 5) || null : null,
      recommendedSpecialty: inferred.specialty,
      conditionLabel: inferred.condition,
    },
    filtersApplied: {
      maxDistanceMi,
      treatmentBurden: treatmentBurden || null,
      useInsurance,
      useOutOfPocket,
      priorityWeight: parseNumber(params.priorityWeight, 50),
      costSensitivity: parseNumber(params.costSensitivity, 50),
      recoveryPreference: parseNumber(params.recoveryPreference, 50),
      effectiveRanking: { recoveryWeight: recoveryW, costWeight: costW },
    },
    results: toPublicClinics(stripped),
  };
}

export function getClinicById(id) {
  const catalog = loadCatalog();
  const found = catalog.find((c) => c.id === id);
  if (!found) {
    throw new HttpError(404, `Clinic not found: ${id}`);
  }
  return toPublicClinic(found);
}

export function getClinicsByIds(ids) {
  const catalog = loadCatalog();
  const set = new Set(ids);
  const found = catalog.filter((c) => set.has(c.id));
  if (found.length !== ids.length) {
    const got = new Set(found.map((c) => c.id));
    const missing = ids.filter((i) => !got.has(i));
    throw new HttpError(404, `Unknown clinic id(s): ${missing.join(', ')}`);
  }
  return found;
}

function buildComparisonNarrative(clinics) {
  if (clinics.length < 2) return null;
  const [a, b] = clinics;
  const score = (c) =>
    (c.avgVisitsNeeded ?? 10) * 120 + (c.totalCostEstimate ?? 1e9);
  const cheaperFewer = score(a) <= score(b) ? a : b;
  const other = cheaperFewer === a ? b : a;

  if (cheaperFewer.perVisitCost > other.perVisitCost) {
    return (
      `Although ${cheaperFewer.name} has a higher per-session cost, patients often complete care in fewer visits ` +
      `with ${cheaperFewer.avgVisitsNeeded} estimated visits versus ${other.avgVisitsNeeded} at ${other.name}, ` +
      `for a lower estimated total of ~$${cheaperFewer.totalCostEstimate} compared to ~$${other.totalCostEstimate}.`
    );
  }

  return (
    `${cheaperFewer.name} has fewer required visits (${cheaperFewer.avgVisitsNeeded} vs ${other.avgVisitsNeeded}), ` +
    `${cheaperFewer.recoverySpeed} recovery versus ${other.recoverySpeed}, and lower overall estimated cost ` +
    `(~$${cheaperFewer.totalCostEstimate} vs ~$${other.totalCostEstimate}) compared to ${other.name}.`
  );
}

function buildSummaryLine(clinics) {
  if (clinics.length < 2) return null;
  const [a, b] = clinics;
  return (
    `${a.name} vs ${b.name}: compare visits, recovery, outcome quality, and estimated total cost to pick the best fit.`
  );
}

/**
 * Side-by-side compare payload for the Care Compass comparison screens.
 */
export function compareClinics({ ids, condition, specialty, zipCode }) {
  if (!ids || !Array.isArray(ids)) {
    throw new HttpError(
      400,
      'Provide ids as a comma-separated query (?ids=a,b) or JSON array in the body.'
    );
  }
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length < 2 || uniqueIds.length > 5) {
    throw new HttpError(
      400,
      'Provide between 2 and 5 distinct clinic ids (e.g. ids=id1,id2).'
    );
  }

  const clinics = getClinicsByIds(uniqueIds);
  const inferred = condition && specialty
    ? { condition, specialty }
    : inferSpecialtyFromText(condition || specialty || '');

  const searchContext = {
    condition: condition || inferred.condition,
    specialty: specialty || inferred.specialty,
    zipCode: zipCode ? String(zipCode).replace(/\D/g, '').slice(0, 5) : null,
  };

  const publicClinics = toPublicClinics(clinics);

  return {
    searchContext,
    clinics: publicClinics,
    recommendationText: buildComparisonNarrative(clinics),
    summaryLine: buildSummaryLine(clinics),
    comparisonChartData: {
      metric: 'totalCostEstimate',
      unit: 'USD',
      points: publicClinics.map((c) => ({
        id: c.id,
        name: c.name,
        totalCostEstimate: c.totalCostEstimate,
      })),
    },
  };
}
