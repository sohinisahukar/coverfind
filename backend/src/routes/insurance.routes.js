/**
 * insurance.routes.js — Route definitions for /api/insurance/*.
 *
 * IMPORTANT: Named routes (providers, tiers, states, plans) MUST be
 * registered before the /:id catch-all to prevent Express from
 * greedily matching "providers" as a plan ID.
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as insuranceController from '../controllers/insurance.controller.js';

const router = Router();

// GET /api/insurance               → tier summary { state, tiers }   (used by frontend sidebar)
// GET /api/insurance/providers     → UI catalog array [ {id,name,policies} ] (used by home wizard)
// GET /api/insurance/tiers         → alias for /  (backward compat)
// GET /api/insurance/states        → list of state codes
// GET /api/insurance/by-clinic/:id → plans for a clinic's county
// GET /api/insurance/plans         → paginated raw plans (internal / API docs)
// GET /api/insurance/:planId/rates → age-banded premiums
// GET /api/insurance/:id           → single plan detail (must be last)

router.get('/providers',           asyncHandler(insuranceController.listProviders));
router.get('/tiers',               asyncHandler(insuranceController.tiers));
router.get('/states',              asyncHandler(insuranceController.states));
router.get('/by-clinic/:clinicId', asyncHandler(insuranceController.byClinic));
router.get('/plans',               asyncHandler(insuranceController.plans));
router.get('/:planId/rates',       asyncHandler(insuranceController.rates));
router.get('/',                    asyncHandler(insuranceController.list));
router.get('/:id',                 asyncHandler(insuranceController.getById));

export default router;
