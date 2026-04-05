# Careculator

> Find care that's right for you — ranked by real patient outcomes, not just distance or cost.

Careculator is a healthcare cost and care matching tool built for the hackathon. Users search for a medical condition, optionally add their insurance plan, and get ranked clinic recommendations with estimated costs, recovery signals, and side-by-side comparisons �� all powered by real HRSA and CMS data.

---

## The Problem

- People don't know where to go for care or how much it will cost
- A bad decision can mean thousands in unexpected bills
- Tools like Zocdoc help book appointments — but don't factor in cost + insurance + clinical outcomes together

## The Solution

- **Smart Care + Cost Matching** — ranked clinic results using real federal data (9,300+ clinics, 7,300+ insurance plans)
- **Insurance-Aware** — optional wizard adjusts cost estimates using actual CMS plan coverage tiers
- **Recovery Signals** — recovery speed, outcome quality, treatment burden derived from patient data
- **Side-by-Side Compare** — compare clinics on every metric that matters, with cost bar charts

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Run the app

```bash
npm install      # installs concurrently (one-time)
npm run dev      # starts backend + frontend together
```

| Service      | URL                                 |
| ------------ | ----------------------------------- |
| Frontend     | http://localhost:5173               |
| Backend API  | http://localhost:3001               |
| Swagger UI   | http://localhost:3001/api/docs      |
| OpenAPI JSON | http://localhost:3001/api/docs.json |

Vite proxies `/api/*` to the backend — no CORS issues in development.

### Run individually

```bash
cd backend && npm run dev       # Backend only (port 3001)
cd frontend && npm run dev      # Frontend only (port 5173)
```

---

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS        |
| Backend   | Node.js, Express, ES Modules, better-sqlite3    |
| Database  | SQLite (~264 MB — HRSA + CMS federal data)      |
| API Docs  | swagger-jsdoc + swagger-ui-express (OpenAPI 3.0) |
| Dev Tools | concurrently, node --watch                      |

---

## Project Structure

```
coverfind/
├── package.json              # Root — concurrently runs both services
├── backend/
│   ├── index.js              # Express entry point
│   └── src/
│       ├── config/           # DB path, pagination constants
│       ├── controllers/      # HTTP request handlers
│       ├── models/           # SQL query layer (prepared statements)
│       ├── services/         # Business logic (search, scoring, insurance)
│       ├── routes/           # Route definitions + Swagger annotations
│       ├── middleware/       # Error handler + async wrapper
│       ├── utils/            # Haversine distance, logger
│       ├── data/             # SQLite database file
│       └── scripts/          # Python DB build + migration scripts
├── frontend/
│   └── src/
│       ├── pages/            # HomePage, ResultsPage, ComparePage, SummaryPage
│       ├── components/       # Navbar, Footer, StatusBadge, PlanSelect, etc.
│       ├── lib/api.ts        # Typed API client (all backend calls)
│       └── context/          # Dark/light theme provider
└── models/                   # ML notebooks + pipeline
```

---

## Data Sources

All data is real, sourced from US federal agencies:

- **HRSA** (Health Resources & Services Administration) — 9,323 Federally Qualified Health Centers with geocoded locations, specialties, and clinical outcome scores
- **CMS** (Centers for Medicare & Medicaid Services) — 7,349 marketplace insurance plans, 1,759 provider networks, 54,205 service area mappings, and 3.4M age-banded premium rates

No data is hardcoded or synthetic. Everything flows through SQL queries to the SQLite database, then through REST APIs to the frontend.

---

## Documentation

For detailed technical documentation covering architecture, data flow, API specifications, database schema, frontend component tree, and design decisions, see **[TECHNICAL.md](./TECHNICAL.md)**.
