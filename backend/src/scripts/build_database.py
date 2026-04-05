"""
build_database.py — Create careculator.db from raw government data OR clean CSV exports.

Modes
-----
  raw   (default) — reads HRSA XLSX + CMS CSVs, generates synthetic clinic scores
  legacy          — reads 5 pre-processed CSVs (old behaviour)

Usage
-----
  # Raw mode  (HRSA XLSX + CMS CSVs)
  python3 build_database.py --xlsx path/to/HRSA.xlsx --cms path/to/cms_csvs/

  # Legacy mode (pre-processed CSVs)
  python3 build_database.py --mode legacy --csv path/to/csvs/

  # Common options
  python3 build_database.py --out path/to/careculator.db

Raw-mode inputs
---------------
  --xlsx  HRSA Health Center Sites XLSX
          (Health_Center_Service_Delivery_and_LookAlike_Sites.xlsx)
  --cms   Directory with CMS Marketplace CSVs:
            PlanAttributes.csv, Network.csv, ServiceArea.csv, Rate.csv

Legacy-mode inputs
------------------
  --csv   Directory with 5 pre-scored CSVs:
            clinics.csv, insurance_plans.csv, networks.csv, service_areas.csv, rates.csv
"""

import argparse
import csv
import hashlib
import json
import math
import os
import random
import sqlite3
import sys

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CSV_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '../../../database'))
DEFAULT_DB_OUT  = os.path.normpath(os.path.join(SCRIPT_DIR, '../../data/careculator.db'))

# ---------------------------------------------------------------------------
# Table DDL  (shared by both modes)
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
    'CREATE INDEX IF NOT EXISTS idx_clinics_zip         ON clinics(zip)',
    'CREATE INDEX IF NOT EXISTS idx_plans_sa_issuer     ON insurance_plans(service_area_id, issuer_id)',
    'CREATE INDEX IF NOT EXISTS idx_plans_state         ON insurance_plans(state)',
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


def progress(iterable, **kwargs):
    """Wrap iterable with tqdm if available."""
    if HAS_TQDM:
        return tqdm(iterable, **kwargs)
    return iterable


def _seed_for(text: str) -> int:
    """Deterministic seed from a string so scores are reproducible."""
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


# ---------------------------------------------------------------------------
# Synthetic score generation
# ---------------------------------------------------------------------------

# State-level cost-of-living multipliers (rough buckets)
_HIGH_COST_STATES = {'CA', 'NY', 'MA', 'CT', 'NJ', 'HI', 'DC', 'WA', 'MD', 'CO'}
_LOW_COST_STATES  = {'MS', 'AR', 'WV', 'AL', 'KY', 'OK', 'NM', 'LA', 'SC', 'ID'}

SPECIALTY_MAP = {
    'Primary Care':       ['primary care', 'general', 'family', 'internal medicine', 'adult'],
    'Dental':             ['dental', 'oral', 'teeth'],
    'Behavioral Health':  ['behavioral', 'mental', 'psychiatr', 'psycholog', 'counsel', 'substance'],
    'Pediatrics':         ['pediatr', 'child', 'infant'],
    "Women's Health":     ['women', 'obgyn', 'ob-gyn', 'prenatal', 'maternal', 'family planning'],
    'Urgent Care':        ['urgent', 'emergency', 'walk-in'],
    'Pharmacy':           ['pharmacy', 'rx', 'prescription'],
    'Vision':             ['vision', 'eye', 'optom', 'ophthalm'],
}


def _infer_specialties(site_name: str, center_type: str) -> list:
    """Infer specialties from site name and center type."""
    text = f"{site_name} {center_type}".lower()
    found = []
    for spec, keywords in SPECIALTY_MAP.items():
        if any(kw in text for kw in keywords):
            found.append(spec)
    if not found:
        found.append('Primary Care')
    return found


def _generate_keywords(specialties: list, name: str, city: str) -> list:
    """Generate search keywords from specialties, name, and city."""
    kw = set()
    for s in specialties:
        kw.add(s.lower())
        for word in s.lower().split():
            if len(word) > 3:
                kw.add(word)
    for word in name.lower().split():
        if len(word) > 3 and word not in {'health', 'center', 'clinic', 'medical'}:
            kw.add(word)
    if city:
        kw.add(city.lower())
    return sorted(kw)


def _cost_multiplier(state: str) -> float:
    """State-based cost multiplier."""
    if state in _HIGH_COST_STATES:
        return 1.3
    if state in _LOW_COST_STATES:
        return 0.75
    return 1.0


def generate_clinic_scores(clinic_id: str, specialties: list, state: str):
    """
    Generate synthetic clinical scores for a clinic.
    Uses a deterministic seed from the clinic ID so results are reproducible.
    """
    rng = random.Random(_seed_for(clinic_id))
    mult = _cost_multiplier(state or '')

    # Core metrics
    avg_visits = rng.randint(3, 12)
    per_visit_cost = round(rng.uniform(40, 250) * mult, 2)
    total_cost_est = round(avg_visits * per_visit_cost * rng.uniform(0.85, 1.15), 2)

    # Recovery
    if avg_visits <= 4:
        recovery_speed = 'fast'
        recovery_days = rng.randint(7, 30)
    elif avg_visits <= 7:
        recovery_speed = 'moderate'
        recovery_days = rng.randint(21, 60)
    else:
        recovery_speed = 'slow'
        recovery_days = rng.randint(45, 120)

    # Outcome quality — weighted toward higher quality
    oq_roll = rng.random()
    if oq_roll < 0.45:
        outcome_quality = 'high'
    elif oq_roll < 0.80:
        outcome_quality = 'moderate'
    else:
        outcome_quality = 'low'

    # Treatment burden — composite of visits + cost
    burden_score = (avg_visits / 12.0) * 0.6 + (per_visit_cost / (250 * 1.3)) * 0.4
    burden_score = round(min(1.0, max(0.0, burden_score)), 3)
    if burden_score < 0.35:
        treatment_burden = 'low'
    elif burden_score < 0.65:
        treatment_burden = 'moderate'
    else:
        treatment_burden = 'high'

    # Per-visit tier
    if per_visit_cost < 80:
        per_visit_tier = 'low'
    elif per_visit_cost < 160:
        per_visit_tier = 'medium'
    else:
        per_visit_tier = 'high'

    # Normalized scores (0–1, higher = better)
    recovery_score = round(1.0 - (recovery_days / 120.0), 3)
    recovery_score = max(0.0, min(1.0, recovery_score))

    cost_score = round(1.0 - (total_cost_est / (12 * 250 * 1.3 * 1.15)), 3)
    cost_score = max(0.0, min(1.0, cost_score))

    # Patient summary
    spec_str = specialties[0] if specialties else 'Primary Care'
    summaries = [
        f"Offers {spec_str.lower()} with {recovery_speed} recovery and {treatment_burden} treatment burden.",
        f"Patients typically need {avg_visits} visits. {outcome_quality.capitalize()} outcome quality reported.",
        f"A {treatment_burden}-burden option for {spec_str.lower()} — average {avg_visits} visits to recovery.",
    ]
    patient_summary = summaries[rng.randint(0, len(summaries) - 1)]

    # Highlight tags
    tags = []
    if outcome_quality == 'high':
        tags.append('High outcome quality')
    if recovery_speed == 'fast':
        tags.append('Fast recovery')
    if treatment_burden == 'low':
        tags.append('Low treatment burden')
    if per_visit_tier == 'low':
        tags.append('Affordable per-visit cost')
    if avg_visits <= 4:
        tags.append('Few visits needed')
    if not tags:
        tags.append(f'{outcome_quality.capitalize()} outcomes')

    # Badges — will be refined after all clinics are scored
    badges = {
        'bestValue': cost_score > 0.7 and treatment_burden != 'high',
        'topRecommendation': recovery_score > 0.7 and outcome_quality == 'high',
        'highVisits': avg_visits >= 10,
        'newInsurance': False,
    }

    return {
        'avg_visits': avg_visits,
        'recovery_speed': recovery_speed,
        'recovery_days': recovery_days,
        'outcome_quality': outcome_quality,
        'treatment_burden': treatment_burden,
        'burden_score': burden_score,
        'total_cost_est': total_cost_est,
        'per_visit_cost': per_visit_cost,
        'per_visit_tier': per_visit_tier,
        'patient_summary': patient_summary,
        'highlight_tags': json.dumps(tags),
        'recovery_score': recovery_score,
        'cost_score': cost_score,
        'badges': json.dumps(badges),
    }


# ---------------------------------------------------------------------------
# HRSA XLSX → clinics rows
# ---------------------------------------------------------------------------

# Known column names in the HRSA XLSX (may vary slightly by year)
HRSA_COL_MAP = {
    'Health Center Site Name':        'name',
    'Site Name':                      'name',
    'Health Center Name':             'org_name',
    'Organization Name':              'org_name',
    'Site Address':                   'address',
    'Address':                        'address',
    'Site City':                      'city',
    'City':                           'city',
    'Site State Abbreviation':        'state',
    'State':                          'state',
    'Site Postal Code':               'zip',
    'Zip Code':                       'zip',
    'Site Telephone Number':          'phone',
    'Telephone Number':               'phone',
    'Health Center Site Web Address':  'website',
    'Web Address':                    'website',
    'Site Latitude':                  'lat',
    'Geocoding Artifact Address Latitude': 'lat',
    'Latitude':                       'lat',
    'Site Longitude':                 'lng',
    'Geocoding Artifact Address Longitude': 'lng',
    'Longitude':                      'lng',
    'Health Center Type':             'center_type',
    'Center Type':                    'center_type',
    'Setting Type':                   'location_setting',
    'Location Setting Description':   'location_setting',
    'Operating Hours Per Week':       'operating_hours',
    'NPI':                            'npi',
    'Site State FIPS Code':           'state_fips',
    'Site County FIPS Code':          'county_fips_partial',
    'FIPS Code':                      'county_fips',
    'County':                         'county',
    'Health Center Service Delivery Site Number': 'site_number',
    'BPHC Assigned Health Center Number':         'bphc_number',
}


def load_hrsa_xlsx(xlsx_path: str):
    """
    Read the HRSA Health Center Sites XLSX and yield clinic dicts
    mapped to the clinics table schema.
    """
    if not HAS_OPENPYXL:
        print('ERROR: openpyxl is required for XLSX mode. Install with: pip install openpyxl')
        sys.exit(1)

    print(f'Reading HRSA XLSX: {xlsx_path}')
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active

    rows_iter = ws.iter_rows(values_only=True)
    raw_headers = next(rows_iter)
    headers = [str(h).strip() if h else '' for h in raw_headers]

    # Map headers to our field names
    col_indices = {}
    for i, h in enumerate(headers):
        if h in HRSA_COL_MAP:
            field = HRSA_COL_MAP[h]
            if field not in col_indices:
                col_indices[field] = i

    print(f'  Mapped {len(col_indices)} columns from {len(headers)} headers')

    def _get(row, field, default=None):
        idx = col_indices.get(field)
        if idx is None or idx >= len(row):
            return default
        val = row[idx]
        return val if val is not None else default

    clinics = []
    seq = 0
    for row in progress(rows_iter, desc='  HRSA sites', unit='rows'):
        name = _get(row, 'name', '')
        if not name:
            continue

        state = str(_get(row, 'state', '') or '').strip().upper()
        lat = _get(row, 'lat')
        lng = _get(row, 'lng')

        # Build ID
        bphc = _get(row, 'bphc_number', '')
        site_num = _get(row, 'site_number', '')
        if bphc:
            clinic_id = f"hrsa-{bphc}-{site_num or seq}"
        else:
            clinic_id = f"hrsa-{seq}"
        seq += 1

        # County FIPS — may be full 5-digit or partial (needs state FIPS prefix)
        county_fips = _get(row, 'county_fips')
        if not county_fips:
            state_fips = _get(row, 'state_fips', '')
            partial = _get(row, 'county_fips_partial', '')
            if state_fips and partial:
                county_fips = f"{str(state_fips).zfill(2)}{str(partial).zfill(3)}"

        center_type = str(_get(row, 'center_type', '') or '')
        specialties = _infer_specialties(str(name), center_type)
        city = str(_get(row, 'city', '') or '')
        keywords = _generate_keywords(specialties, str(name), city)

        # Generate synthetic scores
        scores = generate_clinic_scores(clinic_id, specialties, state)

        clinic = {
            'id': clinic_id,
            'name': str(name).strip(),
            'org_name': str(_get(row, 'org_name', '') or '').strip(),
            'center_type': center_type,
            'address': str(_get(row, 'address', '') or '').strip(),
            'city': city,
            'state': state,
            'zip': str(_get(row, 'zip', '') or '').strip()[:10],
            'phone': str(_get(row, 'phone', '') or '').strip(),
            'website': str(_get(row, 'website', '') or '').strip(),
            'npi': str(_get(row, 'npi', '') or '').strip(),
            'lat': float(lat) if lat else None,
            'lng': float(lng) if lng else None,
            'county': str(_get(row, 'county', '') or '').strip(),
            'county_fips': str(county_fips).strip() if county_fips else None,
            'operating_hours': str(_get(row, 'operating_hours', '') or ''),
            'location_setting': str(_get(row, 'location_setting', '') or ''),
            'specialties': json.dumps(specialties),
            'keywords': json.dumps(keywords),
            **scores,
        }
        clinics.append(clinic)

    wb.close()
    print(f'  {len(clinics)} clinic(s) parsed from XLSX')
    return clinics


# ---------------------------------------------------------------------------
# CMS CSV loaders
# ---------------------------------------------------------------------------

def _read_csv_rows(path: str):
    """Yield dicts from a CSV file."""
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        yield from reader


def _safe_float(val, default=None):
    if val is None or val == '':
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val, default=None):
    if val is None or val == '':
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def _coverage_tier(actuarial_value):
    """Derive coverage tier from actuarial value."""
    if actuarial_value is None:
        return 'silver'
    av = float(actuarial_value)
    if av >= 0.90:
        return 'premium'
    if av >= 0.80:
        return 'gold'
    if av >= 0.70:
        return 'silver'
    return 'bronze'


# Known column names in CMS PlanAttributes.csv (varies by year)
PLAN_ATTR_COL_MAP = {
    'StandardComponentId':      'plan_id',
    'PlanId':                   'plan_id',
    'PlanMarketingName':        'plan_name',
    'IssuerId':                 'issuer_id',
    'IssuerMarketingName':      'issuer_name',
    'IssuerId2':                'issuer_id',
    'PlanType':                 'plan_type',
    'MetalLevel':               'metal_level',
    'TEHBDedInnTier1Individual':         'deductible',
    'TEHBInnTier1IndividualMOOP':        'oop_max',
    'IssuerActuarialValue':              'actuarial_value',
    'NetworkId':                         'network_id',
    'ServiceAreaId':                     'service_area_id',
    'StateCode':                         'state',
    'BusinessYear':                      'year',
    'IsSpecialistReferralRequired':      'referral_required',
    'SBCHavingaBabyDeductible':          'sbc_baby_deductible',
    'SBCHavingaBabyCopayment':           'sbc_baby_copay',
    'SBCHavingaBabyCoinsurance':         'sbc_baby_coinsurance',
    'SBCHavingDiabetesDeductible':       'sbc_diabetes_deductible',
    'SBCHavingDiabetesCopayment':        'sbc_diabetes_copay',
    'SBCHavingSimpleFractureDeductible': 'sbc_fracture_deductible',
    'SBCHavingSimpleFractureCopayment':  'sbc_fracture_copay',
}


def load_cms_plans(plan_csv: str):
    """Parse CMS PlanAttributes.csv into insurance_plans rows."""
    print(f'Reading CMS plans: {plan_csv}')
    plans = []
    for row in progress(_read_csv_rows(plan_csv), desc='  plans', unit='rows'):
        # Map columns flexibly
        def g(field):
            for cms_col, our_field in PLAN_ATTR_COL_MAP.items():
                if our_field == field and cms_col in row:
                    return row[cms_col]
            return None

        plan_id = g('plan_id')
        if not plan_id:
            continue

        av = _safe_float(g('actuarial_value'))
        # Actuarial value is often 0-1 in raw CMS data
        if av is not None and av > 1:
            av = av / 100.0

        deductible = _safe_float(g('deductible'))
        oop_max = _safe_float(g('oop_max'))

        # Estimate coinsurance from actuarial value if not directly available
        coinsurance_pct = None
        if av is not None:
            coinsurance_pct = round(1.0 - av, 4)

        # Monthly premium — not in PlanAttributes, will come from rates table
        # Use a placeholder based on metal level
        metal = g('metal_level') or ''
        premium_est = {'Bronze': 250, 'Silver': 350, 'Gold': 450, 'Platinum': 550}.get(metal, 300)

        ref_req = g('referral_required')
        referral = 1 if str(ref_req).lower() in ('yes', 'true', '1') else 0

        plans.append((
            plan_id,
            g('plan_name'),
            _safe_int(g('issuer_id')),
            g('issuer_name'),
            g('plan_type'),
            metal,
            deductible,
            oop_max,
            coinsurance_pct,
            premium_est,
            g('network_id'),
            g('service_area_id'),
            g('state'),
            _safe_int(g('year')),
            referral,
            _safe_float(g('sbc_baby_deductible')),
            _safe_float(g('sbc_baby_copay')),
            _safe_float(g('sbc_baby_coinsurance')),
            _safe_float(g('sbc_diabetes_deductible')),
            _safe_float(g('sbc_diabetes_copay')),
            _safe_float(g('sbc_fracture_deductible')),
            _safe_float(g('sbc_fracture_copay')),
            av,
            _coverage_tier(av),
        ))

    print(f'  {len(plans)} plan(s) parsed')
    return plans


def load_cms_networks(network_csv: str):
    """Parse CMS Network.csv."""
    print(f'Reading CMS networks: {network_csv}')
    networks = []
    seen = set()
    for row in progress(_read_csv_rows(network_csv), desc='  networks', unit='rows'):
        nid = row.get('NetworkId') or row.get('NetworkURL', '').split('/')[-1]
        iid = _safe_int(row.get('IssuerId'))
        if not nid or iid is None:
            continue
        key = (nid, iid)
        if key in seen:
            continue
        seen.add(key)
        networks.append((
            nid,
            iid,
            row.get('StateCode', ''),
            row.get('NetworkName', ''),
            row.get('NetworkURL', ''),
        ))
    print(f'  {len(networks)} network(s) parsed')
    return networks


def load_cms_service_areas(sa_csv: str):
    """Parse CMS ServiceArea.csv."""
    print(f'Reading CMS service areas: {sa_csv}')
    areas = []
    for row in progress(_read_csv_rows(sa_csv), desc='  service areas', unit='rows'):
        sa_id = row.get('ServiceAreaId')
        iid = _safe_int(row.get('IssuerId'))
        if not sa_id or iid is None:
            continue
        # CMS ServiceArea has one row per county or "entire state"
        covers_entire = 1 if str(row.get('CoverEntireState', '')).lower() in ('yes', 'true', '1') else 0
        county_fips = row.get('CountyCode') or row.get('CountyFIPS', '')

        areas.append((
            sa_id,
            iid,
            row.get('StateCode', ''),
            county_fips,
            covers_entire,
            row.get('ServiceAreaName', ''),
        ))
    print(f'  {len(areas)} service area row(s) parsed')
    return areas


def load_cms_rates(rate_csv: str):
    """Parse CMS Rate.csv."""
    print(f'Reading CMS rates: {rate_csv}')
    rates = []
    for row in progress(_read_csv_rows(rate_csv), desc='  rates', unit='rows'):
        plan_id = row.get('PlanId') or row.get('StandardComponentId', '')
        if not plan_id:
            continue
        age = row.get('Age') or row.get('BusinessYear', '')
        premium = _safe_float(row.get('IndividualRate') or row.get('IndividualTobaccoRate'))
        rating_area = row.get('RatingAreaId') or row.get('RatingArea', '')

        rates.append((plan_id, rating_area, age, premium))
    print(f'  {len(rates)} rate row(s) parsed')
    return rates


# ---------------------------------------------------------------------------
# Legacy CSV loader (original behaviour)
# ---------------------------------------------------------------------------

def load_csv(path: str, table: str, cur: sqlite3.Cursor) -> int:
    """Load a pre-processed CSV directly into a table."""
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
# DB creation
# ---------------------------------------------------------------------------

def create_db(db_out: str) -> sqlite3.Connection:
    """Create a fresh database with all tables."""
    if os.path.exists(db_out):
        os.remove(db_out)
        print('Removed existing database.')

    os.makedirs(os.path.dirname(db_out) or '.', exist_ok=True)
    conn = sqlite3.connect(db_out)
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous  = NORMAL')
    cur = conn.cursor()

    for name, ddl in TABLES.items():
        cur.execute(ddl)
    conn.commit()
    print('Tables created.')
    return conn


def insert_batch(cur, sql, rows, batch_size=10_000):
    """Insert rows in batches."""
    batch = []
    count = 0
    for row in rows:
        batch.append(row)
        if len(batch) >= batch_size:
            cur.executemany(sql, batch)
            count += len(batch)
            batch = []
    if batch:
        cur.executemany(sql, batch)
        count += len(batch)
    return count


def finalize_db(conn: sqlite3.Connection, db_out: str):
    """Create indexes, master view, and print summary."""
    cur = conn.cursor()

    print('Building indexes...')
    for idx in INDEXES:
        cur.execute(idx)
    conn.commit()

    cur.execute(MASTER_VIEW)
    conn.commit()
    print('master_view created.')

    print()
    print('=== Build complete ===')
    for t in TABLES:
        n = cur.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        print(f'  {t:<20} {n:>10,} rows')
    size_mb = os.path.getsize(db_out) / 1024 / 1024
    print(f'\nDatabase size: {size_mb:.1f} MB -> {db_out}')
    conn.close()


# ---------------------------------------------------------------------------
# Build: raw mode
# ---------------------------------------------------------------------------

def build_raw(xlsx_path: str, cms_dir: str, db_out: str):
    """Build from HRSA XLSX + CMS CSVs."""
    print(f'HRSA XLSX  : {xlsx_path}')
    print(f'CMS dir    : {cms_dir}')
    print(f'DB output  : {db_out}')
    print()

    # Validate inputs
    if not os.path.exists(xlsx_path):
        print(f'ERROR: HRSA XLSX not found: {xlsx_path}')
        sys.exit(1)

    # Check for CMS CSVs — try common naming patterns
    cms_files = {}
    for label, patterns in {
        'plans': ['PlanAttributes.csv', 'Plan_Attributes.csv', 'plans.csv'],
        'networks': ['Network.csv', 'Networks.csv', 'networks.csv'],
        'service_areas': ['ServiceArea.csv', 'Service_Area.csv', 'service_areas.csv'],
        'rates': ['Rate.csv', 'Rates.csv', 'rates.csv'],
    }.items():
        for pat in patterns:
            path = os.path.join(cms_dir, pat)
            if os.path.exists(path):
                cms_files[label] = path
                break
        if label not in cms_files:
            print(f'ERROR: CMS CSV for {label} not found in {cms_dir}')
            print(f'  Tried: {patterns}')
            sys.exit(1)

    conn = create_db(db_out)
    cur = conn.cursor()

    # 1. Clinics from HRSA XLSX
    clinics = load_hrsa_xlsx(xlsx_path)
    clinic_cols = [
        'id', 'name', 'org_name', 'center_type', 'address', 'city', 'state',
        'zip', 'phone', 'website', 'npi', 'lat', 'lng', 'county', 'county_fips',
        'operating_hours', 'location_setting', 'specialties', 'keywords',
        'avg_visits', 'recovery_speed', 'recovery_days', 'outcome_quality',
        'treatment_burden', 'burden_score', 'total_cost_est', 'per_visit_cost',
        'per_visit_tier', 'patient_summary', 'highlight_tags', 'recovery_score',
        'cost_score', 'badges',
    ]
    placeholders = ', '.join('?' * len(clinic_cols))
    clinic_rows = [tuple(c[col] for col in clinic_cols) for c in clinics]
    n = insert_batch(cur, f'INSERT INTO clinics VALUES ({placeholders})', clinic_rows)
    conn.commit()
    print(f'  {n:,} clinics inserted.')

    # 2. Insurance plans
    plans = load_cms_plans(cms_files['plans'])
    placeholders = ', '.join('?' * 24)
    n = insert_batch(cur, f'INSERT OR IGNORE INTO insurance_plans VALUES ({placeholders})', plans)
    conn.commit()
    print(f'  {n:,} plans inserted.')

    # 3. Networks
    networks = load_cms_networks(cms_files['networks'])
    n = insert_batch(cur, 'INSERT OR IGNORE INTO networks VALUES (?, ?, ?, ?, ?)', networks)
    conn.commit()
    print(f'  {n:,} networks inserted.')

    # 4. Service areas
    areas = load_cms_service_areas(cms_files['service_areas'])
    n = insert_batch(cur, 'INSERT INTO service_areas VALUES (?, ?, ?, ?, ?, ?)', areas)
    conn.commit()
    print(f'  {n:,} service area rows inserted.')

    # 5. Rates
    rates = load_cms_rates(cms_files['rates'])
    n = insert_batch(cur, 'INSERT INTO rates VALUES (?, ?, ?, ?)', rates)
    conn.commit()
    print(f'  {n:,} rate rows inserted.')

    # Update plan premiums from rates (avg premium for age=40)
    print('Updating plan premiums from rates...')
    cur.execute("""
        UPDATE insurance_plans
        SET monthly_premium = (
            SELECT ROUND(AVG(r.monthly_premium), 2)
            FROM rates r
            WHERE r.plan_id = insurance_plans.plan_id
              AND r.age = '40'
        )
        WHERE EXISTS (
            SELECT 1 FROM rates r
            WHERE r.plan_id = insurance_plans.plan_id
              AND r.age = '40'
        )
    """)
    conn.commit()

    finalize_db(conn, db_out)


# ---------------------------------------------------------------------------
# Build: legacy mode
# ---------------------------------------------------------------------------

def build_legacy(csv_dir: str, db_out: str):
    """Build from 5 pre-processed CSVs (original behaviour)."""
    print(f'CSV source : {csv_dir}')
    print(f'DB output  : {db_out}')
    print()

    missing = [t for t in TABLES if not os.path.exists(os.path.join(csv_dir, f'{t}.csv'))]
    if missing:
        print(f'ERROR: missing CSV files: {missing}')
        sys.exit(1)

    conn = create_db(db_out)
    cur = conn.cursor()

    order = ['clinics', 'insurance_plans', 'networks', 'service_areas', 'rates']
    for table in order:
        path = os.path.join(csv_dir, f'{table}.csv')
        print(f'Loading {table}...')
        n = load_csv(path, table, cur)
        conn.commit()
        print(f'  {n:,} rows inserted.')

    finalize_db(conn, db_out)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Build careculator.db from HRSA XLSX + CMS CSVs, or from pre-processed CSVs.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Raw mode (HRSA XLSX + CMS CSVs)
  python3 build_database.py --xlsx data/HRSA.xlsx --cms data/cms/

  # Legacy mode (pre-processed CSVs)
  python3 build_database.py --mode legacy --csv data/csvs/
        """,
    )
    parser.add_argument('--mode', choices=['raw', 'legacy'], default='raw',
                        help='Build mode: "raw" (HRSA XLSX + CMS CSVs) or "legacy" (pre-processed CSVs). Default: raw')
    parser.add_argument('--xlsx', help='Path to HRSA Health Center Sites XLSX (raw mode)')
    parser.add_argument('--cms', help='Directory containing CMS CSVs: PlanAttributes.csv, Network.csv, ServiceArea.csv, Rate.csv (raw mode)')
    parser.add_argument('--csv', default=DEFAULT_CSV_DIR,
                        help='Directory containing the 5 pre-processed CSV files (legacy mode)')
    parser.add_argument('--out', default=DEFAULT_DB_OUT, help='Output path for careculator.db')

    args = parser.parse_args()

    if args.mode == 'legacy':
        build_legacy(args.csv, args.out)
    else:
        if not args.xlsx or not args.cms:
            parser.error('Raw mode requires --xlsx and --cms. Use --mode legacy for pre-processed CSVs.')
        build_raw(args.xlsx, args.cms, args.out)
