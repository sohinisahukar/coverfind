import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { zipLookup } from '../controllers/geo.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Geo
 *   description: ZIP code geocoding (no external API — sourced from clinic data)
 */

/**
 * @swagger
 * /api/geo/zip/{zip}:
 *   get:
 *     summary: Resolve a US ZIP code to coordinates and FIPS code
 *     tags: [Geo]
 *     parameters:
 *       - in: path
 *         name: zip
 *         required: true
 *         schema: { type: string }
 *         example: "60616"
 *     responses:
 *       200:
 *         description: Coordinates and county info for the ZIP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 zip:        { type: string }
 *                 lat:        { type: number }
 *                 lng:        { type: number }
 *                 city:       { type: string }
 *                 state:      { type: string }
 *                 county:     { type: string }
 *                 countyFips: { type: string }
 *       404:
 *         description: ZIP code not found in clinic data
 */
router.get('/zip/:zip', asyncHandler(zipLookup));

export default router;
