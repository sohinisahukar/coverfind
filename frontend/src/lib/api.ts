/**
 * api.ts — Frontend API client.
 *
 * All backend communication goes through this module. Each function maps
 * to one backend endpoint, normalises the response, and returns typed data.
 *
 * Endpoint map:
 *   fetchClinics()            -> GET /api/clinics/search
 *   fetchCompare()            -> GET /api/clinics/compare
 *   fetchRecommendations()    -> GET /api/clinics/recommendations
 *   fetchInsuranceProviders() -> GET /api/insurance/providers
 *   fetchInsuranceTiers()     -> GET /api/insurance
 *   zipToCoords()             -> external zippopotam.us API
 *
 * In dev, Vite's proxy (vite.config.ts) forwards /api/* to the backend.
 * Set VITE_API_URL when the UI is hosted separately from the API.
 */
function apiBase(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env != null && String(env).trim() !== '') {
    return String(env).replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return 'http://localhost:3001';
}

const BASE = apiBase();

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
  perVisitCostTier: 'low' | 'moderate' | 'high';
  patientSummary: string;
  highlightTags: string[];
  recoveryScore: number;
  costScore: number;
  /** Normalized from API object or string[] — use `.includes('best-value')` etc. */
  badges: string[];
  /** 0–100 composite match score computed from displayed metrics + user priority */
  compositeScore?: number;
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

/** `clinics.json` uses badge objects; UI expects string tags for `.includes()`. */
function normalizeBadges(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, boolean>;
    const tags: string[] = [];
    if (o.bestValue) tags.push('best-value');
    if (o.topRecommendation) tags.push('top-rec');
    if (o.highVisits) tags.push('high-visits');
    if (o.newInsurance) tags.push('new');
    return tags;
  }
  return [];
}

/** API uses `medium`; StatusBadge uses `moderate`. */
function normalizePerVisitTier(t: unknown): 'low' | 'moderate' | 'high' {
  const s = String(t || '').toLowerCase();
  if (s === 'medium') return 'moderate';
  if (s === 'low' || s === 'moderate' || s === 'high') return s;
  return 'moderate';
}

export function normalizeClinic(raw: Record<string, unknown>): Clinic {
  const base = raw as unknown as Clinic;
  return {
    ...base,
    badges: normalizeBadges(raw.badges),
    perVisitCostTier: normalizePerVisitTier(raw.perVisitCostTier),
    highlightTags: Array.isArray(raw.highlightTags)
      ? (raw.highlightTags as unknown[]).map(String)
      : Array.isArray(base.highlightTags)
        ? base.highlightTags
        : [],
  };
}

export async function fetchClinics(params: {
  q?: string;
  priorityWeight?: number;
  maxDistanceMi?: number;
  treatmentBurden?: string;
  lat?: number;
  lng?: number;
}): Promise<Clinic[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.priorityWeight !== undefined) qs.set('priorityWeight', String(params.priorityWeight));
  if (params.maxDistanceMi !== undefined) qs.set('maxDistanceMi', String(params.maxDistanceMi));
  if (params.treatmentBurden) qs.set('treatmentBurden', params.treatmentBurden);
  if (params.lat !== undefined) qs.set('lat', String(params.lat));
  if (params.lng !== undefined) qs.set('lng', String(params.lng));
  const data = await apiFetch<Record<string, unknown>[]>(`${BASE}/api/clinics/search?${qs}`);
  return Array.isArray(data) ? data.map((row) => normalizeClinic(row)) : [];
}

export type InsurancePolicy = { id: string; name: string; type: string };

export type InsuranceProvider = {
  id: string;
  name: string;
  policies: InsurancePolicy[];
};

export async function fetchInsuranceProviders(): Promise<InsuranceProvider[]> {
  const data = await apiFetch<unknown>(`${BASE}/api/insurance/providers`);
  return Array.isArray(data) ? (data as InsuranceProvider[]) : [];
}

export function findProviderById(
  providers: InsuranceProvider[],
  id: string,
): InsuranceProvider | undefined {
  return providers.find(p => p.id === id);
}

export async function fetchCompare(ids: string[]): Promise<Clinic[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(
    `${BASE}/api/clinics/compare?ids=${encodeURIComponent(ids.join(','))}`,
  );
  return Array.isArray(rows) ? rows.map((row) => normalizeClinic(row)) : [];
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
  const q = state ? `?state=${encodeURIComponent(state)}` : '';
  return apiFetch(`${BASE}/api/insurance${q}`);
}

export async function zipToCoords(zip: string): Promise<{ lat: number; lng: number } | null> {
  if (!/^\d{5}$/.test(zip.trim())) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`);
    if (!res.ok) return null;
    const data = await res.json() as { places: Array<{ latitude: string; longitude: string }> };
    const place = data.places?.[0];
    if (!place) return null;
    return { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) };
  } catch {
    return null;
  }
}
