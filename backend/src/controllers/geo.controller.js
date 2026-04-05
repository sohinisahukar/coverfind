import { getDb } from '../services/dataLayer.service.js';
import { logger } from '../utils/logger.js';

/**
 * Prepared statement cached at module load — called on every search.
 * Averages lat/lng across all clinics with the same ZIP so we get a centroid
 * rather than a single clinic's coords. The clinics table is our only
 * embedded geographic dataset (no external API, no bundled ZIP file).
 */
let _stmt = null;
function stmt() {
  if (!_stmt) {
    _stmt = getDb().prepare(`
      SELECT
        zip,
        ROUND(AVG(lat), 6)  AS lat,
        ROUND(AVG(lng), 6)  AS lng,
        city,
        state,
        county,
        county_fips         AS countyFips
      FROM clinics
      WHERE zip = ?
      GROUP BY zip
      LIMIT 1
    `);
  }
  return _stmt;
}

/**
 * GET /api/geo/zip/:zip
 */
export async function zipLookup(req, res) {
  const { zip } = req.params;

  if (!/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'ZIP must be a 5-digit string' });
  }

  logger.info(`geo.zipLookup  zip=${zip}`);

  const row = stmt().get(zip);

  if (!row) {
    logger.warn(`geo.zipLookup  zip=${zip} → not found`);
    return res.status(404).json({ error: `ZIP code ${zip} not found` });
  }

  logger.success(`geo.zipLookup  zip=${zip} → ${row.city}, ${row.state} (${row.lat}, ${row.lng})`);
  res.json(row);
}
