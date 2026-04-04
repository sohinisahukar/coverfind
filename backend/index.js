import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import clinicsRoutes from './src/routes/clinics.routes.js';
import insuranceRoutes from './src/routes/insurance.routes.js';
import cardsRoutes from './src/routes/cards.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/clinics', clinicsRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/cards', cardsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
