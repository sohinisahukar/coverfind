// placeholder
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Insurance card parsing and storage
 */

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Upload and parse an insurance card
 *     tags: [Cards]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image of the insurance card
 *     responses:
 *       200:
 *         description: Parsed card details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberId: { type: string }
 *                 groupId: { type: string }
 *                 planName: { type: string }
 *                 insurerName: { type: string }
 */

export default router;
