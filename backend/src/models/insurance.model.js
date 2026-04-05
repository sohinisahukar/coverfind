import { getDb as db } from '../services/dataLayer.service.js';

/**
 * Return coverage tier summary for a state (or national if no state given).
 * Each tier includes plan count, avg monthly premium, avg deductible, avg OOP max.
 */
export function getTierSummary(state) {
  const where = state ? 'WHERE UPPER(state) = UPPER(?)' : '';
  const params = state ? [state] : [];

  const rows = db().prepare(`
    SELECT
      coverage_tier                        AS tier,
      COUNT(*)                             AS planCount,
      ROUND(AVG(monthly_premium), 0)       AS avgPremium,
      ROUND(AVG(deductible), 0)            AS avgDeductible,
      ROUND(AVG(oop_max), 0)               AS avgOopMax,
      ROUND(AVG(coinsurance_pct) * 100, 0) AS avgCoinsurance
    FROM insurance_plans
    ${where}
    GROUP BY coverage_tier
    ORDER BY avgPremium ASC
  `).all(...params);

  // Enrich with human-readable labels and patient cost share
  const meta = {
    bronze:   { label: 'Bronze',   coveragePct: 60, color: 'amber' },
    silver:   { label: 'Silver',   coveragePct: 70, color: 'slate' },
    gold:     { label: 'Gold',     coveragePct: 80, color: 'yellow' },
    premium:  { label: 'Platinum', coveragePct: 90, color: 'sky' },
    platinum: { label: 'Platinum', coveragePct: 90, color: 'sky' },
  };

  return rows.map(r => ({
    ...r,
    ...(meta[r.tier] || { label: r.tier, coveragePct: 70, color: 'slate' }),
  }));
}

/**
 * Return the list of states that have insurance plan data.
 */
export function getAvailableStates() {
  return db()
    .prepare('SELECT DISTINCT state FROM insurance_plans WHERE state IS NOT NULL ORDER BY state')
    .all()
    .map(r => r.state);
}

/**
 * Return unique insurance issuers (providers) with plan counts.
 * Optionally filtered by state.
 *
 * @param {string|null} state  Two-letter state code or null for national
 * @returns {Array<{ issuerId, issuerName, state, planCount }>}
 */
export function getProviders(state) {
  const where = state ? 'WHERE UPPER(state) = UPPER(?)' : '';
  const params = state ? [state] : [];

  return db()
    .prepare(`
      SELECT
        issuer_id                AS issuerId,
        issuer_name              AS issuerName,
        state,
        COUNT(DISTINCT plan_id)  AS planCount
      FROM insurance_plans
      ${where}
      GROUP BY issuer_id, issuer_name, state
      ORDER BY planCount DESC, issuer_name ASC
    `)
    .all(...params);
}

/**
 * Extract the brand/company prefix from a plan name by stripping
 * metal-level, plan-type, and numeric suffixes.
 * All data comes from the DB — no hardcoded brand lists.
 */
function extractBrandFromPlanName(planName) {
  if (!planName) return null;
  const lower = planName.toLowerCase();
  const cutTokens = [
    ' bronze', ' silver', ' gold', ' platinum',
    ' hmo', ' ppo', ' epo', ' pos', ' hsa', ' hdhp',
  ];
  let cutAt = -1;
  for (const token of cutTokens) {
    const idx = lower.indexOf(token);
    if (idx > 2 && (cutAt === -1 || idx < cutAt)) {
      cutAt = idx;
    }
  }
  if (cutAt > 2) {
    let name = planName.substring(0, cutAt).trim();
    // Clean trailing noise
    name = name.replace(/[\s\-,/&$]+$/, '');
    name = name.replace(/\s+(with|for|the|a|an|w)$/i, '').trim();
    if (name.length >= 3 && !/^\d+$/.test(name)) return name;
  }
  // Try cutting before the first digit sequence (e.g. "Ambetter Essential Care 1")
  const numMatch = planName.match(/^([A-Za-z][A-Za-z\s&'.\-]+?)\s+\d/);
  if (numMatch && numMatch[1].length >= 3) {
    return numMatch[1].trim();
  }
  return null;
}

/**
 * Return insurance issuers grouped with their plan types, in the shape
 * the frontend wizard expects:
 *   [ { id, name, policies: [{ id, name, type }] } ]
 *
 * All data is derived from SQL queries — no hardcoded values.
 * Issuer names are extracted from plan_name (longest per issuer) with
 * network_name as fallback, since issuer_name only has numeric IDs.
 *
 * @param {string|null} state  Two-letter state code filter (optional)
 */
export function getProvidersForWizard(state) {
  const where = state ? 'WHERE UPPER(state) = UPPER(?)' : '';
  const params = state ? [state] : [];

  // Step 1: For each issuer, get the longest plan_name (most likely to
  // have the full brand prefix) using ROW_NUMBER() window function.
  // Also grabs network_name as a fallback.
  const nameRows = db()
    .prepare(`
      SELECT issuerId, planName, networkName FROM (
        SELECT
          p.issuer_id    AS issuerId,
          p.plan_name    AS planName,
          n.network_name AS networkName,
          ROW_NUMBER() OVER (
            PARTITION BY p.issuer_id
            ORDER BY LENGTH(p.plan_name) DESC
          ) AS rn
        FROM insurance_plans p
        LEFT JOIN networks n ON n.issuer_id = p.issuer_id
        ${where.replace('state', 'p.state')}
      ) WHERE rn = 1
    `)
    .all(...params);

  // Build name map: try plan_name brand extraction, then network_name, then plan_name raw
  const nameMap = new Map();
  for (const row of nameRows) {
    const fromPlan = extractBrandFromPlanName(row.planName);
    const name = fromPlan
      || (row.networkName && row.networkName.length >= 3 ? row.networkName : null)
      || row.planName;
    nameMap.set(row.issuerId, name);
  }

  // Step 2: Get plan types per issuer
  const typeRows = db()
    .prepare(`
      SELECT issuer_id AS issuerId, plan_type AS planType, COUNT(*) AS cnt
      FROM insurance_plans
      ${where}
      GROUP BY issuer_id, plan_type
      ORDER BY COUNT(*) DESC
    `)
    .all(...params);

  // Build result
  const map = new Map();
  for (const row of typeRows) {
    if (!map.has(row.issuerId)) {
      const name = nameMap.get(row.issuerId) || String(row.issuerId);
      map.set(row.issuerId, { id: `prov-${row.issuerId}`, name, policies: [] });
    }
    const entry = map.get(row.issuerId);
    if (row.planType) {
      entry.policies.push({
        id: `ins-${row.issuerId}-${row.planType.toLowerCase()}`,
        name: `${entry.name} ${row.planType}`,
        type: row.planType,
      });
    }
  }

  return [...map.values()];
}
