# Careculator

> "We don't just tell you where to go for care — we tell you where to go _based on what you can afford and what minimizes your financial risk_."

Careculator is a smart healthcare cost and care matching tool. Users input their symptoms, location, and insurance (optional) and get ranked clinic recommendations with estimated costs, recovery scores, and financial risk breakdowns.

---

## The Problem

- People don't know where to go for care or how much it will cost
- A bad decision can mean thousands in unexpected bills
- Tools like Zocdoc help book appointments — but don't consider cost + insurance + urgency together

## The Solution

- **Smart Care + Cost Matching** — ranked clinic results with total cost estimates and recovery scores
- **AI Financial + Medical Brain** — "Should I go to ER or urgent care?" answered with cost context
- **Real Cost Breakdown** — insurance coverage estimate, out-of-pocket cost, worst-case scenario
- **Financial Shock Alert** — warns when a choice costs 5x more than necessary
- **What-if Simulator** — instant recalculation if insurance status changes

---

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Running the full stack

From the project root:

```bash
npm install      # installs root dev tools + backend + frontend (npm workspaces)
npm run dev      # starts backend + frontend together
```

Use **npm 7+** (comes with Node 16+). If you previously hit install loops, remove stray `node_modules` folders and `package-lock.json` files, then run `npm install` again from the repo root only.

Do not add `"careculator": "file:.."` to `backend` or `frontend` — that links the root package into itself and can make `postinstall` / install recurse forever on Windows.

| Service      | URL                                 |
| ------------ | ----------------------------------- |
| Frontend     | http://localhost:5173               |
| Backend API  | http://localhost:3001               |
| Swagger UI   | http://localhost:3001/api/docs      |
| OpenAPI JSON | http://localhost:3001/api/docs.json |

The Vite dev server proxies all `/api` requests to the backend automatically — no CORS issues during development.

### Running individually

```bash
# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

---

## API Documentation

Interactive Swagger UI is available at **http://localhost:3001/api/docs** when the backend is running.

The raw OpenAPI spec (importable into Postman or Insomnia) is at **http://localhost:3001/api/docs.json**.

### Endpoints

| Method | Path                           | Description                                      |
| ------ | ------------------------------ | ------------------------------------------------ |
| GET    | `/api/health`                  | Health check                                     |
| GET    | `/api/clinics`                 | Search clinics (alias for `/api/clinics/search`) |
| GET    | `/api/clinics/search`          | Search by condition, location, and preferences   |
| GET    | `/api/clinics/recommendations` | Infer specialty + quick-search tag presets       |
| GET    | `/api/clinics/compare`         | Compare clinics side-by-side                     |
| POST   | `/api/clinics/compare`         | Compare clinics side-by-side (body payload)      |
| GET    | `/api/clinics/:id`             | Get a single clinic by ID                        |
| GET    | `/api/insurance`               | List supported insurance plans                   |
| POST   | `/api/cards`                   | Upload and parse an insurance card               |

To add docs for a new endpoint, add a `@swagger` JSDoc comment to its route file — the spec updates automatically on the next server start.

---

## Project Structure

```
coverfind/
├── package.json              # Root — runs both services via concurrently
│
├── backend/
│   ├── index.js              # Express app entry point + Swagger UI mount
│   ├── package.json
│   └── src/
│       ├── swagger.js        # OpenAPI spec config (swagger-jsdoc)
│       ├── config/
│       │   └── index.js
│       ├── controllers/
│       │   ├── clinics.controller.js
│       │   ├── insurance.controller.js
│       │   └── cards.controller.js
│       ├── middleware/
│       │   ├── errorHandler.js
│       │   └── validateRequest.js
│       ├── models/
│       │   ├── clinic.model.js
│       │   └── provider.model.js
│       ├── routes/           # @swagger annotations live here
│       │   ├── clinics.routes.js
│       │   ├── insurance.routes.js
│       │   └── cards.routes.js
│       ├── services/
│       │   ├── dataLayer.service.js
│       │   ├── hrsa.service.js
│       │   ├── insurance.service.js
│       │   └── npi.service.js
│       └── utils/
│           ├── csvLoader.js
│           └── haversine.js
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts        # Vite + /api proxy to localhost:3001
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx
│       ├── index.css         # Tailwind base styles
│       ├── vite-env.d.ts
│       └── components/
│           ├── SearchForm.tsx
│           ├── ResultsList.tsx
│           ├── ClinicCard.tsx
│           └── MapView.tsx
│
└── models/
    └── pre-processing.ipynb  # Data pre-processing notebook
```

---

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS        |
| Backend   | Node.js, Express, ES Modules                    |
| API Docs  | swagger-jsdoc, swagger-ui-express (OpenAPI 3.0) |
| Dev Tools | concurrently, node --watch                      |
