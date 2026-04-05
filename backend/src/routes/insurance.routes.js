import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as insuranceController from '../controllers/insurance.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Insurance
 *   description: Insurance plan lookup and coverage verification
 */

/**
 * @swagger
 * /api/insurance:
 *   get:
 *     summary: List insurance plans with optional filters and pagination
 *     tags: [Insurance]
 *     parameters:
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *         description: Two-letter state code (e.g. IL)
 *       - in: query
 *         name: countyFips
 *         schema: { type: string }
 *         description: 5-digit FIPS code — returns only plans that cover this county
 *       - in: query
 *         name: planType
 *         schema: { type: string, enum: [HMO, PPO, EPO, POS] }
 *       - in: query
 *         name: metalLevel
 *         schema: { type: string, enum: [Bronze, Silver, Gold, Platinum] }
 *       - in: query
 *         name: coverageTier
 *         schema: { type: string, enum: [bronze, silver, gold, premium] }
 *         description: Derived tier based on actuarial value
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 500, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of insurance plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/InsurancePlan' }
 *                 total: { type: integer }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:   { type: integer }
 *                     limit:   { type: integer }
 *                     offset:  { type: integer }
 *                     hasMore: { type: boolean }
 */
// All named / parameterised sub-routes MUST be registered before /:id
// otherwise Express greedily matches them as plan IDs.
router.get('/tiers',               asyncHandler(insuranceController.tiers));
router.get('/states',              asyncHandler(insuranceController.states));
router.get('/by-clinic/:clinicId', asyncHandler(insuranceController.byClinic));
router.get('/:planId/rates',       asyncHandler(insuranceController.rates));
router.get('/',                    asyncHandler(insuranceController.list));

/**
 * @swagger
 * /api/insurance/by-clinic/{clinicId}:
 *   get:
 *     summary: List insurance plans that cover a clinic's county
 *     tags: [Insurance]
 *     parameters:
 *       - in: path
 *         name: clinicId
 *         required: true
 *         schema: { type: string }
 *         description: HRSA clinic ID (e.g. hrsa-1234-1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 500, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Plans covering the clinic's county, with resolved county_fips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countyFips: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/InsurancePlan' }
 *                 total: { type: integer }
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Clinic not found
 */
/**
 * @swagger
 * /api/insurance/{id}:
 *   get:
 *     summary: Get a single insurance plan by its CMS plan ID
 *     tags: [Insurance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: CMS StandardComponentId (plan_id)
 *     responses:
 *       200:
 *         description: Insurance plan detail with network metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InsurancePlan'
 *       404:
 *         description: Plan not found
 */
router.get('/:id', asyncHandler(insuranceController.getById));

export default router;
