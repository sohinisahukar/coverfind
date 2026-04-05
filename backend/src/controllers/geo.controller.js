/**
 * geo.controller.js — ZIP code geocoding endpoint.
 *
 * Derives lat/lng coordinates from the clinics table (no external API).
 * For each ZIP, averages the coordinates of all clinics in that ZIP
 * to produce a centroid. Also returns city, state, county, and FIPS code.
 *
 * Used by the frontend to convert a user's ZIP into coordinates
 * for distance-based clinic search.
 */

import { getDb } from '../services/dataLayer.service.js';
import { logger } from '../utils/logger.js';

/**
 * Prepared statement — cached after first call.
 * Computes the geographic centroid for a ZIP by averaging lat/lng
 * across all clinics in that ZIP code.
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
 *
 * Validates the ZIP is 5 digits, looks it up in the clinics table,
 * and returns coordinates + county metadata.
 */
export async function zipLookup(req, res) {
  const { zip } = req.params;

  if (!/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'ZIP must be a 5-digit string' });
  }

  logger.info(`geo.zipLookup  zip=${zip}`);

  const row = stmt().get(zip);

  if (!row) {
    logger.warn(`geo.zipLookup  zip=${zip} -> not found`);
    return res.status(404).json({ error: `ZIP code ${zip} not found` });
  }

  logger.success(`geo.zipLookup  zip=${zip} -> ${row.city}, ${row.state} (${row.lat}, ${row.lng})`);
  res.json(row);
}
