// placeholder — routes implemented in sohini's branch (not yet merged)
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Clinics
 *   description: Clinic search, recommendations, and comparison
 */

/**
 * @swagger
 * /api/clinics:
 *   get:
 *     summary: Search clinics (alias for /api/clinics/search)
 *     tags: [Clinics]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query (condition or keyword)
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: Location or zip code
 *       - in: query
 *         name: maxDistanceMi
 *         schema: { type: number }
 *         description: Maximum distance in miles
 *       - in: query
 *         name: treatmentBurden
 *         schema: { type: string, enum: [low, moderate, high] }
 *       - in: query
 *         name: priorityWeight
 *         schema: { type: integer, minimum: 0, maximum: 100 }
 *         description: "0 = prioritize faster recovery, 100 = prioritize lower cost"
 *       - in: query
 *         name: useInsurance
 *         schema: { type: boolean }
 *       - in: query
 *         name: useOutOfPocket
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of matching clinics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Clinic'
 */

/**
 * @swagger
 * /api/clinics/search:
 *   get:
 *     summary: Search clinics by condition, location, and preferences
 *     tags: [Clinics]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query (condition or keyword)
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: "Location or zip code (alias: zip)"
 *       - in: query
 *         name: maxDistanceMi
 *         schema: { type: number }
 *         description: Maximum distance in miles
 *       - in: query
 *         name: treatmentBurden
 *         schema: { type: string, enum: [low, moderate, high] }
 *       - in: query
 *         name: priorityWeight
 *         schema: { type: integer, minimum: 0, maximum: 100 }
 *         description: "0 = prioritize faster recovery, 100 = prioritize lower cost"
 *       - in: query
 *         name: useInsurance
 *         schema: { type: boolean }
 *       - in: query
 *         name: useOutOfPocket
 *         schema: { type: boolean }
 *       - in: query
 *         name: costSensitivity
 *         schema: { type: string }
 *       - in: query
 *         name: recoveryPreference
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of matching clinics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Clinic'
 */

/**
 * @swagger
 * /api/clinics/recommendations:
 *   get:
 *     summary: Get specialty/condition recommendations and quick-search tags
 *     tags: [Clinics]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *         description: Freetext query to infer a specialty from
 *     responses:
 *       200:
 *         description: Inferred recommendation + quick tag presets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 specialty:
 *                   type: string
 *                 condition:
 *                   type: string
 *                 quickTags:
 *                   type: array
 *                   items: { type: string }
 */

/**
 * @swagger
 * /api/clinics/compare:
 *   get:
 *     summary: Compare clinics side-by-side (GET)
 *     tags: [Clinics]
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated clinic IDs
 *         example: clinic-prime-motion,clinic-hopecare
 *       - in: query
 *         name: condition
 *         schema: { type: string }
 *       - in: query
 *         name: specialty
 *         schema: { type: string }
 *       - in: query
 *         name: zipCode
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Side-by-side comparison of requested clinics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Clinic'
 *   post:
 *     summary: Compare clinics side-by-side (POST)
 *     tags: [Clinics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *                 example: [clinic-prime-motion, clinic-hopecare]
 *               condition:
 *                 type: string
 *               specialty:
 *                 type: string
 *               zipCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Side-by-side comparison of requested clinics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Clinic'
 */

/**
 * @swagger
 * /api/clinics/{id}:
 *   get:
 *     summary: Get a single clinic by ID
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: clinic-prime-motion
 *     responses:
 *       200:
 *         description: Clinic detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Clinic'
 *       404:
 *         description: Clinic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export default router;
