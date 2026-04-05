# Careculator

> Find care that's right for you — ranked by real patient outcomes, not just distance or cost.

Careculator is a healthcare cost and care matching tool. Users search for a medical condition, add their insurance plan, and get ranked clinic recommendations with estimated costs, recovery signals, and side-by-side comparisons — powered by real HRSA and CMS federal data.

---

## The Problem

People don't know where to go for care or how much it will cost. A bad decision can mean thousands in unexpected bills. Tools like Zocdoc help book appointments — but none factor in cost + insurance + clinical outcomes together.

## The Solution

| Feature | Description |
|---|---|
| Smart Matching | Ranked results using 9,300+ real HRSA clinics + 7,300+ CMS insurance plans |
| Insurance-Aware | Cost estimates adjusted by your actual plan coverage tier |
| Recovery Signals | Recovery speed, outcome quality, and treatment burden from patient data |
| Side-by-Side Compare | Compare up to 3 clinics on every metric with cost bar charts |

---

## Quick Start

**Prerequisites:** Node.js 18+, npm

```bash
npm install      # installs concurrently (one-time)
npm run dev      # starts backend + frontend together
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api/docs |
| OpenAPI JSON | http://localhost:3001/api/docs.json |

Vite proxies `/api/*` to the backend in development — no CORS setup needed.

```bash
# Run individually
cd backend && npm run dev    # port 3001
cd frontend && npm run dev   # port 5173
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, ES Modules, better-sqlite3 |
| Database | SQLite (~286 MB — HRSA + CMS federal data) |
| API Docs | swagger-jsdoc + swagger-ui-express (OpenAPI 3.0) |

---

## Project Structure

```
coverfind/
├── package.json              # Root — concurrently runs both services
├── render.yaml               # Render.com deployment config (backend)
├── backend/
│   ├── index.js              # Express entry point
│   └── src/
│       ├── config/           # DB path, pagination constants
│       ├── controllers/      # HTTP request handlers
│       ├── models/           # SQL query layer (prepared statements)
│       ├── services/         # Business logic (search, scoring, insurance)
│       ├── routes/           # Route definitions + Swagger annotations
│       ├── middleware/        # Error handler + async wrapper
│       ├── utils/            # Haversine distance, logger
│       ├── data/             # SQLite database (tracked via Git LFS on deploy branch)
│       └── scripts/          # Python DB build scripts
├── frontend/
│   ├── vercel.json           # Vercel deployment config (SPA rewrites)
│   └── src/
│       ├── pages/            # HomePage, ResultsPage, ComparePage, SummaryPage
│       ├── components/       # Navbar, Footer, GlowCard, PlanSelect, etc.
│       ├── lib/api.ts        # Typed API client
│       └── context/          # Dark/light theme provider
└── models/                   # ML notebooks + pipeline
```

---

## Data Sources

All data is real, sourced from US federal agencies:

- **HRSA** — 9,323 Federally Qualified Health Centers with geocoded locations, specialties, and clinical outcome scores
- **CMS** — 7,349 marketplace insurance plans, 1,759 provider networks, 54,205 service area mappings, and 3.4M age-banded premium rates

No data is hardcoded or synthetic. Everything flows through SQL queries on the SQLite database.

---

## Deployment

The `deploy` branch is production-ready. The SQLite database is tracked via **Git LFS** and ships with the repo automatically.

### Backend → Render.com

1. Go to [render.com](https://render.com) → **New → Blueprint** → connect the `deploy` branch
2. Render reads `render.yaml` automatically and creates the Node.js web service
3. Copy the deployed service URL (e.g. `https://careculator-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import this repo, select the `deploy` branch
2. Set **Root Directory** to `frontend`
3. Add environment variable: `VITE_API_URL` = your Render service URL
4. Deploy — Vercel handles the Vite build automatically

> **Note:** On Render's free plan, the backend spins down after 15 minutes of inactivity. First request after idle may take ~30 seconds.

---

## Documentation

For detailed technical documentation — architecture, data flow, API specifications, database schema, frontend component tree, and design decisions — see **[TECHNICAL.md](./TECHNICAL.md)**.
