/**
 * In dev, use same-origin `/api/...` so Vite's proxy (vite.config.ts) forwards to the backend.
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
  badges: string[];
  distanceMiles?: number;
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
  return {
    ...(raw as unknown as Clinic),
    badges: normalizeBadges(raw.badges),
    perVisitCostTier: normalizePerVisitTier(raw.perVisitCostTier),
  };
}

export async function fetchClinics(params: {
  q?: string;
  priorityWeight?: number;
  maxDistanceMi?: number;
  treatmentBurden?: string;
}): Promise<Clinic[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.priorityWeight !== undefined) qs.set('priorityWeight', String(params.priorityWeight));
  if (params.maxDistanceMi !== undefined) qs.set('maxDistanceMi', String(params.maxDistanceMi));
  if (params.treatmentBurden) qs.set('treatmentBurden', params.treatmentBurden);
  const res = await fetch(`${BASE}/api/clinics/search?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch clinics');
  const data = (await res.json()) as Record<string, unknown>[];
  return Array.isArray(data) ? data.map((row) => normalizeClinic(row)) : [];
}

export type InsurancePolicy = { id: string; name: string; type: string };

export type InsuranceProvider = {
  id: string;
  name: string;
  policies: InsurancePolicy[];
};

export async function fetchInsuranceProviders(): Promise<InsuranceProvider[]> {
  const res = await fetch(`${BASE}/api/insurance/providers`);
  if (!res.ok) throw new Error('Failed to load insurance providers');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function findProviderById(
  providers: InsuranceProvider[],
  id: string,
): InsuranceProvider | undefined {
  return providers.find(p => p.id === id);
}

export async function fetchCompare(ids: string[]): Promise<Clinic[]> {
  const q = encodeURIComponent(ids.join(','));
  const res = await fetch(`${BASE}/api/clinics/compare?ids=${q}`);
  if (!res.ok) throw new Error('Failed to fetch comparison');
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: Record<string, unknown>) => normalizeClinic(row));
}
