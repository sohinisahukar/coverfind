# Database — careculator.db

`careculator.db` is a SQLite database (~280 MB) that powers the backend API.
It is **not committed to git** because of its size. This document explains how
to recreate it from the clean CSV exports.

---

## Quick Start

```bash
# From the repo root
python3 backend/src/scripts/build_database.py
```

That's it. The script reads the 5 CSV files, creates all tables + indexes, and
writes `backend/data/careculator.db`.

---

## Prerequisites

- Python 3.8+
- The 5 CSV files in `/Users/whoseunassailable/Documents/database/` (see below)
- `tqdm` for progress bars (optional): `pip install tqdm`

---

## Where the CSV Files Come From

The CSVs are clean exports of the database tables — already preprocessed,
scored, and enriched. They live at:

```
/Users/whoseunassailable/Documents/database/
  clinics.csv          (  9,323 rows,  ~16 MB)
  insurance_plans.csv  (  7,349 rows,  ~1 MB)
  networks.csv         (  1,759 rows,  ~0.2 MB)
  service_areas.csv    ( 54,205 rows,  ~2 MB)
  rates.csv            (3,467,016 rows, ~133 MB)
```

They were exported once from the original database build. You do not need the
raw government datasets to recreate the database — only these CSVs.

---

## What the Database Contains

### `clinics` — 9,323 rows
HRSA Federally Qualified Health Centers (FQHCs) across the US.

| Column | Type | Description |
|---|---|---|
| `id` | TEXT | Primary key (`hrsa-<id>-<seq>`) |
| `name` | TEXT | Site name |
| `org_name` | TEXT | Organisation name |
| `address`, `city`, `state`, `zip` | TEXT | Location |
| `lat`, `lng` | REAL | Coordinates |
| `county`, `county_fips` | TEXT | County for insurance join |
| `specialties` | TEXT (JSON array) | e.g. `["Primary Care","Dental"]` |
| `keywords` | TEXT (JSON array) | Search terms |
| `avg_visits` | REAL | Avg visits needed for recovery |
| `recovery_speed` | TEXT | `fast` / `moderate` / `slow` |
| `recovery_days` | INTEGER | Estimated recovery days |
| `outcome_quality` | TEXT | `high` / `moderate` / `low` |
| `treatment_burden` | TEXT | `low` / `moderate` / `high` |
| `total_cost_est` | REAL | Estimated total treatment cost ($) |
| `per_visit_cost` | REAL | Per-visit cost ($) |
| `per_visit_tier` | TEXT | `low` / `medium` / `high` |
| `recovery_score` | REAL | 0–1, higher = better recovery |
| `cost_score` | REAL | 0–1, higher = lower cost |
| `patient_summary` | TEXT | One-sentence patient-facing description |
| `highlight_tags` | TEXT (JSON array) | Why this clinic is recommended |
| `badges` | TEXT (JSON object) | `{bestValue, topRecommendation, highVisits, newInsurance}` |

> **Note:** `avg_visits`, `recovery_speed`, `outcome_quality`, `treatment_burden`,
> `recovery_score`, and `cost_score` are **synthetic scores** computed during the
> original database build. They are not from a government dataset.

---

### `insurance_plans` — 7,349 rows
CMS ACA marketplace plans (2014–2016).

| Column | Type | Description |
|---|---|---|
| `plan_id` | TEXT | Primary key (CMS `StandardComponentId`) |
| `plan_name` | TEXT | Plan name |
| `issuer_id` | INTEGER | Insurer ID |
| `issuer_name` | TEXT | Insurer name |
| `plan_type` | TEXT | HMO / PPO / EPO / POS |
| `metal_level` | TEXT | Bronze / Silver / Gold / Platinum |
| `deductible` | REAL | Annual deductible ($) |
| `oop_max` | REAL | Annual out-of-pocket maximum ($) |
| `coinsurance_pct` | REAL | % patient pays after deductible |
| `monthly_premium` | REAL | Monthly premium for a 40-year-old ($) |
| `actuarial_value` | REAL | Official CMS actuarial value (%) — real data from `IssuerActuarialValue` |
| `coverage_tier` | TEXT | Derived: `premium` (≥90%) / `gold` (≥80%) / `silver` (≥70%) / `bronze` (<70%) |
| `network_id`, `service_area_id` | TEXT | Join keys |
| `state`, `year` | TEXT/INT | Plan state and year |
| `referral_required` | INTEGER | 1 = referral needed |
| `sbc_*` | REAL | Standard Benefit Cost sharing samples (baby, diabetes, fracture) |

---

### `networks` — 1,759 rows
Insurer provider network metadata.

| Column | Type | Description |
|---|---|---|
| `network_id` | TEXT | Network ID |
| `issuer_id` | INTEGER | Insurer ID |
| `state` | TEXT | State |
| `network_name` | TEXT | Network name |
| `network_url` | TEXT | URL for network details |

---

### `service_areas` — 54,205 rows
Maps insurers to the counties they cover.

| Column | Type | Description |
|---|---|---|
| `service_area_id` | TEXT | Service area ID |
| `issuer_id` | INTEGER | Insurer ID |
| `state` | TEXT | State |
| `county_fips` | TEXT | 5-digit FIPS code (join to `clinics.county_fips`) |
| `covers_entire_state` | INTEGER | 1 = covers whole state |
| `service_area_name` | TEXT | Human-readable area name |

---

### `rates` — 3,467,016 rows
Age-banded monthly premium rates per plan and rating area.

| Column | Type | Description |
|---|---|---|
| `plan_id` | TEXT | Foreign key to `insurance_plans` |
| `rating_area` | TEXT | CMS rating area (e.g. `Rating Area 1`) |
| `age` | TEXT | Age band (e.g. `40`, `0-20`, `Family Option`) |
| `monthly_premium` | REAL | Premium for this age/area ($) |

---

### `master_view` — ~1 M rows (view)
Pre-joined view of clinics × insurance plans via county FIPS.

```sql
clinics
  LEFT JOIN service_areas  ON clinics.county_fips = service_areas.county_fips
  LEFT JOIN insurance_plans ON service_areas.{service_area_id, issuer_id}
  LEFT JOIN networks        ON insurance_plans.{network_id, issuer_id}
```

---

## Table Relationships

```
clinics.county_fips
    └── service_areas.county_fips
            └── (service_area_id + issuer_id)
                    └── insurance_plans.service_area_id + issuer_id
                                └── networks.network_id + issuer_id

insurance_plans.plan_id
    └── rates.plan_id
```

---

## Build Script Options

```
python3 backend/src/scripts/build_database.py [options]

Options:
  --csv  PATH   Directory containing the 5 CSV files
                Default: /Users/whoseunassailable/Documents/database

  --out  PATH   Output path for careculator.db
                Default: backend/data/careculator.db
```

---

## Data Sources

| Data | Source |
|---|---|
| Clinic locations & names | [HRSA Health Center Sites](https://data.hrsa.gov/data/download) — `Health_Center_Service_Delivery_and_LookAlike_Sites.xlsx` |
| Insurance plans, networks, service areas | [CMS Health Insurance Marketplace](https://www.cms.gov/cciio/resources/data-resources/marketplace-puf) — `PlanAttributes.csv`, `Network.csv`, `ServiceArea.csv` |
| Premium rates | CMS Marketplace — `Rate.csv` |
| Actuarial values | CMS `PlanAttributes.csv` — `IssuerActuarialValue` column |
