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
  perVisitCostTier: 'low' | 'moderate' | 'high';
  patientSummary: string;
  highlightTags: string[];
  recoveryScore: number;
  costScore: number;
  badges: string[];
  distanceMiles?: number;
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
  return res.json() as Promise<Clinic[]>;
}

export async function fetchCompare(ids: string[]): Promise<Clinic[]> {
  const res = await fetch(`${BASE}/api/clinics/compare?ids=${ids.join(',')}`);
  if (!res.ok) throw new Error('Failed to fetch comparison');
  return res.json() as Promise<Clinic[]>;
}
