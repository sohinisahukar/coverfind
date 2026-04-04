import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/careculator.db');

let _db = null;
function db() {
  if (!_db) _db = new Database(DB_PATH, { readonly: true });
  return _db;
}

/**
 * Map a raw DB row to the Clinic shape expected by the frontend.
 */
function mapRow(row) {
  let badges = { bestValue: false, topRecommendation: false, highVisits: false, newInsurance: false };
  let specialties = [];
  let keywords = [];
  let highlightTags = [];

  try { badges = JSON.parse(row.badges); } catch {}
  try { specialties = JSON.parse(row.specialties); } catch {}
  try { keywords = JSON.parse(row.keywords); } catch {}
  try { highlightTags = JSON.parse(row.highlight_tags); } catch {}

  return {
    id: row.id,
    name: row.name,
    specialties,
    keywords,
    lat: row.lat,
    lng: row.lng,
    zip: row.zip,
    avgVisitsNeeded: row.avg_visits,
    recoverySpeed: row.recovery_speed,
    outcomeQuality: row.outcome_quality,
    treatmentBurden: row.treatment_burden,
    totalCostEstimate: row.total_cost_est,
    perVisitCost: row.per_visit_cost,
    perVisitCostTier: row.per_visit_tier,
    patientSummary: row.patient_summary,
    highlightTags,
    recoveryScore: row.recovery_score,
    costScore: row.cost_score,
    badges,
  };
}

/**
 * Load all clinics from SQLite.
 * @returns {Array<Object>} Clinic objects
 */
export function getClinics() {
  const rows = db().prepare('SELECT * FROM clinics').all();
  return rows.map(mapRow);
}

/**
 * Get a single clinic by ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getClinicById(id) {
  const row = db().prepare('SELECT * FROM clinics WHERE id = ?').get(id);
  return row ? mapRow(row) : null;
}

/**
 * Search clinics by keyword using SQLite LIKE against name, specialties, keywords.
 * Returns all clinics if no query is given.
 * @param {string} [q]
 * @returns {Array<Object>}
 */
export function searchClinicsByKeyword(q) {
  if (!q || !q.trim()) {
    return getClinics();
  }
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = db().prepare('SELECT * FROM clinics').all();
  return rows
    .filter(row => {
      const name = (row.name || '').toLowerCase();
      const specs = (row.specialties || '').toLowerCase();
      const kws = (row.keywords || '').toLowerCase();
      return terms.some(t =>
        name.includes(t) || specs.includes(t) || kws.includes(t)
      );
    })
    .map(mapRow);
}
