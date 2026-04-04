"""
build_database.py — Create careculator.db from clean CSV exports.

Prerequisites
-------------
  pip install tqdm   (optional — for progress bars; falls back silently)

Usage
-----
  python3 build_database.py                         # uses default paths
  python3 build_database.py --csv /path/to/csvs --out /path/to/careculator.db

Default CSV source : /Users/whoseunassailable/Documents/database/
Default DB output  : <repo>/backend/data/careculator.db

CSV files required (all exported from the cleaned DB)
------------------------------------------------------
  clinics.csv          — 9,323 HRSA FQHCs with computed scores
  insurance_plans.csv  — 7,349 CMS marketplace plans
  networks.csv         — 1,759 insurer networks
  service_areas.csv    — 54,205 county-level coverage rows
  rates.csv            — 3.4 M age-banded premium rates

The script is idempotent: re-running it drops and recreates the DB.
"""

import argparse
import csv
import os
import sqlite3
import sys

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CSV_DIR = '/Users/whoseunassailable/Documents/database'
DEFAULT_DB_OUT  = os.path.normpath(os.path.join(SCRIPT_DIR, '../../../data/careculator.db'))


# ---------------------------------------------------------------------------
# Table DDL
# ---------------------------------------------------------------------------
TABLES = {
    'clinics': """
        CREATE TABLE clinics (
            id                TEXT PRIMARY KEY,
            name              TEXT,
            org_name          TEXT,
            center_type       TEXT,
            address           TEXT,
            city              TEXT,
            state             TEXT,
            zip               TEXT,
            phone             TEXT,
            website           TEXT,
            npi               TEXT,
            lat               REAL,
            lng               REAL,
            county            TEXT,
            county_fips       TEXT,
            operating_hours   TEXT,
            location_setting  TEXT,
            specialties       TEXT,
            keywords          TEXT,
            avg_visits        REAL,
            recovery_speed    TEXT,
            recovery_days     INTEGER,
            outcome_quality   TEXT,
            treatment_burden  TEXT,
            burden_score      REAL,
            total_cost_est    REAL,
            per_visit_cost    REAL,
            per_visit_tier    TEXT,
            patient_summary   TEXT,
            highlight_tags    TEXT,
            recovery_score    REAL,
            cost_score        REAL,
            badges            TEXT
        )
    """,

    'insurance_plans': """
        CREATE TABLE insurance_plans (
            plan_id                 TEXT PRIMARY KEY,
            plan_name               TEXT,
            issuer_id               INTEGER,
            issuer_name             TEXT,
            plan_type               TEXT,
            metal_level             TEXT,
            deductible              REAL,
            oop_max                 REAL,
            coinsurance_pct         REAL,
            monthly_premium         REAL,
            network_id              TEXT,
            service_area_id         TEXT,
            state                   TEXT,
            year                    INTEGER,
            referral_required       INTEGER,
            sbc_baby_deductible     REAL,
            sbc_baby_copay          REAL,
            sbc_baby_coinsurance    REAL,
            sbc_diabetes_deductible REAL,
            sbc_diabetes_copay      REAL,
            sbc_fracture_deductible REAL,
            sbc_fracture_copay      REAL,
            actuarial_value         REAL,
            coverage_tier           TEXT
        )
    """,

    'networks': """
        CREATE TABLE networks (
            network_id   TEXT,
            issuer_id    INTEGER,
            state        TEXT,
            network_name TEXT,
            network_url  TEXT,
            PRIMARY KEY (network_id, issuer_id)
        )
    """,

    'service_areas': """
        CREATE TABLE service_areas (
            service_area_id      TEXT,
            issuer_id            INTEGER,
            state                TEXT,
            county_fips          TEXT,
            covers_entire_state  INTEGER,
            service_area_name    TEXT
        )
    """,

    'rates': """
        CREATE TABLE rates (
            plan_id         TEXT,
            rating_area     TEXT,
            age             TEXT,
            monthly_premium REAL
        )
    """,
}

INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_clinics_state       ON clinics(state)',
    'CREATE INDEX IF NOT EXISTS idx_clinics_county_fips ON clinics(county_fips)',
    'CREATE INDEX IF NOT EXISTS idx_plans_sa_issuer     ON insurance_plans(service_area_id, issuer_id)',
    'CREATE INDEX IF NOT EXISTS idx_sa_county_fips      ON service_areas(county_fips)',
    'CREATE INDEX IF NOT EXISTS idx_sa_sa_issuer        ON service_areas(service_area_id, issuer_id)',
    'CREATE INDEX IF NOT EXISTS idx_networks_issuer     ON networks(issuer_id)',
    'CREATE INDEX IF NOT EXISTS idx_rates_plan          ON rates(plan_id)',
]

MASTER_VIEW = """
    CREATE VIEW master_view AS
    SELECT
      c.id AS provider_id, c.name AS site_name, c.org_name,
      c.city, c.state AS clinic_state, c.zip, c.lat, c.lng,
      c.county, c.county_fips,
      c.specialties, c.avg_visits, c.recovery_days, c.outcome_quality,
      c.burden_score, c.treatment_burden, c.recovery_score, c.cost_score,
      c.per_visit_cost, c.total_cost_est, c.patient_summary,
      c.phone, c.website, c.address,
      p.plan_id, p.plan_name, p.plan_type, p.metal_level,
      p.monthly_premium, p.deductible, p.oop_max, p.coinsurance_pct,
      p.actuarial_value, p.coverage_tier,
      p.issuer_name, p.referral_required,
      p.sbc_baby_deductible, p.sbc_baby_copay,
      p.sbc_diabetes_deductible, p.sbc_diabetes_copay,
      p.sbc_fracture_deductible, p.sbc_fracture_copay,
      n.network_name, n.network_url
    FROM clinics c
    LEFT JOIN service_areas sa ON c.county_fips = sa.county_fips
    LEFT JOIN insurance_plans p
        ON sa.service_area_id = p.service_area_id
       AND sa.issuer_id       = p.issuer_id
    LEFT JOIN networks n
        ON p.network_id = n.network_id
       AND p.issuer_id  = n.issuer_id
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def coerce(val: str):
    """Return None for empty strings; try int then float, else return str."""
    if val == '':
        return None
    try:
        return int(val)
    except ValueError:
        pass
    try:
        return float(val)
    except ValueError:
        pass
    return val


def load_csv(path: str, table: str, cur: sqlite3.Cursor) -> int:
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        placeholders = ', '.join('?' * len(headers))
        sql = f'INSERT INTO {table} VALUES ({placeholders})'

        rows = list(reader)
        if HAS_TQDM:
            rows = tqdm(rows, desc=f'  {table}', unit='rows', leave=False)

        count = 0
        batch = []
        for row in rows:
            batch.append([coerce(v) for v in row])
            if len(batch) >= 10_000:
                cur.executemany(sql, batch)
                count += len(batch)
                batch = []
        if batch:
            cur.executemany(sql, batch)
            count += len(batch)
    return count


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def build(csv_dir: str, db_out: str) -> None:
    print(f'CSV source : {csv_dir}')
    print(f'DB output  : {db_out}')
    print()

    # Verify all CSVs are present before touching the DB
    missing = [t for t in TABLES if not os.path.exists(os.path.join(csv_dir, f'{t}.csv'))]
    if missing:
        print(f'ERROR: missing CSV files: {missing}')
        sys.exit(1)

    # (Re)create the database
    if os.path.exists(db_out):
        os.remove(db_out)
        print('Removed existing database.')

    conn = sqlite3.connect(db_out)
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous  = NORMAL')
    cur = conn.cursor()

    # Create tables
    for name, ddl in TABLES.items():
        cur.execute(ddl)
    conn.commit()
    print('Tables created.')

    # Load CSVs
    order = ['clinics', 'insurance_plans', 'networks', 'service_areas', 'rates']
    for table in order:
        path = os.path.join(csv_dir, f'{table}.csv')
        print(f'Loading {table}...')
        n = load_csv(path, table, cur)
        conn.commit()
        print(f'  {n:,} rows inserted.')

    # Indexes
    print('Building indexes...')
    for idx in INDEXES:
        cur.execute(idx)
    conn.commit()

    # master_view
    cur.execute(MASTER_VIEW)
    conn.commit()
    print('master_view created.')

    # Summary
    print()
    print('=== Build complete ===')
    for t in order:
        n = cur.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        print(f'  {t:<20} {n:>10,} rows')
    size_mb = os.path.getsize(db_out) / 1024 / 1024
    print(f'\nDatabase size: {size_mb:.0f} MB  →  {db_out}')
    conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build careculator.db from clean CSV exports.')
    parser.add_argument('--csv', default=DEFAULT_CSV_DIR, help='Directory containing the 5 CSV files')
    parser.add_argument('--out', default=DEFAULT_DB_OUT,  help='Output path for careculator.db')
    args = parser.parse_args()
    build(args.csv, args.out)
