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
  return apiFetch<Clinic[]>(`${BASE}/api/clinics/search?${qs}`);
}

export async function fetchCompare(ids: string[]): Promise<Clinic[]> {
  return apiFetch<Clinic[]>(`${BASE}/api/clinics/compare?ids=${ids.join(',')}`);
}
