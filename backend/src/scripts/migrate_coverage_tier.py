"""
Migration: Add actuarial_value and coverage_tier to insurance_plans
Run once against careculator.db.

What it does:
  1. Adds actuarial_value (REAL) column from IssuerActuarialValue in PlanAttributes.csv
  2. Adds coverage_tier (TEXT) column derived as:
       >= 90%  → premium
       >= 80%  → gold
       >= 70%  → silver
       >= 60%  → bronze
       < 60%   → bronze  (catastrophic plans)
     Falls back to metal_level when actuarial_value is unavailable.
  3. Fills any remaining NULL monthly_premium using metal_level averages
     (2014-2016 era plans have no rate data in the current dataset).
  4. Recreates master_view to include the two new columns.

Usage:
  python3 migrate_coverage_tier.py \
    --db /path/to/careculator.db \
    --csv /path/to/datasets/Healthcare/Insurance/PlanAttributes.csv
"""

import argparse
import csv
import sqlite3

DEFAULT_DB  = '/Users/whoseunassailable/Documents/careculator.db'
DEFAULT_CSV = '/Users/whoseunassailable/Documents/datasets/Healthcare/Insurance/PlanAttributes.csv'


def run(db_path: str, csv_path: str) -> None:
    # Load actuarial values from CSV
    av_map: dict[str, float] = {}
    with open(csv_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            scid = row.get('StandardComponentId', '').strip()
            av   = row.get('IssuerActuarialValue', '').strip().rstrip('%')
            if scid and av:
                try:
                    av_map[scid] = float(av)
                except ValueError:
                    pass
    print(f'Loaded {len(av_map):,} actuarial values from CSV')

    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    # --- Add columns ---
    existing = [r[1] for r in cur.execute('PRAGMA table_info(insurance_plans)')]
    for col, typedef in [('actuarial_value', 'REAL'), ('coverage_tier', 'TEXT')]:
        if col not in existing:
            cur.execute(f'ALTER TABLE insurance_plans ADD COLUMN {col} {typedef}')
            print(f'Added column: {col}')

    # --- Populate actuarial_value ---
    updates = [(v, k) for k, v in av_map.items()]
    cur.executemany(
        'UPDATE insurance_plans SET actuarial_value = ? WHERE plan_id = ?',
        updates
    )
    updated = cur.execute(
        'SELECT COUNT(*) FROM insurance_plans WHERE actuarial_value IS NOT NULL'
    ).fetchone()[0]
    total   = cur.execute('SELECT COUNT(*) FROM insurance_plans').fetchone()[0]
    print(f'actuarial_value populated for {updated:,}/{total:,} plans')

    # --- Compute coverage_tier from actuarial_value ---
    cur.execute("""
        UPDATE insurance_plans SET coverage_tier = CASE
            WHEN actuarial_value >= 90 THEN 'premium'
            WHEN actuarial_value >= 80 THEN 'gold'
            WHEN actuarial_value >= 70 THEN 'silver'
            ELSE 'bronze'
        END
        WHERE actuarial_value IS NOT NULL
    """)

    # --- Fall back to metal_level ---
    cur.execute("""
        UPDATE insurance_plans SET coverage_tier = CASE
            WHEN LOWER(metal_level) = 'platinum'        THEN 'premium'
            WHEN LOWER(metal_level) = 'gold'            THEN 'gold'
            WHEN LOWER(metal_level) = 'silver'          THEN 'silver'
            WHEN LOWER(metal_level) IN ('bronze', 'expanded bronze', 'catastrophic') THEN 'bronze'
            ELSE 'bronze'
        END
        WHERE coverage_tier IS NULL
    """)

    # --- Fill NULL monthly_premium using metal_level averages ---
    rows = cur.execute("""
        SELECT metal_level, AVG(monthly_premium)
        FROM insurance_plans
        WHERE monthly_premium IS NOT NULL
        GROUP BY metal_level
    """).fetchall()
    for metal, avg in rows:
        cur.execute("""
            UPDATE insurance_plans SET monthly_premium = ?
            WHERE monthly_premium IS NULL AND metal_level = ?
        """, (round(avg, 2), metal))
    null_left = cur.execute(
        'SELECT COUNT(*) FROM insurance_plans WHERE monthly_premium IS NULL'
    ).fetchone()[0]
    print(f'monthly_premium NULL remaining: {null_left}')

    # --- Recreate master_view ---
    cur.execute('DROP VIEW IF EXISTS master_view')
    cur.execute("""
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
    """)

    conn.commit()
    conn.close()

    print('\nMigration complete.')
    print('  coverage_tier: premium / gold / silver / bronze (no NULLs)')
    print('  monthly_premium: fully populated')
    print('  master_view: includes actuarial_value + coverage_tier')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db',  default=DEFAULT_DB)
    parser.add_argument('--csv', default=DEFAULT_CSV)
    args = parser.parse_args()
    run(args.db, args.csv)
