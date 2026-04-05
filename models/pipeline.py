"""
CoverFind -- Full Data Pipeline (Steps 1-10)
Saves all clean datasets to dataset/clean/
"""

import pandas as pd
import numpy as np
import random
import os

pd.set_option('display.max_columns', None)

DATASET_DIR   = r'C:\Users\harip\Documents\Hackathon\dataset'
INSURANCE_DIR = DATASET_DIR + r'\Insurance'
OUTPUT_DIR    = DATASET_DIR + r'\clean'
os.makedirs(OUTPUT_DIR, exist_ok=True)
print('Output dir:', OUTPUT_DIR)

# ─────────────────────────────────────────────────────────────
# STEP 1 -- Finalize Provider Data
# ─────────────────────────────────────────────────────────────
print('\n[STEP 1] Loading HRSA provider data...')
hrsa_raw = pd.read_excel(DATASET_DIR + r'\Health_Center_Service_Delivery_and_LookAlike_Sites.xlsx')
print(f'  Raw shape: {hrsa_raw.shape}')

HRSA_KEEP = [
    'Health Center Number',
    'FQHC Site NPI Number',
    'Site Name',
    'Site Address',
    'Site City',
    'Site State Abbreviation',
    'Site Postal Code',
    'Site Telephone Number',
    'Health Center Service Delivery Site Location Setting Description',
    'Site Status Description',
    'Health Center Type Description',
    'Health Center Name',
    'Geocoding Artifact Address Primary X Coordinate',
    'Geocoding Artifact Address Primary Y Coordinate',
    'State Name',
    'Complete County Name',
]

hrsa = hrsa_raw[HRSA_KEEP].copy()
hrsa.rename(columns={
    'Health Center Number':                                              'provider_id',
    'FQHC Site NPI Number':                                             'npi',
    'Site Name':                                                        'site_name',
    'Site Address':                                                     'address',
    'Site City':                                                        'city',
    'Site State Abbreviation':                                          'state',
    'Site Postal Code':                                                 'zip',
    'Site Telephone Number':                                            'phone',
    'Health Center Service Delivery Site Location Setting Description': 'location_setting',
    'Site Status Description':                                          'status',
    'Health Center Type Description':                                   'center_type',
    'Health Center Name':                                               'org_name',
    'Geocoding Artifact Address Primary X Coordinate':                  'longitude',
    'Geocoding Artifact Address Primary Y Coordinate':                  'latitude',
    'State Name':                                                       'state_name',
    'Complete County Name':                                             'county',
}, inplace=True)

hrsa = hrsa[hrsa['status'] == 'Active'].copy()
hrsa.dropna(subset=['latitude', 'longitude', 'state'], inplace=True)
hrsa['zip'] = hrsa['zip'].astype(str).str.strip().str[:5]
hrsa.reset_index(drop=True, inplace=True)

print(f'  Active providers with coordinates: {hrsa.shape}')
hrsa.to_csv(OUTPUT_DIR + r'\providers_clean.csv', index=False)
print('  Saved: providers_clean.csv')

# ─────────────────────────────────────────────────────────────
# STEP 2 -- Clean Insurance Data
# ─────────────────────────────────────────────────────────────
print('\n[STEP 2] Loading insurance data...')
plan_attrs_raw = pd.read_csv(INSURANCE_DIR + r'\PlanAttributes.csv', low_memory=False)
rates_raw      = pd.read_csv(INSURANCE_DIR + r'\Rate.csv',           low_memory=False)
service_raw    = pd.read_csv(INSURANCE_DIR + r'\ServiceArea.csv',    low_memory=False)
print(f'  PlanAttributes: {plan_attrs_raw.shape}')
print(f'  Rates: {rates_raw.shape}')
print(f'  ServiceArea: {service_raw.shape}')

# --- Plan Attributes ---
PLAN_KEEP = [
    'BusinessYear', 'StateCode', 'IssuerId', 'PlanId',
    'PlanMarketingName', 'PlanType', 'MetalLevel', 'MarketCoverage',
    'DentalOnlyPlan', 'DEHBDedInnTier1Individual', 'DEHBInnTier1IndividualMOOP',
]
plan_attrs = plan_attrs_raw[[c for c in PLAN_KEEP if c in plan_attrs_raw.columns]].copy()
plan_attrs.rename(columns={
    'BusinessYear': 'year',
    'StateCode': 'state',
    'IssuerId': 'issuer_id',
    'PlanId': 'plan_id',
    'PlanMarketingName': 'plan_name', 'PlanType': 'plan_type',
    'MetalLevel': 'metal_level', 'MarketCoverage': 'market',
    'DentalOnlyPlan': 'dental_only',
    'DEHBDedInnTier1Individual': 'deductible_individual',
    'DEHBInnTier1IndividualMOOP': 'oop_max_individual',
}, inplace=True)

if 'dental_only' in plan_attrs.columns:
    plan_attrs = plan_attrs[plan_attrs['dental_only'] != 'Yes']
plan_attrs = plan_attrs[plan_attrs['market'] == 'Individual']
plan_attrs['deductible_individual'] = pd.to_numeric(plan_attrs['deductible_individual'], errors='coerce')
plan_attrs['oop_max_individual']    = pd.to_numeric(plan_attrs['oop_max_individual'],    errors='coerce')

# FIX: PlanAttributes PlanId has a variant suffix e.g. "21989AK0020002-00"
#      Rate PlanId is the base without suffix e.g. "21989AK0020002"
#      Strip the suffix to create a join key.
plan_attrs['plan_id_base'] = plan_attrs['plan_id'].str.rsplit('-', n=1).str[0]
print(f'  Plans after filter: {plan_attrs.shape}')

# --- Average Premium per plan ---
RATE_KEEP = ['PlanId', 'Age', 'IndividualRate']
rates = rates_raw[[c for c in RATE_KEEP if c in rates_raw.columns]].copy()
rates.rename(columns={
    'PlanId': 'plan_id_base', 'Age': 'age', 'IndividualRate': 'monthly_premium',
}, inplace=True)
rates['monthly_premium'] = pd.to_numeric(rates['monthly_premium'], errors='coerce')

rates_21 = rates[rates['age'] == '21'][['plan_id_base', 'monthly_premium']].copy()
rates_21 = rates_21.groupby('plan_id_base', as_index=False)['monthly_premium'].mean()
rates_21.rename(columns={'monthly_premium': 'avg_monthly_premium'}, inplace=True)
print(f'  Premium averages (age 21): {rates_21.shape}')

# --- Service Area: issuer -> states ---
issuer_states = (
    service_raw[['IssuerId', 'StateCode']].copy()
    .rename(columns={'IssuerId': 'issuer_id', 'StateCode': 'state'})
    .dropna()
    .groupby('issuer_id')['state']
    .apply(lambda x: list(x.unique()))
    .reset_index()
    .rename(columns={'state': 'covered_states'})
)
print(f'  Issuer state coverage: {issuer_states.shape}')

# --- Merge plans + premiums ---
insurance = plan_attrs.merge(rates_21, on='plan_id_base', how='inner')
insurance = insurance.merge(issuer_states, on='issuer_id', how='left')
insurance = insurance.drop_duplicates(subset='plan_id', keep='first').reset_index(drop=True)

print(f'  Final insurance table: {insurance.shape}')
print('  Metal levels:', insurance['metal_level'].value_counts().to_dict())
print('  Plan types:',   insurance['plan_type'].value_counts().to_dict())

insurance.to_csv(OUTPUT_DIR + r'\insurance_clean.csv', index=False)
print('  Saved: insurance_clean.csv')

# ─────────────────────────────────────────────────────────────
# STEP 3 -- Align Datasets on Common States
# ─────────────────────────────────────────────────────────────
print('\n[STEP 3] Aligning datasets on common states...')
provider_states  = set(hrsa['state'].dropna().unique())
insurance_states = set(insurance['state'].dropna().unique())
common_states    = provider_states & insurance_states

print(f'  Provider states:  {len(provider_states)}')
print(f'  Insurance states: {len(insurance_states)}')
print(f'  Common states:    {len(common_states)} -> {sorted(common_states)}')

hrsa_aligned      = hrsa[hrsa['state'].isin(common_states)].copy().reset_index(drop=True)
insurance_aligned = insurance[insurance['state'].isin(common_states)].copy().reset_index(drop=True)

print(f'  Aligned providers:      {hrsa_aligned.shape}')
print(f'  Aligned insurance plans: {insurance_aligned.shape}')

# ─────────────────────────────────────────────────────────────
# STEP 4 -- Provider-Insurance Relationship
# ─────────────────────────────────────────────────────────────
print('\n[STEP 4] Creating provider-insurance mapping...')
random.seed(42)

state_plans = (
    insurance_aligned.groupby('state')['plan_id']
    .apply(list)
    .to_dict()
)

provider_insurance_rows = []
for _, row in hrsa_aligned.iterrows():
    state = row['state']
    plans_in_state = state_plans.get(state, [])
    if not plans_in_state:
        continue
    setting = str(row.get('location_setting', '')).lower()
    if 'urban' in setting:
        n = min(4, len(plans_in_state))
    elif 'rural' in setting:
        n = min(2, len(plans_in_state))
    else:
        n = min(3, len(plans_in_state))
    for plan in random.sample(plans_in_state, n):
        provider_insurance_rows.append({
            'provider_id': row['provider_id'],
            'plan_id':     plan,
            'state':       state,
        })

provider_insurance = pd.DataFrame(provider_insurance_rows)
print(f'  Provider-insurance rows: {provider_insurance.shape}')

provider_insurance.to_csv(OUTPUT_DIR + r'\provider_insurance_clean.csv', index=False)
print('  Saved: provider_insurance_clean.csv')

# ─────────────────────────────────────────────────────────────
# STEP 5 -- Create Treatment Data
# ─────────────────────────────────────────────────────────────
print('\n[STEP 5] Generating treatment data...')

CONDITIONS = [
    'knee pain',
    'back pain',
    'flu / respiratory',
    'skin rash / dermatology',
    'diabetes management',
    'hypertension',
    'anxiety / depression',
    'physical therapy',
    'prenatal care',
    'dental / oral health',
]

CONDITION_BASELINE = {
    'knee pain':               (dict(low=3,  high=10), dict(low=14,  high=60),  0.75),
    'back pain':               (dict(low=4,  high=12), dict(low=14,  high=90),  0.70),
    'flu / respiratory':       (dict(low=1,  high=3),  dict(low=5,   high=14),  0.90),
    'skin rash / dermatology': (dict(low=2,  high=5),  dict(low=7,   high=30),  0.85),
    'diabetes management':     (dict(low=4,  high=8),  dict(low=30,  high=180), 0.65),
    'hypertension':            (dict(low=3,  high=6),  dict(low=30,  high=90),  0.72),
    'anxiety / depression':    (dict(low=6,  high=20), dict(low=30,  high=180), 0.60),
    'physical therapy':        (dict(low=6,  high=18), dict(low=21,  high=90),  0.78),
    'prenatal care':           (dict(low=8,  high=14), dict(low=60,  high=270), 0.88),
    'dental / oral health':    (dict(low=1,  high=4),  dict(low=1,   high=14),  0.82),
}

rng = np.random.default_rng(42)
treatment_rows = []

for _, row in hrsa_aligned.iterrows():
    n_conditions = int(rng.integers(1, 4))
    for condition in random.sample(CONDITIONS, n_conditions):
        sess_r, rec_r, base_outcome = CONDITION_BASELINE[condition]
        sessions      = int(rng.integers(sess_r['low'], sess_r['high'] + 1))
        recovery_days = int(rng.integers(rec_r['low'],  rec_r['high']  + 1))
        outcome_quality = float(np.clip(base_outcome + rng.normal(0, 0.08), 0.3, 1.0))
        treatment_rows.append({
            'provider_id':     row['provider_id'],
            'condition':       condition,
            'sessions':        sessions,
            'recovery_days':   recovery_days,
            'outcome_quality': round(outcome_quality, 3),
        })

treatment = pd.DataFrame(treatment_rows)
print(f'  Treatment rows: {treatment.shape}')
print('  Condition counts:', treatment['condition'].value_counts().to_dict())

# ─────────────────────────────────────────────────────────────
# STEP 6 -- Treatment Burden Score
# ─────────────────────────────────────────────────────────────
print('\n[STEP 6] Computing treatment burden score...')

def min_max(series):
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series([0.5] * len(series), index=series.index)
    return (series - mn) / (mx - mn)

treatment['burden_score'] = (
    0.4 * min_max(treatment['sessions']) +
    0.4 * min_max(treatment['recovery_days']) +
    0.2 * (1 - treatment['outcome_quality'])
).round(4)

treatment['burden_label'] = treatment['burden_score'].apply(
    lambda s: 'Low' if s < 0.33 else ('Moderate' if s < 0.66 else 'High')
)

print('  Burden distribution:', treatment['burden_label'].value_counts().to_dict())

treatment.to_csv(OUTPUT_DIR + r'\treatment_data_clean.csv', index=False)
print('  Saved: treatment_data_clean.csv')

# ─────────────────────────────────────────────────────────────
# STEP 7 -- Estimate Patient Cost
# ─────────────────────────────────────────────────────────────
print('\n[STEP 7] Estimating patient costs...')

METAL_VISIT_COST = {
    'Bronze': 85, 'Silver': 55, 'Gold': 35, 'Platinum': 20, 'Catastrophic': 110,
}

ins_cost = insurance_aligned[['plan_id', 'metal_level', 'avg_monthly_premium', 'deductible_individual']].copy()
ins_cost['cost_per_visit'] = ins_cost['metal_level'].map(METAL_VISIT_COST).fillna(70)

cost_df = (
    treatment[['provider_id', 'condition', 'sessions', 'burden_score']]
    .merge(provider_insurance[['provider_id', 'plan_id']], on='provider_id', how='inner')
    .merge(ins_cost, on='plan_id', how='inner')
)
cost_df['total_cost_estimate'] = (cost_df['sessions'] * cost_df['cost_per_visit']).round(2)
print(f'  Cost table shape: {cost_df.shape}')

# ─────────────────────────────────────────────────────────────
# STEP 8 -- Combine Everything -> Master Dataset
# ─────────────────────────────────────────────────────────────
print('\n[STEP 8] Building master dataset...')

PROVIDER_COLS = [
    'provider_id', 'site_name', 'org_name', 'address', 'city',
    'state', 'zip', 'phone', 'latitude', 'longitude',
    'location_setting', 'center_type', 'county',
]
providers_slim  = hrsa_aligned[PROVIDER_COLS].drop_duplicates('provider_id')
insurance_slim  = insurance_aligned[
    ['plan_id', 'plan_name', 'plan_type', 'metal_level', 'avg_monthly_premium',
     'deductible_individual', 'oop_max_individual']
].drop_duplicates('plan_id')
treatment_slim  = treatment[[
    'provider_id', 'condition', 'sessions', 'recovery_days',
    'outcome_quality', 'burden_score', 'burden_label'
]]
cost_lookup = cost_df[
    ['provider_id', 'condition', 'plan_id', 'cost_per_visit', 'total_cost_estimate']
].drop_duplicates()

master = (
    treatment_slim
    .merge(providers_slim,  on='provider_id', how='left')
    .merge(provider_insurance[['provider_id', 'plan_id']], on='provider_id', how='left')
    .merge(insurance_slim,  on='plan_id',     how='left')
    .merge(cost_lookup,     on=['provider_id', 'condition', 'plan_id'], how='left')
)
master.reset_index(drop=True, inplace=True)

print(f'  Master dataset shape: {master.shape}')
print('  Columns:', master.columns.tolist())

master.to_csv(OUTPUT_DIR + r'\master_dataset_clean.csv', index=False)
print('  Saved: master_dataset_clean.csv')

# ─────────────────────────────────────────────────────────────
# STEP 9 -- Query Logic
# ─────────────────────────────────────────────────────────────
print('\n[STEP 9] Defining search_providers() query function...')

def search_providers(condition, state, plan_type=None, top_n=5):
    """
    Filter master dataset by condition + state + optional plan_type.
    Returns top_n providers sorted by burden_score (lowest first).
    """
    df = master.copy()
    df = df[df['condition'].str.lower().str.contains(condition.lower(), na=False)]
    df = df[df['state'] == state.upper()]
    if plan_type:
        df = df[df['plan_type'].str.upper() == plan_type.upper()]
    if df.empty:
        print(f'  No results for condition={condition!r} state={state!r} plan_type={plan_type!r}')
        return df
    df = df.sort_values(['burden_score', 'total_cost_estimate'])
    df = df.drop_duplicates(subset=['provider_id', 'plan_id'], keep='first')
    COLS = [
        'site_name', 'city', 'state', 'condition',
        'sessions', 'recovery_days', 'outcome_quality',
        'burden_score', 'burden_label',
        'plan_name', 'plan_type', 'metal_level',
        'avg_monthly_premium', 'total_cost_estimate',
    ]
    return df[COLS].head(top_n).reset_index(drop=True)

print('  search_providers() ready.')

# ─────────────────────────────────────────────────────────────
# STEP 10 -- Demo Output
# ─────────────────────────────────────────────────────────────
print('\n[STEP 10] Running demo query...')

demo_state     = sorted(common_states)[0]
demo_condition = 'knee pain'

results = search_providers(condition=demo_condition, state=demo_state, top_n=5)
print(f'\n  Top providers for "{demo_condition}" in {demo_state}:')
print(results.to_string(index=False))

if not results.empty:
    r = results.iloc[0]
    print('\n' + '='*60)
    print('  DEMO: Top-1 Result Explained')
    print('='*60)
    burden_lbl  = r['burden_label']
    outcome_pct = int(r['outcome_quality'] * 100)
    cost        = r['total_cost_estimate']
    cost_str    = f"${cost:,.0f}" if pd.notna(cost) else 'N/A'
    print(f"  Provider : {r['site_name']} ({r['city']}, {r['state']})")
    print(f"  Condition: {r['condition']}")
    print(f"  Burden   : {burden_lbl} (score {r['burden_score']:.2f})")
    print(f"  Details  : {r['sessions']} sessions - {r['recovery_days']} days recovery - {outcome_pct}% outcome quality")
    print(f"  Plan     : {r['plan_name']} ({r['plan_type']}, {r['metal_level']})")
    print(f"  Cost     : {cost_str} estimated total - ${r['avg_monthly_premium']:.0f}/mo premium")
    print(f"  Why      : Ranks here because patients recover in {r['recovery_days']} days over")
    print(f"             {r['sessions']} sessions with {outcome_pct}% success -> {burden_lbl.lower()} burden.")

# ─────────────────────────────────────────────────────────────
# Final summary
# ─────────────────────────────────────────────────────────────
print('\n' + '='*60)
print(f'Files saved to {OUTPUT_DIR}')
print('='*60)
for fname in [
    'providers_clean.csv',
    'insurance_clean.csv',
    'provider_insurance_clean.csv',
    'treatment_data_clean.csv',
    'master_dataset_clean.csv',
]:
    fpath = os.path.join(OUTPUT_DIR, fname)
    if os.path.exists(fpath):
        df_tmp = pd.read_csv(fpath)
        print(f'  {fname:<45} {df_tmp.shape[0]:>8,} rows × {df_tmp.shape[1]} cols')
    else:
        print(f'  {fname:<45} NOT FOUND')
