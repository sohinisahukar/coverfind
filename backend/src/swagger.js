import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Careculator API',
      version: '1.0.0',
      description: 'API documentation for the Careculator backend',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local dev server' },
    ],
    components: {
      schemas: {
        Clinic: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clinic-prime-motion' },
            name: { type: 'string', example: 'PrimeMotion Rehab' },
            specialties: { type: 'array', items: { type: 'string' }, example: ['Physical Therapy'] },
            zip: { type: 'string', example: '60616' },
            distanceMiles: { type: 'number', example: 2.1 },
            avgVisitsNeeded: { type: 'integer', example: 4 },
            recoverySpeed: { type: 'string', enum: ['fast', 'moderate', 'slow'] },
            outcomeQuality: { type: 'string', enum: ['high', 'moderate', 'low'] },
            treatmentBurden: { type: 'string', enum: ['low', 'moderate', 'high'] },
            totalCostEstimate: { type: 'number', example: 1200 },
            perVisitCost: { type: 'number', example: 300 },
            perVisitCostTier: { type: 'string', enum: ['low', 'medium', 'high'] },
            patientSummary: { type: 'string' },
            highlightTags: { type: 'array', items: { type: 'string' } },
            recoveryScore: { type: 'number', example: 0.95 },
            costScore: { type: 'number', example: 0.72 },
            badges: {
              type: 'object',
              properties: {
                bestValue: { type: 'boolean' },
                topRecommendation: { type: 'boolean' },
                highVisits: { type: 'boolean' },
                newInsurance: { type: 'boolean' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  // Scan all route files for JSDoc @swagger annotations
  apis: ['./src/routes/*.js', './index.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
