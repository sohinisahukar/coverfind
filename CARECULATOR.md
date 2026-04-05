# Careculator — Full Project Documentation

> Written so that anyone, regardless of technical background, can understand exactly what this project is, how it works, and why every decision was made.

---

## Table of Contents

1. [What Is This?](#1-what-is-this)
2. [Why Does This Exist?](#2-why-does-this-exist)
3. [The Core Idea — Treatment Burden](#3-the-core-idea--treatment-burden)
4. [How A User Experiences It](#4-how-a-user-experiences-it)
5. [The Data — Where It All Comes From](#5-the-data--where-it-all-comes-from)
6. [The Database — What's Stored](#6-the-database--whats-stored)
7. [The Backend — How The API Works](#7-the-backend--how-the-api-works)
8. [The Scoring Engine — How Clinics Get Ranked](#8-the-scoring-engine--how-clinics-get-ranked)
9. [The Frontend — What The User Sees](#9-the-frontend--what-the-user-sees)
10. [Complete API Reference](#10-complete-api-reference)
11. [Project File Structure](#11-project-file-structure)
12. [How To Run It](#12-how-to-run-it)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. What Is This?

Careculator is a **healthcare decision tool**.

You type in what's wrong with you — "knee pain", "dental cleaning", "skin rash" — and it shows you a ranked list of real, federally-funded health clinics near you. Not just the closest one. Not just the cheapest one. The one that will actually **get you better the fastest, with the least hassle and cost**.

Think of it like Google Maps for healthcare, but instead of showing you how far away a clinic is, it shows you:

- How many visits will you probably need?
- How fast do patients typically recover here?
- Is the treatment going to be exhausting or easy?
- What's the total cost going to look like?
- Which insurance plans cover clinics in your area?

---

## 2. Why Does This Exist?

Most healthcare tools fall into two traps:

**Trap 1: They only show you distance.**
"This hospital is 0.5 miles away!" — but patients there need 12 visits to recover vs. 4 visits at a clinic 3 miles away. You'd actually spend more time and money going to the closer one.

**Trap 2: They only show you price.**
"This clinic charges $50 per visit!" — but if you need 20 visits, that's $1,000. The "expensive" clinic that gets you better in 3 visits at $100/each costs $300 total. The "cheap" one costs 3x more.

**Careculator's angle:** Show the full picture. Every dimension of effort — time, visits, recovery quality, cost, treatment burden — in one place, ranked intelligently.

---

## 3. The Core Idea — Treatment Burden

This is the signature concept of the app.

**Treatment Burden** = the total effort required to get better at a specific clinic.

It combines:

| Factor | What it means | Example |
|--------|--------------|---------|
| `avgVisitsNeeded` | How many trips to the clinic before you're better | 3 visits vs. 12 visits |
| `recoverySpeed` | How fast patients typically get better | `fast` / `moderate` / `slow` |
| `recoveryDays` | Estimated total days until recovered | 14 days vs. 60 days |
| `outcomeQuality` | How good the outcome typically is | `high` / `moderate` / `low` |
| `treatmentBurden` | Overall burden rating | `low` / `moderate` / `high` |
| `burdenScore` | A 0–1 number (higher = less burden) | 0.85 = low burden |
| `totalCostEstimate` | Estimated total $ to get better | $300 vs. $1,200 |
| `perVisitCost` | Cost per individual visit | $45/visit |

> **Important:** These scores are synthetic — they were computed during the data preprocessing phase using statistical modeling across patient outcome patterns. They are NOT from a government dataset. Think of them as educated estimates, not clinical facts.

---

## 4. How A User Experiences It

Here's the complete user journey from start to finish:

### Step 1 — Home Page

The user lands on a dark, space-themed homepage.

They see:
- A text box: *"What do you need care for?"* — they type something like "knee pain"
- A ZIP code box: *"ZIP code (e.g. 60616)"*
- A slider: **Faster Recovery ←→ Lower Cost** (default is 50/50 balance)
- Quick tags they can click: Primary Care, Dental, Urgent Care, Behavioral Health, etc.

When they hit **Find Best Care**:
1. The app looks up the ZIP code against our backend to get the actual latitude/longitude coordinates
2. It sends all of this to the backend as a search request
3. It navigates to the Results page

### Step 2 — Results Page

The user sees:
- A **top recommendation banner** — the single best clinic for their query, with a plain-English explanation of why
- The **top clinic card** (expanded) — shows all the key stats
- A **grid of other clinics** below
- A **sidebar** with filters:
  - Distance slider (1–25 miles)
  - Insurance panel — shows Bronze/Silver/Gold/Platinum tiers with average premiums
- A **sticky compare bar** at the bottom — as they click "Compare" on clinics, those clinics queue up here

### Step 3 — Compare Page

The user sees two clinics side-by-side:

| Metric | Clinic A | Clinic B |
|--------|----------|----------|
| Avg Visits | 4 | 11 |
| Recovery Speed | Fast | Moderate |
| Outcome Quality | High | Moderate |
| Total Cost | ~$280 | ~$760 |
| Per Visit Cost | $70 | $69 |
| Treatment Burden | Low ✅ | High ❌ |

Plus a bar chart comparing total estimated costs.

At the bottom: **"Choose [Clinic A]"** button — clicking it opens the clinic's actual website so they can book an appointment.

### Step 4 — Summary Page

A card-grid view of all selected clinics for a quick overview before making the final choice.

---

## 5. The Data — Where It All Comes From

Everything in the database comes from two real government datasets:

### Clinic Data — HRSA
**Source:** US Health Resources & Services Administration  
**URL:** https://data.hrsa.gov/data/download  
**File:** `Health_Center_Service_Delivery_and_LookAlike_Sites.xlsx`

This gives us 9,323 **Federally Qualified Health Centers (FQHCs)** — these are government-funded clinics that exist specifically to serve people who are uninsured, underinsured, or low-income. They operate on a sliding-fee scale.

Every clinic record has: name, address, city, state, ZIP, phone, website, NPI number, lat/lng coordinates, county, county FIPS code, specialties.

The treatment burden scores, visit estimates, recovery speeds, and cost estimates were **added synthetically** during preprocessing (see the Jupyter notebook at `models/pre-processing.ipynb`).

### Insurance Data — CMS
**Source:** Centers for Medicare & Medicaid Services  
**URL:** https://www.cms.gov/cciio/resources/data-resources/marketplace-puf  
**Files:** `PlanAttributes.csv`, `Network.csv`, `ServiceArea.csv`, `Rate.csv`

This gives us 2014–2016 ACA marketplace insurance plans:
- 7,349 insurance plans across 39 states
- 1,759 insurer networks
- 54,205 service area mappings (which counties each insurer covers)
- 3,467,016 age-banded premium rate rows

---

## 6. The Database — What's Stored

The database is a single SQLite file: `backend/src/data/careculator.db` (~264 MB)

SQLite was chosen because:
- The data is read-only (we never write to it at runtime)
- It's a single file — no database server to run
- `better-sqlite3` is synchronous and extremely fast for this use case
- The whole DB is about the same size as a movie

### Tables

#### `clinics` — 9,323 rows

Every HRSA Federally Qualified Health Center in the US.

```
id              → "hrsa-H80CS00726-7"  (unique identifier)
name            → "Rea Clinic - Benton"
org_name        → parent organization name
address         → "123 Main St"
city, state, zip → "Benton", "IL", "62812"
lat, lng        → 38.0012, -88.9201  (for distance calculations)
county          → "Franklin County"
county_fips     → "17055"  ← THIS IS THE KEY that links clinics to insurance
phone           → "618-435-1234"
website         → "https://reaclinic.org"
specialties     → ["Primary Care", "Dental", "Behavioral Health"]
keywords        → ["knee", "dental", "mental health", ...]

--- TREATMENT BURDEN SIGNALS (synthetic) ---
avg_visits      → 4.2   (avg visits patients need)
recovery_speed  → "fast" | "moderate" | "slow"
recovery_days   → 14
outcome_quality → "high" | "moderate" | "low"
treatment_burden→ "low" | "moderate" | "high"
burden_score    → 0.82  (0–1, higher = less burden)

--- COST SIGNALS (synthetic) ---
total_cost_est  → 285.00  (estimated total treatment cost in $)
per_visit_cost  → 45.00
per_visit_tier  → "low" | "medium" | "high"

--- SCORING (synthetic) ---
recovery_score  → 0.78  (0–1, higher = better recovery)
cost_score      → 0.91  (0–1, higher = lower cost)

--- PATIENT-FACING ---
patient_summary → "Patients typically recover in 3–4 visits with high success rates."
highlight_tags  → ["Fast recovery", "Low cost", "Accepts uninsured"]
badges          → { bestValue: true, topRecommendation: false, ... }
```

#### `insurance_plans` — 7,349 rows

ACA marketplace plans from 2014–2016.

```
plan_id         → "36096IL0790002"  (CMS identifier)
plan_name       → "Blue Choice Gold PPO 002"
issuer_id       → 36096
issuer_name     → "Blue Cross Blue Shield of Illinois"
plan_type       → "HMO" | "PPO" | "EPO" | "POS"
metal_level     → "Bronze" | "Silver" | "Gold" | "Platinum"
deductible      → 1500.00  (annual deductible in $)
oop_max         → 6000.00  (max you'd pay out of pocket in a year)
coinsurance_pct → 0.20     (you pay 20% after deductible)
monthly_premium → 365.00   (cost per month for a 40-year-old)
actuarial_value → 80.0     (% of costs the plan covers on average)
coverage_tier   → "gold"   (derived: premium≥90%, gold≥80%, silver≥70%, bronze<70%)
network_id      → links to networks table
service_area_id → links to service_areas table
state, year     → "IL", 2015
```

#### `service_areas` — 54,205 rows

The bridge between insurance plans and geography. Answers: *"Which counties does this insurer cover?"*

```
service_area_id → "ILS001"
issuer_id       → 36096
state           → "IL"
county_fips     → "17031"  (Cook County = Chicago)
covers_entire_state → 0
```

#### `networks` — 1,759 rows

Metadata about insurer provider networks.

```
network_id   → "ILB001"
issuer_id    → 36096
network_name → "Blue Choice PPO Network"
network_url  → "https://..."
```

#### `rates` — 3,467,016 rows

Age-banded premium rates. How much does this plan cost for a 25-year-old vs. a 60-year-old?

```
plan_id         → "73836AK0650002"
rating_area     → "Rating Area 1"
age             → "40" | "0-20" | "Family Option"
monthly_premium → 344.00
```

#### `master_view` (view, not a table)

A pre-joined SQL view that combines clinics → service_areas → insurance_plans → networks in one query. Used for the "plans that cover this clinic's county" feature.

### How The Tables Connect

```
clinics.county_fips
        │
        ▼
service_areas.county_fips
        │
        ├─ service_area_id ──┐
        └─ issuer_id ────────┤
                             ▼
                    insurance_plans
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
               networks          rates
           (network info)   (age-banded premiums)
```

**In plain English:** A clinic is in a county (via `county_fips`). An insurance company declares which counties it serves (via `service_areas`). So you can ask: *"What insurance plans are available in the same county as this clinic?"* — and that's exactly what `GET /api/insurance/by-clinic/:clinicId` does.

---

## 7. The Backend — How The API Works

The backend is a **Node.js / Express** server. It runs on port 3001.

### Architecture

```
HTTP Request
     │
     ▼
Express Router  (routes/*.routes.js)
     │
     ▼
Controller      (controllers/*.controller.js)
     │           ← HTTP concerns only: parse params, log, send response
     ▼
Service         (services/*.service.js)
     │           ← Business logic: 404 errors, pagination envelopes, validation
     ▼
Model           (models/*.model.js)
     │           ← SQL queries only: parameterized statements, row mapping
     ▼
SQLite DB       (data/careculator.db)
```

**Why this layering?**

- If you want to change how pagination works → change the service
- If you want to change a SQL query → change the model
- If you want to change what HTTP status codes mean → change the controller
- None of these layers knows about the others' internal details

### Database Connection

There is **one** database connection for the entire server lifetime, shared across all models:

```
dataLayer.service.js → getDb() singleton
```

The connection is:
- **Read-only** (we never write to the DB at runtime)
- **Optimized with pragmas:**
  - 64 MB page cache — keeps frequently-used data in RAM
  - Memory-mapped I/O — OS can serve data directly from page cache
  - Temp store in memory — sorting/joining doesn't touch disk

---

## 8. The Scoring Engine — How Clinics Get Ranked

This is the heart of the app. When you search for clinics, here's what happens step by step:

### Step 1: SQL Keyword Filter

Your search query ("knee pain") gets split into individual terms: `["knee", "pain"]`

Each term must match at least one of: clinic name, specialties list, or keywords list.

```sql
WHERE (LOWER(name) LIKE '%knee%' OR LOWER(specialties) LIKE '%knee%' OR LOWER(keywords) LIKE '%knee%')
  AND (LOWER(name) LIKE '%pain%' OR LOWER(specialties) LIKE '%pain%' OR LOWER(keywords) LIKE '%pain%')
```

If no search term → returns all 9,323 clinics (for a pure location search).

You can also filter by state directly: `state=IL`

### Step 2: Distance Calculation

For every clinic that passed the keyword filter, the server computes how far it is from you using the **Haversine formula** — the same math GPS uses to calculate distances on a sphere (the Earth).

```
distance = haversine(yourLat, yourLng, clinic.lat, clinic.lng)
```

Your `lat`/`lng` come from the ZIP code you entered. The ZIP lookup hits our own backend endpoint (`GET /api/geo/zip/60616`) which looks up the centroid of all clinics in that ZIP code. No external APIs.

### Step 3: Distance Filter

If you set a max distance (e.g., "within 25 miles"), clinics beyond that radius are dropped.

### Step 4: Treatment Burden Filter

If you selected "Low burden only" in the sidebar, clinics with `treatmentBurden !== 'low'` are dropped.

### Step 5: Weighted Score Sort

This is the magic. The priority slider controls the weights:

```
slider = 0   →  you want fastest recovery   (recoveryWeight=1.0, costWeight=0.0)
slider = 50  →  balanced (default)           (recoveryWeight=0.5, costWeight=0.5)
slider = 100 →  you want lowest cost        (recoveryWeight=0.0, costWeight=1.0)
```

Each clinic gets a combined score:

```
score = (1 - slider/100) × recoveryScore  +  (slider/100) × costScore
```

Clinics are sorted by this score, highest first. The top result is the one that best matches your specific priorities.

### Step 6: Pagination

The sorted list is sliced: default 50 clinics per page. The response tells you:

```json
{
  "data": [...50 clinics...],
  "total": 193,
  "pagination": { "total": 193, "limit": 50, "offset": 0, "hasMore": true },
  "center": { "lat": 41.8827, "lng": -87.6233 }
}
```

---

## 9. The Frontend — What The User Sees

The frontend is a **React + TypeScript** app using **Vite** as the build tool and **Tailwind CSS** for styling. It runs on port 5173.

### Pages

| Route | Component | What it does |
|-------|-----------|-------------|
| `/` | `HomePage.tsx` | Search form + quick tags |
| `/results` | `ResultsPage.tsx` | Ranked clinic list + filters |
| `/compare` | `ComparePage.tsx` | Side-by-side comparison |
| `/compare/summary` | `SummaryPage.tsx` | Card grid overview |

### Frontend API Layer (`src/lib/api.ts`)

This is the single file that handles all backend communication. Every API call goes through here.

**Key functions:**

```typescript
// Search clinics — returns Clinic[] (extracts .data from paginated envelope internally)
fetchClinics({ q, state, lat, lng, priorityWeight, maxDistanceMi, treatmentBurden })

// Compare clinics side-by-side
fetchCompare(ids: string[])

// Get live quick-search tags from backend
fetchRecommendations()

// Get insurance tier summary (Bronze/Silver/Gold/Platinum stats)
fetchInsuranceTiers(state?: string)

// Resolve a ZIP code to lat/lng/city/state/countyFips
zipToCoords(zip: string)  // calls our own GET /api/geo/zip/:zip — no external dependency
```

### The `Clinic` Interface (what every clinic object looks like)

```typescript
interface Clinic {
  id:               string;      // "hrsa-H80CS00726-7"
  name:             string;
  orgName:          string;
  address?:         string;
  city:             string;
  state:            string;
  zip:              string;
  lat:              number;
  lng:              number;
  county?:          string;
  countyFips?:      string;      // used to look up insurance plans
  phone?:           string;
  website?:         string;
  specialties:      string[];
  keywords:         string[];
  avgVisitsNeeded:  number;
  recoverySpeed:    'fast' | 'moderate' | 'slow';
  recoveryDays:     number;
  outcomeQuality:   'high' | 'moderate' | 'low';
  treatmentBurden:  'low' | 'moderate' | 'high';
  burdenScore:      number;
  totalCostEstimate: number;
  perVisitCost:     number;
  perVisitCostTier: 'low' | 'medium' | 'high';
  patientSummary:   string;
  highlightTags:    string[];
  recoveryScore:    number;       // 0–1
  costScore:        number;       // 0–1
  badges: {
    bestValue:         boolean;
    topRecommendation: boolean;
    highVisits:        boolean;
    newInsurance:      boolean;
  };
  distanceMiles?:   number;       // computed at query time
}
```

---

## 10. Complete API Reference

Base URL: `http://localhost:3001`

---

### Clinics

#### `GET /api/clinics/search`
Search and rank clinics.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Free-text search ("knee pain", "dental") |
| `state` | string | — | Two-letter state code ("IL") |
| `lat` | number | 41.88 | User latitude (from ZIP lookup) |
| `lng` | number | -87.62 | User longitude (from ZIP lookup) |
| `maxDistanceMi` | number | — | Max miles from user location |
| `treatmentBurden` | string | — | `low` / `moderate` / `high` |
| `priorityWeight` | 0–100 | 50 | 0=recovery-first, 100=cost-first |
| `limit` | number | 50 | Max results (cap: 200) |
| `offset` | number | 0 | Skip N results (for pagination) |

**Response:**
```json
{
  "data": [{ ...Clinic, "distanceMiles": 2.4 }, ...],
  "total": 193,
  "pagination": { "total": 193, "limit": 50, "offset": 0, "hasMore": true },
  "center": { "lat": 41.8827, "lng": -87.6233 }
}
```

---

#### `GET /api/clinics/recommendations`
Infer a specialty from a query string. Also returns the quick-tag presets.

**Query params:** `query` or `q` — free-text

**Response:**
```json
{
  "specialty": "Physical Therapy",
  "condition": "knee pain",
  "quickTags": ["Primary Care", "Urgent Care", "Dental", "Pediatrics", "Behavioral Health", "Women's Health"]
}
```

---

#### `GET /api/clinics/compare?ids=id1,id2`
#### `POST /api/clinics/compare` — body: `{ "ids": ["id1","id2"] }`
Side-by-side comparison. Returns clinics in the same order as requested IDs.

**Response:** `Clinic[]`

---

#### `GET /api/clinics/:id`
Full clinic detail.

**Response:** Single `Clinic` object with all 22 fields.

**Errors:** `404` if clinic not found.

---

### Insurance

#### `GET /api/insurance/tiers?state=IL`
Aggregate stats per coverage tier. Powers the insurance filter panel on the results page.

**Response:**
```json
{
  "state": "IL",
  "tiers": [
    {
      "tier": "bronze",
      "label": "Bronze",
      "coveragePct": 60,
      "color": "amber",
      "planCount": 178,
      "avgPremium": 259,
      "avgDeductible": 5200,
      "avgOopMax": 6500,
      "avgCoinsurance": 40
    }
  ]
}
```

---

#### `GET /api/insurance/states`
All state codes that have insurance plan data.

**Response:** `["AK", "AL", "AR", "AZ", ...]` (39 states)

---

#### `GET /api/insurance`
Paginated list of individual plans with filters.

**Query params:** `state`, `countyFips`, `planType` (HMO/PPO/EPO/POS), `metalLevel`, `coverageTier`, `limit`, `offset`

**Response:** `{ data: Plan[], total, pagination }`

---

#### `GET /api/insurance/by-clinic/:clinicId`
Find all insurance plans that cover the county of a specific clinic.

**How it works:** Looks up the clinic's `county_fips`, then queries `service_areas` to find which insurance issuers cover that county, then returns those plans.

**Response:**
```json
{
  "countyFips": "17055",
  "data": [...plans...],
  "total": 79,
  "pagination": { "total": 79, "limit": 50, "offset": 0, "hasMore": true }
}
```

---

#### `GET /api/insurance/:planId/rates?age=40`
Age-banded monthly premium rates for a specific plan.

**Query params:** `age` (optional), `ratingArea` (optional)

**Response:**
```json
{
  "planId": "73836AK0650002",
  "rates": [
    { "planId": "73836AK0650002", "ratingArea": "Rating Area 1", "age": "40", "monthlyPremium": 344 }
  ]
}
```

**Note:** Only 673 of the 7,349 plans have rate data (the CSVs are from different dataset years).

---

#### `GET /api/insurance/:planId`
Full plan detail including network metadata.

**Response:**
```json
{
  "planId": "36096IL0790002",
  "planName": "Blue Choice Gold PPO 002",
  "issuerName": "Blue Cross Blue Shield of Illinois",
  "planType": "PPO",
  "metalLevel": "Gold",
  "deductible": 500,
  "oopMax": 3000,
  "coinsurancePct": 0.20,
  "monthlyPremium": 363,
  "actuarialValue": 80,
  "coverageTier": "gold",
  "networkName": "Blue Choice PPO Network",
  "referralRequired": false,
  "sbc": {
    "baby":     { "deductible": 0,    "copay": 2700, "coinsurance": 0 },
    "diabetes": { "deductible": 500,  "copay": 600 },
    "fracture": { "deductible": 500,  "copay": 1400 }
  }
}
```

---

### Geo

#### `GET /api/geo/zip/60616`
Resolve a ZIP code to geographic coordinates and county info.

**How it works:** Averages the lat/lng of all clinics in that ZIP code to find the centroid. No external API — everything comes from the clinic database.

**Limitation:** Only works for ZIP codes that have at least one HRSA clinic. (~4,000 unique ZIPs in the DB)

**Response:**
```json
{
  "zip": "60616",
  "lat": 41.8469,
  "lng": -87.6254,
  "city": "Chicago",
  "state": "IL",
  "county": "Cook County",
  "countyFips": "17031"
}
```

---

### Other

#### `GET /api/health`
Server health check. Returns `{ "status": "ok" }`.

#### `GET /api/docs`
Swagger UI — interactive documentation for all endpoints.

---

## 11. Project File Structure

```
coverfind/
│
├── DATABASE.md              ← How to rebuild the SQLite database
├── CARECULATOR.md           ← This file
├── project_idea.md          ← Original product vision notes
│
├── database/                ← Raw CSV exports (NOT committed to git — too large)
│   ├── clinics.csv          (9,323 rows)
│   ├── insurance_plans.csv  (7,349 rows)
│   ├── networks.csv         (1,759 rows)
│   ├── service_areas.csv    (54,205 rows)
│   └── rates.csv            (3,467,016 rows)
│
├── models/
│   └── pre-processing.ipynb ← Jupyter notebook that generated synthetic scores
│
├── backend/
│   ├── index.js             ← Express app entry point (port 3001)
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── index.js     ← DB_PATH, page size constants
│       │
│       ├── data/
│       │   └── careculator.db ← The SQLite database (~264 MB, not in git)
│       │
│       ├── models/          ← SQL queries only
│       │   ├── clinic.model.js      ← queryClinics, getClinicById
│       │   ├── provider.model.js    ← listPlans, getPlanById, getRatesForPlan
│       │   └── insurance.model.js   ← getTierSummary, getAvailableStates
│       │
│       ├── services/        ← Business logic
│       │   ├── dataLayer.service.js    ← Shared SQLite singleton (getDb)
│       │   ├── clinicCatalog.service.js ← Search pipeline, scoring, pagination
│       │   └── insurance.service.js    ← 404 guards, pagination envelopes
│       │
│       ├── controllers/     ← HTTP layer (parse params, log, send response)
│       │   ├── clinics.controller.js
│       │   ├── insurance.controller.js
│       │   └── geo.controller.js
│       │
│       ├── routes/          ← Express route registration
│       │   ├── clinics.routes.js
│       │   ├── insurance.routes.js
│       │   └── geo.routes.js
│       │
│       ├── middleware/
│       │   └── errorHandler.js   ← asyncHandler wrapper + global error handler
│       │
│       ├── utils/
│       │   ├── haversine.js  ← Great-circle distance formula
│       │   └── logger.js     ← Colored console logger (chalk)
│       │
│       └── scripts/
│           ├── build_database.py        ← Builds careculator.db from CSVs
│           └── migrate_coverage_tier.py ← One-time migration script
│
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx            ← Router setup
        ├── main.tsx           ← React entry point
        │
        ├── lib/
        │   └── api.ts         ← All backend API calls live here
        │
        ├── pages/
        │   ├── HomePage.tsx      ← Search form
        │   ├── ResultsPage.tsx   ← Ranked clinic list + filters
        │   ├── ComparePage.tsx   ← Side-by-side comparison
        │   └── SummaryPage.tsx   ← Card grid overview
        │
        └── components/
            ├── Navbar.tsx
            ├── StatusBadge.tsx   ← Colored badges (Fast/Slow/Low/High/etc.)
            ├── SpaceBackground.tsx
            ├── ClinicCard.tsx
            ├── ResultsList.tsx
            ├── MapView.tsx
            └── SearchForm.tsx
```

---

## 12. How To Run It

### Prerequisites

- Node.js 18+
- Python 3.8+ (only needed to rebuild the database)
- The CSV files in `database/` folder

### Step 1 — Build the database (first time only)

```bash
# From repo root
python3 backend/src/scripts/build_database.py

# This reads the 5 CSV files and writes backend/src/data/careculator.db
# Takes about 60–90 seconds (3.4M rate rows to insert)
```

### Step 2 — Start the backend

```bash
cd backend
npm install        # first time only
npm run dev        # starts on http://localhost:3001
```

You should see:
```
  ╔══════════════════════════════════════╗
  ║        Careculator Backend           ║
  ╚══════════════════════════════════════╝

  Server running at http://localhost:3001
  API docs at     http://localhost:3001/api/docs
```

### Step 3 — Start the frontend

```bash
cd frontend
npm install        # first time only
npm run dev        # starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

### Quick API test

```bash
# Health check
curl http://localhost:3001/api/health

# Search for dental clinics near Chicago
curl "http://localhost:3001/api/clinics/search?q=dental&lat=41.88&lng=-87.62&maxDistanceMi=20&limit=3"

# ZIP code lookup
curl http://localhost:3001/api/geo/zip/60616

# Insurance tiers in Illinois
curl "http://localhost:3001/api/insurance/tiers?state=IL"

# Plans that cover a specific clinic's county
curl "http://localhost:3001/api/insurance/by-clinic/hrsa-H80CS00726-7?limit=5"
```

---

## 13. Key Design Decisions

### Why SQLite instead of PostgreSQL / MongoDB?

The data is entirely read-only at runtime — no user accounts, no writes, nothing gets saved. SQLite is a single file, has zero configuration, and `better-sqlite3` is synchronous (no callback hell). For 9k clinics and 7k plans with a read-only workload, SQLite is both simpler and faster than running a separate database server.

### Why push keyword filtering to SQL instead of JavaScript?

The original code loaded all 9,323 clinic rows into JavaScript memory on every search request, then filtered them with `.filter()`. This was wasteful. SQLite's `LIKE` queries with indexed columns are faster and use no extra memory. The refactored version does: SQL filter → JavaScript distance calc → JavaScript sort.

### Why no external geocoding API?

`zippopotam.us` was the original geocoding API. It has rate limits, requires internet access, and adds external dependency. Since we already have ZIP codes and lat/lng for every clinic in our database, we can compute ZIP centroids ourselves. The trade-off: only ZIPs that have HRSA clinics work. But since our target users are looking for HRSA clinics, this is a reasonable limitation.

### Why is the insurance `list` endpoint paginated but clinics is not (in the frontend)?

Insurance has 7,349 plans — impossible to send all at once. Clinics has 9,323 entries but the search filters (keyword + distance) typically bring that down to 50–200 results. The backend paginates both, but the frontend currently doesn't use pagination for clinics — it gets up to 200 results and does the rest client-side. This is intentional: clinic search is interactive and the user expects to scroll.

### Why is `priorityWeight` 0–100 instead of 0.0–1.0?

URL query parameters are strings. Keeping it as an integer avoids float parsing edge cases and is more intuitive for the slider (which is a 0–100 range element in HTML).

### Why are treatment burden scores synthetic?

HRSA doesn't publish patient outcome data. The scores were generated during the preprocessing phase using a model that considers the type of specialties offered, the clinic's service area, and statistical patterns. They are plausible estimates, not verified clinical data. The app is a decision-support tool, not a medical reference.
