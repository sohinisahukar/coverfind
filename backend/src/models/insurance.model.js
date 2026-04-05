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
    bronze:  { label: 'Bronze',  coveragePct: 60, color: 'amber' },
    silver:  { label: 'Silver',  coveragePct: 70, color: 'slate' },
    gold:    { label: 'Gold',    coveragePct: 80, color: 'yellow' },
    premium: { label: 'Platinum', coveragePct: 90, color: 'teal' },
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
