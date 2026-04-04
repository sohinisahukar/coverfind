import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/swagger.js';
import clinicsRoutes from './src/routes/clinics.routes.js';
import insuranceRoutes from './src/routes/insurance.routes.js';
import cardsRoutes from './src/routes/cards.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/clinics', clinicsRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/cards', cardsRoutes);

// Swagger UI — available at http://localhost:3001/api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Raw OpenAPI JSON (useful for importing into Postman / Insomnia)
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`API docs:       http://localhost:${PORT}/api/docs`);
});
