import { Router } from 'express';
import * as clinicsController from '../controllers/clinics.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/** Alias: same as /search (mockup-style GET /api/clinics?...) */
router.get('/', asyncHandler(clinicsController.search));
router.get('/search', asyncHandler(clinicsController.search));
router.get('/recommendations', asyncHandler(clinicsController.recommendations));
router.get('/compare', asyncHandler(clinicsController.compare));
router.post('/compare', asyncHandler(clinicsController.compare));
router.get('/:id', asyncHandler(clinicsController.getById));

export default router;
