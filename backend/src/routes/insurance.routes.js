// placeholder
import { Router } from 'express';

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
 *     summary: List supported insurance plans
 *     tags: [Insurance]
 *     responses:
 *       200:
 *         description: Array of insurance plan objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   type: { type: string }
 */

export default router;
