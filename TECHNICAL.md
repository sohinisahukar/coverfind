# Careculator — Technical Documentation

Comprehensive technical reference for developers, reviewers, and contributors. Covers architecture, data flow, API contracts, database schema, frontend structure, and design decisions.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Database Schema](#3-database-schema)
4. [API Reference](#4-api-reference)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Data Pipeline](#6-data-pipeline)
7. [Key Algorithms](#7-key-algorithms)
8. [Configuration](#8-configuration)
9. [Design Decisions](#9-design-decisions)
10. [Development Workflow](#10-development-workflow)

---

## 1. Architecture Overview

### High-Level Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────>│  Vite Proxy  │────>│  Express API │────>│   SQLite DB  │
│  React SPA   │<────│  :5173/api/* │<────│    :3001     │<────│  264 MB      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Backend Layer Separation

```
HTTP Request
    │
    ▼
┌─────────────────────────────┐
│  Route (clinics.routes.js)  │  URL mapping + Swagger @swagger annotations
│  Middleware (errorHandler)   │  asyncHandler wraps all routes
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Controller                 │  HTTP concerns only:
│  (clinics.controller.js)    │  - Parse query/body params
│                             │  - Log request/response
│                             │  - Send JSON response
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Service                    │  Business logic:
│  (clinicCatalog.service.js) │  - Haversine distance computation
│                             │  - Weighted score sorting
│                             │  - Pagination
│                             │  - 404 error semantics
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Model (clinic.model.js)    │  Data access:
│                             │  - Prepared SQL statements
│                             │  - Row mappers (snake_case -> camelCase)
│                             │  - Dynamic WHERE clause construction
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  dataLayer.service.js       │  Singleton read-only SQLite connection
│  (better-sqlite3)           │  with tuned pragmas (64MB cache, mmap)
└─────────────────────────────┘
```

### Design Principles

1. **No hardcoded data** — Every piece of data the user sees comes from SQL queries through API calls. No static JSON files, no hardcoded brand lists, no synthetic data.
2. **Separation of concerns** — Models do SQL, services do logic, controllers do HTTP. No SQL in controllers, no HTTP in models.
3. **Real data only** — All 9,323 clinics are real HRSA FQHCs. All 7,349 plans are real CMS marketplace plans.

---

## 2. Backend Architecture

### Entry Point: `backend/index.js`

Sets up Express with:
- **CORS** — allows cross-origin requests (frontend runs on different port)
- **morgan** — HTTP request logging with coloured output
- **express.json()** — parses JSON request bodies
- **Route groups** — `/api/clinics`, `/api/insurance`, `/api/geo`
- **Swagger UI** — mounted at `/api/docs`
- **Error handler** — catches all thrown/rejected errors, returns JSON `{ error }`

### File-by-File Breakdown

#### `src/config/index.js`
- `DB_PATH` — resolved relative to config file: `../data/careculator.db`
- `DEFAULT_PAGE_SIZE` = 50, `MAX_PAGE_SIZE` = 500

#### `src/services/dataLayer.service.js`
Singleton `better-sqlite3` connection opened in read-only mode. Pragmas:
- `cache_size = -65536` (64 MB page cache — keeps hot pages in memory)
- `temp_store = MEMORY` (sort/join spill buffers go to RAM)
- `mmap_size = 268435456` (256 MB memory-mapped file access)

**Why read-only?** The app never writes to the DB at runtime. Read-only mode allows SQLite to skip WAL locking overhead and enables concurrent reads.

#### `src/models/clinic.model.js`

**Core query: `queryClinics({ q, state })`**

Splits the search query into terms, ANDs them together:
```sql
SELECT * FROM clinics
WHERE (LOWER(name) LIKE '%knee%' OR LOWER(specialties) LIKE '%knee%' OR LOWER(keywords) LIKE '%knee%')
  AND (LOWER(name) LIKE '%pain%' OR LOWER(specialties) LIKE '%pain%' OR LOWER(keywords) LIKE '%pain%')
```

Each term must match at least one of: `name`, `specialties` (JSON array stored as text), or `keywords` (JSON array stored as text).

**Other functions:**
- `getClinicById(id)` — single clinic by HRSA ID
- `getClinicsByIds(ids)` — batch fetch for compare (uses `IN (?, ?, ...)`)
- `getZipCentroid(zip)` — average lat/lng across clinics in a ZIP
- `getTopSpecialties(limit)` — uses `json_each()` virtual table to unnest the JSON specialties array and count frequencies

**Row mapper `mapRow(row)`:**
Converts snake_case SQLite columns to camelCase. Parses JSON columns (`badges`, `specialties`, `keywords`, `highlight_tags`) with try/catch fallbacks.

#### `src/models/insurance.model.js`

**`getTierSummary(state)`** — Aggregates plans by `coverage_tier`:
```sql
SELECT coverage_tier AS tier, COUNT(*), AVG(monthly_premium), AVG(deductible), AVG(oop_max), AVG(coinsurance_pct)
FROM insurance_plans [WHERE state = ?]
GROUP BY coverage_tier
```
Enriches with human-readable labels (Bronze/Silver/Gold/Platinum) and coverage percentages (60%/70%/80%/90%). Results are sorted in canonical tier order (Bronze→Silver→Gold→Platinum) in JavaScript, not by avgPremium, to ensure the correct display order regardless of dataset composition.

**`getProvidersForWizard(state)`** — The most complex query. Returns `[{ id, name, policies }]` for the home page wizard.

Challenge: The CMS `issuer_name` column contains numeric IDs, not company names. Solution:
1. Use `ROW_NUMBER() OVER (PARTITION BY issuer_id ORDER BY LENGTH(plan_name) DESC)` to find the longest plan name per issuer
2. Extract the brand prefix using `extractBrandFromPlanName()` — strips metal levels (Bronze/Silver/Gold/Platinum), plan types (HMO/PPO/EPO), and numeric suffixes
3. Falls back to `network_name` from the networks table, then to raw `plan_name`
4. Groups plan types per issuer into `policies` array

**`extractBrandFromPlanName(planName)`** — Pure JS string processing:
- Finds earliest occurrence of metal-level or plan-type tokens
- Cuts the name before that token
- Cleans trailing noise (whitespace, punctuation, articles)
- Falls back to regex: cuts before first digit sequence

#### `src/models/provider.model.js`

Insurance plan queries with network JOIN:
- `getPlanById(planId)` — single plan with network metadata
- `listPlans({ state, countyFips, planType, metalLevel, coverageTier, limit, offset })` — dynamic WHERE + optional `service_areas` JOIN when filtering by county
- `getPlansByClinicId(clinicId)` — resolves clinic's `county_fips`, then queries plans covering that county
- `getRatesForPlan(planId, { age, ratingArea })` — age-banded premiums from the 3.4M-row `rates` table (indexed on `plan_id`)

**Row mapper `mapPlan(row)`:** Converts to camelCase, nests SBC (Summary of Benefits and Coverage) fields under `sbc.baby`, `sbc.diabetes`, `sbc.fracture`.

#### `src/services/clinicCatalog.service.js`

**Search pipeline (`searchClinics`):**

```
1. SQL filter    → queryClinics({ q, state })           // keyword + state
2. Distance      → haversine(userLat, userLng, ...)     // attach distanceMiles
3. Distance cap  → filter by maxDistanceMi (default 100)
4. Burden filter → filter by treatmentBurden if provided
5. Score sort    → weighted: recoveryWeight * recoveryScore + costWeight * costScore
6. Paginate      → slice with limit/offset
```

**priorityWeight** (0–100): Controls the recovery-vs-cost balance.
- 0 = pure recovery-first ranking
- 100 = pure cost-first ranking
- 50 = equal weight (default)

The weight is inverted: `recoveryWeight = 1 - (priorityWeight / 100)`.

**Default center:** ZIP 60616 (IIT / Bridgeport, Chicago, IL) — `41.8827, -87.6233`.

**`getRecommendationForQuery(query)`** — Finds clinics matching the query, tallies their specialties, and returns the best-fit specialty using a scored ranking:
1. **Direct match wins** — specialties whose name overlaps with a query word (e.g. "dental" → "Dental")
2. **Non-generic before generic** — "Behavioral Health" ranks above "Primary Care" / "Urgent Care" when counts tie
3. **Highest count wins** as the final tiebreaker

**`getQuickSearchTags()`** — Calls `getTopSpecialties(6)` once, caches the result.

#### `src/services/insurance.service.js`

Thin orchestration layer between controllers and models:
- `listPlans(query)` — delegates to `provider.model.listPlans`, adds pagination envelope
- `getPlanById(planId)` — delegates + throws 404 if null
- `getPlansForClinic(clinicId)` — resolves clinic county, fetches matching plans
- `getRatesForPlan(planId, filters)` — validates plan exists before querying the 3.4M-row rates table
- `getProvidersForWizard(state)` — passthrough to `insurance.model`

#### `src/controllers/clinics.controller.js`

HTTP handlers:
- `search(req, res)` — extracts query params, calls `searchClinics()`, returns flat `Clinic[]`
- `recommendations(req, res)` — calls `getRecommendationForQuery()` + `getQuickSearchTags()`
- `compare(req, res)` — accepts GET (comma-separated `ids` param) or POST (JSON body `{ ids }`)
- `getById(req, res)` — single clinic by HRSA ID

#### `src/controllers/insurance.controller.js`

HTTP handlers:
- `list(req, res)` — tier summaries `{ state, tiers }`
- `listProviders(req, res)` — wizard-shaped provider array
- `tiers(req, res)` — alias for list (backward compat)
- `states(req, res)` — distinct state codes
- `byClinic(req, res)` — plans for a clinic's county
- `rates(req, res)` — age-banded premiums for a plan
- `plans(req, res)` — paginated raw plan list
- `getById(req, res)` — single plan detail

#### `src/controllers/geo.controller.js`

**`zipLookup(req, res)`** — Validates 5-digit ZIP, averages lat/lng across all clinics in that ZIP. Returns `{ zip, lat, lng, city, state, county, countyFips }`. No external API — derived entirely from the clinics table.

#### `src/middleware/errorHandler.js`

Two exports:
- `asyncHandler(fn)` — wraps async route handlers so rejected promises reach Express error pipeline
- `errorHandler(err, req, res, _next)` — logs 5xx with full stack, 4xx with one-line warning. Returns `{ error: "message" }` JSON.

Controllers can throw errors with `.status` (e.g., `err.status = 404`) to control the HTTP response code.

#### `src/utils/haversine.js`

Great-circle distance using the Haversine formula. Returns miles. Used by the clinic search pipeline to compute `distanceMiles` for every clinic relative to the user's coordinates.

#### `src/utils/logger.js`

Coloured console logger using chalk. Levels: `info` (cyan), `success` (green), `warn` (yellow), `error` (red). Every line prefixed with `HH:MM:SS`.

#### `src/swagger.js`

Generates the OpenAPI 3.0 spec by scanning `./src/routes/*.js` and `./index.js` for `@swagger` JSDoc annotations. Defines shared schemas (`Clinic`, `Error`).

---

## 3. Database Schema

The SQLite database (`backend/src/data/careculator.db`, ~264 MB) contains five tables.

### `clinics` (9,323 rows)

Source: HRSA UDS data (Federally Qualified Health Centers).

| Column           | Type    | Description                                     |
| ---------------- | ------- | ----------------------------------------------- |
| `id`             | TEXT PK | HRSA ID (e.g., `hrsa-H80CS02458-7327`)          |
| `name`           | TEXT    | Clinic display name                              |
| `org_name`       | TEXT    | Parent organization name                         |
| `address`        | TEXT    | Street address                                   |
| `city`           | TEXT    | City                                             |
| `state`          | TEXT    | Two-letter state code                            |
| `zip`            | TEXT    | 5-digit ZIP code                                 |
| `lat`            | REAL    | Latitude (decimal degrees)                       |
| `lng`            | REAL    | Longitude (decimal degrees)                      |
| `county`         | TEXT    | County name                                      |
| `county_fips`    | TEXT    | 5-digit FIPS code (links to `service_areas`)     |
| `phone`          | TEXT    | Contact phone                                    |
| `website`        | TEXT    | Website URL (nullable)                           |
| `specialties`    | TEXT    | JSON array of specialty strings                  |
| `keywords`       | TEXT    | JSON array of searchable keywords                |
| `avg_visits`     | INTEGER | Average visits needed for treatment              |
| `recovery_speed` | TEXT    | `fast` / `moderate` / `slow`                     |
| `recovery_days`  | INTEGER | Estimated recovery days                          |
| `outcome_quality`| TEXT    | `high` / `moderate` / `low`                      |
| `treatment_burden`| TEXT   | `low` / `moderate` / `high`                      |
| `burden_score`   | REAL    | Numeric burden score (0–1)                       |
| `total_cost_est` | REAL    | Estimated total cost ($)                         |
| `per_visit_cost` | REAL    | Estimated per-visit cost ($)                     |
| `per_visit_tier` | TEXT    | `low` / `medium` / `high`                        |
| `patient_summary`| TEXT    | Human-readable summary for the patient           |
| `highlight_tags` | TEXT    | JSON array of highlight reasons                  |
| `recovery_score` | REAL    | Composite recovery score (0–1)                   |
| `cost_score`     | REAL    | Composite cost score (0–1, higher = cheaper)     |
| `badges`         | TEXT    | JSON object `{ bestValue, topRecommendation, highVisits, newInsurance }` |

### `insurance_plans` (7,349 rows)

Source: CMS Individual Market Medical QHP data.

| Column             | Type    | Description                                |
| ------------------ | ------- | ------------------------------------------ |
| `plan_id`          | TEXT PK | CMS plan ID                                |
| `plan_name`        | TEXT    | Full plan display name                     |
| `issuer_id`        | INTEGER | CMS issuer ID (numeric)                    |
| `issuer_name`      | TEXT    | Issuer name (often numeric in CMS data)    |
| `plan_type`        | TEXT    | `HMO` / `PPO` / `EPO` / `POS`             |
| `metal_level`      | TEXT    | `Bronze` / `Silver` / `Gold` / `Platinum`  |
| `deductible`       | REAL    | Annual deductible ($)                      |
| `oop_max`          | REAL    | Annual out-of-pocket maximum ($)           |
| `coinsurance_pct`  | REAL    | Coinsurance percentage (0.0–1.0)           |
| `monthly_premium`  | REAL    | Monthly premium ($)                        |
| `actuarial_value`  | REAL    | Plan actuarial value (0.0–1.0)             |
| `coverage_tier`    | TEXT    | `bronze` / `silver` / `gold` / `premium`   |
| `network_id`       | TEXT    | Links to `networks.network_id`             |
| `service_area_id`  | TEXT    | Links to `service_areas.service_area_id`   |
| `state`            | TEXT    | Two-letter state code                      |
| `year`             | INTEGER | Plan year                                  |
| `referral_required`| INTEGER | 1 if referral required, 0 otherwise        |
| `sbc_baby_*`       | REAL    | SBC scenario: having a baby                |
| `sbc_diabetes_*`   | REAL    | SBC scenario: managing diabetes            |
| `sbc_fracture_*`   | REAL    | SBC scenario: simple fracture              |

### `networks` (1,759 rows)

| Column         | Type    | Description                    |
| -------------- | ------- | ------------------------------ |
| `network_id`   | TEXT    | Network identifier             |
| `issuer_id`    | INTEGER | CMS issuer ID                  |
| `network_name` | TEXT    | Human-readable network name    |
| `network_url`  | TEXT    | Provider directory URL         |

### `service_areas` (54,205 rows)

Maps which plans are available in which counties.

| Column            | Type    | Description                    |
| ----------------- | ------- | ------------------------------ |
| `service_area_id` | TEXT    | Service area identifier        |
| `issuer_id`       | INTEGER | CMS issuer ID                  |
| `county_fips`     | TEXT    | 5-digit FIPS code              |
| `state`           | TEXT    | Two-letter state code          |
| `partial_county`  | INTEGER | Whether partial county coverage|

### `rates` (3,467,016 rows)

Age-banded monthly premium rates. Indexed on `plan_id` for fast lookups.

| Column           | Type    | Description                    |
| ---------------- | ------- | ------------------------------ |
| `plan_id`        | TEXT    | Links to `insurance_plans`     |
| `rating_area`    | TEXT    | Geographic rating area         |
| `age`            | TEXT    | Age band (e.g., "40", "0-20") |
| `monthly_premium`| REAL    | Monthly premium for this age   |

### Table Relationships

```
clinics.county_fips ──────────────> service_areas.county_fips
                                          │
insurance_plans.service_area_id ──────────┘
insurance_plans.issuer_id ────────> networks.issuer_id
insurance_plans.network_id ───────> networks.network_id
insurance_plans.plan_id ──────────> rates.plan_id
```

The key join: **clinic -> county_fips -> service_areas -> insurance_plans** allows finding which insurance plans cover a specific clinic's geographic area.

---

## 4. API Reference

Base URL: `http://localhost:3001`

### Clinic Endpoints

#### `GET /api/clinics/search`

Search clinics by keyword, location, and preferences.

| Param            | Type   | Default | Description                                     |
| ---------------- | ------ | ------- | ----------------------------------------------- |
| `q`              | string | —       | Free-text search (ANDed terms)                   |
| `state`          | string | —       | Two-letter state filter                          |
| `lat`            | number | 41.8827 | User latitude (from ZIP geocode)                 |
| `lng`            | number | -87.6233| User longitude                                   |
| `maxDistanceMi`  | number | 100     | Distance cap in miles                            |
| `treatmentBurden` | string | —      | `low` / `moderate` / `high`                      |
| `priorityWeight` | number | 50      | 0 = recovery-first, 100 = cost-first            |
| `limit`          | number | 50      | Results per page (max 200)                       |
| `offset`         | number | 0       | Pagination offset                                |

**Response:** `Clinic[]` (flat array — the frontend expects this, not a pagination envelope)

```json
[
  {
    "id": "hrsa-H80CS02458-7327",
    "name": "NorthShore Dental Center",
    "city": "Lake Station",
    "state": "IN",
    "zip": "46405",
    "lat": 41.573,
    "lng": -87.246,
    "specialties": ["Primary Care", "Dental"],
    "avgVisitsNeeded": 4,
    "recoverySpeed": "fast",
    "outcomeQuality": "high",
    "treatmentBurden": "low",
    "totalCostEstimate": 1200,
    "perVisitCost": 300,
    "patientSummary": "Highly rated dental clinic with fast recovery...",
    "distanceMiles": 12.4,
    "recoveryScore": 0.92,
    "costScore": 0.78,
    "badges": { "bestValue": true, "topRecommendation": false, ... }
  }
]
```

#### `GET /api/clinics/recommendations`

Infer a specialty from a query and return quick-search tags.

| Param   | Type   | Description       |
| ------- | ------ | ----------------- |
| `query` | string | Free-text query   |

**Response:**
```json
{
  "specialty": "Urgent Care",
  "condition": "knee pain",
  "quickTags": ["Urgent Care", "Primary Care", "Dental", "Behavioral Health", "Pediatrics", "Women's Health"]
}
```

Quick tags are the 6 most common specialties across all clinics (DB-driven, cached after first call).

#### `GET /api/clinics/compare?ids=id1,id2`

Fetch multiple clinics by ID for side-by-side comparison.

**Response:** `Clinic[]` in the order requested. Missing IDs are silently dropped.

Also supports `POST /api/clinics/compare` with body `{ "ids": ["id1", "id2"] }`.

#### `GET /api/clinics/:id`

Single clinic by HRSA ID. Returns 404 if not found.

### Insurance Endpoints

#### `GET /api/insurance`

Tier summary with aggregate stats. Used by the sidebar filter on ResultsPage.

| Param   | Type   | Description              |
| ------- | ------ | ------------------------ |
| `state` | string | Filter by state (optional)|

**Response:**
```json
{
  "state": null,
  "tiers": [
    {
      "tier": "bronze",
      "planCount": 2342,
      "avgPremium": 259,
      "avgDeductible": 5328,
      "avgOopMax": 6206,
      "avgCoinsurance": 1990,
      "label": "Bronze",
      "coveragePct": 60,
      "color": "amber"
    }
  ]
}
```

#### `GET /api/insurance/providers`

Provider catalog for the home page wizard. Each provider has an extracted brand name (from plan names) and a list of plan types.

| Param   | Type   | Description              |
| ------- | ------ | ------------------------ |
| `state` | string | Filter by state (optional)|

**Response:**
```json
[
  {
    "id": "prov-33602",
    "name": "Blue Cross Blue Shield Solution",
    "policies": [
      { "id": "ins-33602-hmo", "name": "Blue Cross Blue Shield Solution HMO", "type": "HMO" },
      { "id": "ins-33602-ppo", "name": "Blue Cross Blue Shield Solution PPO", "type": "PPO" }
    ]
  }
]
```

#### `GET /api/insurance/by-clinic/:clinicId`

Plans that cover a clinic's county. Resolves the clinic's `county_fips`, then JOINs `insurance_plans` with `service_areas`.

**Response:**
```json
{
  "data": [{ "planId": "...", "planName": "...", ... }],
  "total": 42,
  "countyFips": "17031",
  "pagination": { "total": 42, "limit": 50, "offset": 0, "hasMore": false }
}
```

#### `GET /api/insurance/:planId/rates`

Age-banded monthly premium rates for a plan.

| Param        | Type   | Description               |
| ------------ | ------ | ------------------------- |
| `age`        | string | Filter by age band        |
| `ratingArea` | string | Filter by rating area     |

#### `GET /api/insurance/plans`

Paginated raw plan listing with filters: `state`, `countyFips`, `planType`, `metalLevel`, `coverageTier`, `limit`, `offset`.

#### `GET /api/insurance/tiers`

Alias for `GET /api/insurance` (backward compatibility).

#### `GET /api/insurance/states`

Returns array of state codes: `["AL", "AK", "AZ", ...]`

#### `GET /api/insurance/:id`

Single plan detail. Returns 404 if not found.

### Geo Endpoints

#### `GET /api/geo/zip/:zip`

Resolve a 5-digit US ZIP code to coordinates. No external API — computed from clinic data.

**Response:**
```json
{
  "zip": "60616",
  "lat": 41.846897,
  "lng": -87.625369,
  "city": "Chicago",
  "state": "IL",
  "county": "Cook County",
  "countyFips": "17031"
}
```

Returns 404 if the ZIP has no clinics in the database.

### Health

#### `GET /api/health`

**Response:** `{ "status": "ok" }`

---

## 5. Frontend Architecture

### Tech Stack

- **React 18** — functional components, hooks
- **TypeScript** — strict typing via `tsconfig.json`
- **Vite** — dev server with HMR, production bundler
- **Tailwind CSS 3** — utility-first CSS with custom design tokens
- **react-router-dom v7** — client-side routing
- **react-hot-toast** — toast notifications for errors/success

### Routing (App.tsx)

| Path               | Component     | Description                    |
| ------------------ | ------------- | ------------------------------ |
| `/`                | `HomePage`    | Multi-step search wizard       |
| `/results`         | `ResultsPage` | Clinic results + sidebar filters|
| `/compare`         | `ComparePage` | Side-by-side comparison        |
| `/compare/summary` | `SummaryPage` | Card-grid comparison overview  |

### Component Tree

```
App
├── MedMotifBackground          # Animated pill/capsule canvas background
│   └── MedMotifField           # Canvas rendering engine (parallax layers)
├── Navbar                      # Logo + theme toggle + mobile hamburger
├── <Routes>
│   ├── HomePage
│   │   └── PlanSelect          # Custom dropdown for insurance plans
│   ├── ResultsPage
│   │   ├── FilterSlider        # Inline: distance range slider
│   │   ├── ExpandedClinicCard  # Inline: top clinic (full stats)
│   │   ├── CompactClinicCard   # Inline: secondary clinics (grid)
│   │   └── Stat                # Inline: single metric display
│   ├── ComparePage
│   │   ├── ProviderColumn      # Inline: one clinic's metrics
│   │   ├── OutcomeQualityBadge # Inline: high=green, low=red
│   │   └── Row                 # Inline: label/value row
│   └── SummaryPage
│       ├── ProviderCard        # Inline: clinic card in grid
│       └── Row                 # Inline: label/value row
├── Footer                      # Disclaimer + conditional back-to-top
├── StatusBadge                 # Coloured pill badge for status values
├── ErrorBoundary               # Catches render errors → fallback UI
└── Toaster (react-hot-toast)   # Toast notification container
```

### Page Flow

```
HomePage                        ResultsPage                    ComparePage
┌─────────────────┐            ┌─────────────────┐           ┌─────────────────┐
│ 1. Enter query  │            │ Sidebar:         │           │ Side-by-side     │
│ 2. Enter ZIP    │ ─navigate─>│  Distance slider │           │ clinic metrics   │
│ 3. Insurance?   │   /results │  Insurance tier  │ ─navigate─│ Cost bar chart   │
│    Yes → wizard │            │                  │  /compare │ Visit Website    │
│    No → skip    │            │ Results:         │           │ Back to Results  │
│ 4. Priority     │            │  Top clinic card │           └─────────────────┘
│    slider       │            │  Grid of others  │
│ 5. Find Care    │            │  Compare strip   │
└─────────────────┘            └─────────────────┘
```

### API Client (lib/api.ts)

All backend communication goes through typed wrapper functions:

| Function                   | Endpoint                        | Returns                |
| -------------------------- | ------------------------------- | ---------------------- |
| `fetchClinics(params)`     | `GET /api/clinics/search`       | `Clinic[]`             |
| `fetchCompare(ids)`        | `GET /api/clinics/compare`      | `Clinic[]`             |
| `fetchRecommendations()`   | `GET /api/clinics/recommendations` | `{ specialty, quickTags }` |
| `fetchInsuranceProviders()`| `GET /api/insurance/providers`  | `InsuranceProvider[]`  |
| `fetchInsuranceTiers()`    | `GET /api/insurance`            | `{ tiers }`            |
| `zipToCoords(zip)`         | `zippopotam.us/us/{zip}`        | `{ lat, lng } | null`  |

**`normalizeClinic(raw)`** — Transforms raw API responses:
- `badges`: Converts from object `{ bestValue: true }` to string array `["best-value"]` for `.includes()` checks
- `perVisitCostTier`: Normalizes "medium" to "moderate" for StatusBadge compatibility
- `highlightTags`: Ensures always an array

**`apiFetch<T>(url)`** — Generic fetch wrapper with error handling:
- Network errors → "Cannot reach backend" message
- Non-200 responses → parses `{ error }` from body or falls back to status text
- Returns typed JSON

### State Management

No external state library — React's built-in hooks are sufficient:
- `useState` — local component state
- `useMemo` — derived data (filtered clinics, insurance context)
- `useEffect` — API calls on mount/param change
- `useSearchParams` — URL-driven state for search parameters

The URL is the source of truth for search state. HomePage builds query params and navigates; ResultsPage reads them.

### Theme System (context/ThemeContext.tsx)

- Toggle between `light` and `dark` modes
- Persisted in `localStorage` under key `careculator-theme`
- Default: `dark`
- Applied via `document.documentElement.classList.toggle('dark')`
- Tailwind's `darkMode: 'class'` strategy reads this class

### Custom CSS Classes (index.css)

Defined in `@layer utilities` for Tailwind compatibility:

| Class               | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `.glass-card`       | Frosted glass card with backdrop-blur            |
| `.badge-green/red/amber/teal` | Coloured pill badges for status values |
| `.btn-primary`      | Gradient teal-to-blue button                     |
| `.btn-ghost`        | Bordered transparent button                      |
| `.surface-nav`      | Navbar surface (blurred, bordered)               |
| `.surface-footer`   | Footer surface                                   |
| `.bg-compare-strip` | Sticky compare bar at bottom of results          |
| `.bg-top-rec`       | Highlighted top recommendation card              |
| `.home-search-input`| High-contrast input for the search wizard        |
| `.row-divider`      | Flex row with bottom border (used in compare)    |

### StatusBadge Semantics

The `StatusBadge` component maps status strings to colours:

| Status     | Colour | Use case                  |
| ---------- | ------ | ------------------------- |
| `fast`     | green  | Recovery speed            |
| `slow`     | red    | Recovery speed            |
| `moderate` | amber  | Recovery speed, burden    |
| `high`     | red    | Treatment burden, visits  |
| `low`      | green  | Treatment burden, visits  |
| `best-value` | teal | Badge on best-value clinics|

**Important caveat:** `high` = red makes sense for burden (high burden = bad) but is wrong for outcome quality (high outcome = good). The `ComparePage` uses a separate `OutcomeQualityBadge` component that inverts the mapping: `high` = green, `low` = red.

### Animated Background (MedMotifField.tsx)

Canvas-based animation rendering pill-shaped motifs (capsules, tablets, spheres):
- **3 depth layers** with different opacity, scale, and drift speeds
- **Mouse-reactive** — motifs push away from cursor with spring physics
- **Theme-aware** — separate color palettes for light/dark modes
- **Performance** — uses `requestAnimationFrame`, capped delta time, `ResizeObserver` for responsive canvas sizing

---

## 6. Data Pipeline

### Building the Database

The database is built from federal data sources using `backend/src/scripts/build_database.py`.

**Two modes:**
1. **`raw` mode** — Downloads and processes raw HRSA XLSX + CMS CSVs
2. **`legacy` mode** — Reads from pre-processed CSVs (in the now-deleted `database/` folder)

**Steps:**
1. Create SQLite tables with proper schemas
2. Load HRSA data into `clinics` (geocoded, with computed clinical scores)
3. Load CMS plans into `insurance_plans`
4. Load CMS networks into `networks`
5. Load CMS service areas into `service_areas`
6. Load CMS rate data into `rates` (3.4M rows, ~150 MB CSV)
7. Create indexes for query performance

**Key indexes:**
- `idx_clinics_state` — state-level filtering
- `idx_clinics_zip` — ZIP geocoding
- `idx_plans_state` — state-level plan filtering
- `idx_plans_issuer` — issuer grouping for provider wizard
- `idx_rates_plan` — plan-level rate lookups (critical for the 3.4M-row table)
- `idx_sa_county` — county-level service area lookups

### Migration Script

`backend/src/scripts/migrate_coverage_tier.py` — One-time migration that adds `actuarial_value` and `coverage_tier` columns to `insurance_plans`. Maps actuarial values to Bronze/Silver/Gold/Premium tiers.

---

## 7. Key Algorithms

### Haversine Distance

Used to compute distance from the user to each clinic.

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
c = 2 × atan2(√a, √(1-a))
distance = Earth_radius × c
```

Earth radius = 3,958.8 miles. Input in decimal degrees, output in miles.

### Weighted Score Sort

Clinics are sorted by a composite score:

```
score = recoveryWeight × recoveryScore + costWeight × costScore
```

Where:
- `recoveryScore` (0–1): higher = better clinical outcomes
- `costScore` (0–1): higher = cheaper
- `recoveryWeight = 1 - (priorityWeight / 100)`
- `costWeight = priorityWeight / 100`

### Brand Name Extraction

Extracts readable insurance brand names from CMS plan names (since `issuer_name` in CMS data is often a numeric ID).

Algorithm:
1. Find the earliest occurrence of a metal-level token (`bronze`, `silver`, `gold`, `platinum`) or plan-type token (`hmo`, `ppo`, `epo`, `pos`, `hsa`, `hdhp`)
2. Cut the plan name before that token
3. Strip trailing noise: punctuation, articles (`with`, `for`, `the`)
4. Validate: must be 3+ characters and not all digits
5. Fallback: try cutting before the first digit sequence (e.g., "Ambetter Essential Care 1" → "Ambetter Essential Care")
6. Final fallback: use `network_name` from the networks table

### Insurance Cost Adjustment

```
adjustedCost = totalCost × (1 - coveragePct / 100)
```

Applied client-side when the user selects an insurance tier in the sidebar or comes through the insurance wizard flow.

---

## 8. Configuration

### Environment Variables

| Variable       | Default     | Description                    |
| -------------- | ----------- | ------------------------------ |
| `PORT`         | `3001`      | Backend server port            |
| `VITE_API_URL` | (empty)     | Override API base URL in frontend |

### Vite Proxy (frontend/vite.config.ts)

In development, all `/api/*` requests are proxied to `http://localhost:3001`:

```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001', changeOrigin: true }
  }
}
```

### SQLite Pragmas (backend/src/services/dataLayer.service.js)

| Pragma       | Value       | Purpose                              |
| ------------ | ----------- | ------------------------------------ |
| `cache_size` | -65536      | 64 MB page cache (in kibibytes)      |
| `temp_store` | MEMORY      | Sort/join spills go to RAM           |
| `mmap_size`  | 268435456   | 256 MB memory-mapped file access     |

### Pagination Defaults (backend/src/config/index.js)

| Constant          | Value | Description                  |
| ----------------- | ----- | ---------------------------- |
| `DEFAULT_PAGE_SIZE`| 50   | Default rows per page        |
| `MAX_PAGE_SIZE`    | 500  | Hard ceiling on page size    |

---

## 9. Design Decisions

### Why SQLite?

- **Single-file deployment** — no database server to install or configure
- **264 MB is manageable** — fits in memory with mmap, fast enough for read-only workloads
- **better-sqlite3 is synchronous** — no callback overhead; Node.js is single-threaded so a single connection is safe
- **Prepared statements are cached** — repeated queries compile once

### Why no ORM?

- Raw SQL gives full control over JOINs, window functions (`ROW_NUMBER`), `json_each()` virtual tables
- The query patterns are complex enough that an ORM would obscure rather than simplify
- `better-sqlite3`'s `.prepare().all()` API is already clean

### Why extract brand names from plan names?

The CMS `issuer_name` field contains numeric IDs in many records, not human-readable company names. Options considered:
1. **Hardcoded brand map** — rejected (violates "no hardcoded data" principle)
2. **Static JSON file** — rejected (same reason)
3. **SQL + JS extraction** — chosen. Uses `ROW_NUMBER()` to find the longest plan name per issuer, then `extractBrandFromPlanName()` strips metal/type suffixes to isolate the brand prefix.

### Why client-side distance filtering?

The backend returns all clinics within 100 miles (default). The frontend's distance slider narrows them further without a new API call. This gives instant feedback as the user drags the slider, while keeping the API simple (one fetch per search).

### Why no external geocoding API?

ZIP-to-coordinates is derived from the clinics table itself (average lat/lng of all clinics in that ZIP). This avoids external API dependencies and rate limits. The tradeoff: ZIPs with no HRSA clinics return 404. The frontend falls back to `zippopotam.us` for the initial ZIP → lat/lng conversion on the home page.

### Why Tailwind utility classes in index.css?

Components like `.glass-card`, `.badge-green`, `.btn-primary` are used across many components. Defining them as Tailwind `@layer utilities` classes keeps JSX readable while maintaining the utility-first approach. All custom classes compose Tailwind utilities — no raw CSS values.

### Why StatusBadge and OutcomeQualityBadge are separate

`StatusBadge` treats `high` as bad (red) — correct for treatment burden, per-visit cost, etc. But outcome quality has inverted semantics: `high` outcome quality is good. Rather than adding a `reversed` prop (which would make every call site confusing), `ComparePage` uses a dedicated `OutcomeQualityBadge` with the correct mapping. This keeps each component simple and self-documenting.

---

## 10. Development Workflow

### Starting the app

```bash
npm run dev    # From project root — starts both backend + frontend via concurrently
```

Backend uses `node --watch` for auto-reload. Frontend uses Vite HMR.

### Type checking (frontend)

```bash
cd frontend && npx tsc --noEmit
```

### Production build (frontend)

```bash
cd frontend && npx vite build    # Outputs to frontend/dist/
```

### API documentation

Visit `http://localhost:3001/api/docs` for interactive Swagger UI. Add `@swagger` JSDoc comments to route files — the spec regenerates on server restart.

### Adding a new API endpoint

1. Add the SQL query in the appropriate model (`src/models/`)
2. Add business logic in the appropriate service (`src/services/`)
3. Add the HTTP handler in the appropriate controller (`src/controllers/`)
4. Register the route in the appropriate route file (`src/routes/`) with `@swagger` annotation
5. Wrap the handler with `asyncHandler()` for automatic error forwarding

### Adding a new frontend page

1. Create the page component in `frontend/src/pages/`
2. Add the route in `App.tsx`
3. Add API functions in `lib/api.ts` if needed
4. Use existing components (`StatusBadge`, `glass-card`, `btn-primary`) for consistency
