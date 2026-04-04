import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import chalk from 'chalk';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/swagger.js';
import clinicsRoutes from './src/routes/clinics.routes.js';
import insuranceRoutes from './src/routes/insurance.routes.js';
import cardsRoutes from './src/routes/cards.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';

const app = express();
app.use(cors());
app.use(express.json());

// HTTP request logger — colored method + url + status + response time
app.use(
  morgan((tokens, req, res) => {
    const method = chalk.magenta(tokens.method(req, res).padEnd(6));
    const url    = chalk.white(tokens.url(req, res));
    const status = (() => {
      const s = Number(tokens.status(req, res));
      if (s >= 500) return chalk.red(s);
      if (s >= 400) return chalk.yellow(s);
      return chalk.green(s);
    })();
    const ms = chalk.gray(tokens['response-time'](req, res) + ' ms');
    return `${chalk.gray(new Date().toTimeString().slice(0, 8))} ${method} ${url} → ${status} ${ms}`;
  })
);

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

// Raw OpenAPI JSON
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('        Careculator Backend             ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));
  console.log('');
  logger.success(`Server running at ${chalk.underline(`http://localhost:${PORT}`)}`);
  logger.info(`API docs at     ${chalk.underline(`http://localhost:${PORT}/api/docs`)}`);
  logger.info(`Health check:   ${chalk.underline(`http://localhost:${PORT}/api/health`)}`);
  console.log('');
});
