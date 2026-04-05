const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export interface Clinic {
  id: string;
  name: string;
  specialties: string[];
  keywords: string[];
  lat: number;
  lng: number;
  zip: string;
  avgVisitsNeeded: number;
  recoverySpeed: 'fast' | 'moderate' | 'slow';
  outcomeQuality: 'high' | 'moderate' | 'low';
  treatmentBurden: 'low' | 'moderate' | 'high';
  totalCostEstimate: number;
  perVisitCost: number;
  perVisitCostTier: 'low' | 'medium' | 'high';
  patientSummary: string;
  highlightTags: string[];
  recoveryScore: number;
  costScore: number;
  badges: {
    bestValue: boolean;
    topRecommendation: boolean;
    highVisits: boolean;
    newInsurance: boolean;
  };
  distanceMiles?: number;
  website?: string;
  phone?: string;
}

async function apiFetch<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `Cannot reach backend at ${BASE}. Is the server running on port 3001? (${(err as Error).message})`
    );
  }

  if (!res.ok) {
    let message = `Server error ${res.status} ${res.statusText}`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) message = `${res.status}: ${body.error}`;
    } catch {
      // non-JSON body — keep the status message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export interface ClinicsResult {
  data:       Clinic[];
  total:      number;
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  center:     { lat: number; lng: number };
}

export async function fetchClinics(params: {
  q?: string;
  state?: string;
  priorityWeight?: number;
  maxDistanceMi?: number;
  treatmentBurden?: string;
  lat?: number;
  lng?: number;
  limit?: number;
  offset?: number;
}): Promise<Clinic[]> {
  const qs = new URLSearchParams();
  if (params.q)                          qs.set('q',               params.q);
  if (params.state)                      qs.set('state',           params.state);
  if (params.priorityWeight !== undefined) qs.set('priorityWeight', String(params.priorityWeight));
  if (params.maxDistanceMi  !== undefined) qs.set('maxDistanceMi',  String(params.maxDistanceMi));
  if (params.treatmentBurden)            qs.set('treatmentBurden', params.treatmentBurden);
  if (params.lat !== undefined)          qs.set('lat',             String(params.lat));
  if (params.lng !== undefined)          qs.set('lng',             String(params.lng));
  if (params.limit  !== undefined)       qs.set('limit',           String(params.limit));
  if (params.offset !== undefined)       qs.set('offset',          String(params.offset));

  // Backend now returns { data, total, pagination, center } — extract data for backwards compat
  const result = await apiFetch<ClinicsResult>(`${BASE}/api/clinics/search?${qs}`);
  return result.data;
}

export async function fetchCompare(ids: string[]): Promise<Clinic[]> {
  return apiFetch<Clinic[]>(`${BASE}/api/clinics/compare?ids=${ids.join(',')}`);
}

export async function fetchRecommendations(): Promise<{ specialty: string; condition: string; quickTags: string[] }> {
  return apiFetch(`${BASE}/api/clinics/recommendations`);
}

export interface InsuranceTier {
  tier: 'bronze' | 'silver' | 'gold' | 'premium';
  label: string;
  coveragePct: number;
  color: string;
  planCount: number;
  avgPremium: number;
  avgDeductible: number | null;
  avgOopMax: number | null;
}

export async function fetchInsuranceTiers(state?: string): Promise<{ state: string | null; tiers: InsuranceTier[] }> {
  const qs = state ? `?state=${state}` : '';
  return apiFetch(`${BASE}/api/insurance/tiers${qs}`);
}

export interface GeoResult {
  zip: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  county: string;
  countyFips: string;
}

/**
 * Resolve a ZIP code to coordinates using our own backend geo endpoint.
 * No external API dependency — sourced from the clinic DB.
 * Returns null if the ZIP is not found or invalid.
 */
export async function zipToCoords(zip: string): Promise<GeoResult | null> {
  if (!/^\d{5}$/.test(zip.trim())) return null;
  try {
    return await apiFetch<GeoResult>(`${BASE}/api/geo/zip/${zip.trim()}`);
  } catch {
    return null;
  }
}
