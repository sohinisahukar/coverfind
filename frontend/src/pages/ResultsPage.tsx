import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import {
  fetchClinics,
  fetchInsuranceProviders,
  fetchInsuranceTiers,
  findProviderById,
  type Clinic,
  type InsuranceProvider,
  type InsuranceTier,
} from '../lib/api';

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const zip = searchParams.get('zip') || '60616';
  const priority = Number(searchParams.get('priority') ?? 50);
  const flow = searchParams.get('flow') || 'cash';
  const coverageParam = searchParams.get('coverage');
  const providerId = searchParams.get('providerId');
  const policyId = searchParams.get('policyId');
  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined;

  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<string[]>([]);
  const [distance, setDistance] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [insuranceTiers, setInsuranceTiers] = useState<InsuranceTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<InsuranceTier | null>(null);

  const insuranceContext = useMemo(() => {
    if (flow !== 'insurance' || !providerId || !policyId) return null;
    const prov = findProviderById(insuranceProviders, providerId);
    if (!prov) return null;
    const pol = prov.policies.find(p => p.id === policyId);
    if (!pol) return null;
    const cov = coverageParam != null ? Number(coverageParam) : NaN;
    return {
      providerName: prov.name,
      policyName: pol.name,
      coveragePct: Number.isFinite(cov) ? cov : null,
    };
  }, [flow, providerId, policyId, coverageParam, insuranceProviders]);

  useEffect(() => {
    fetchInsuranceProviders()
      .then(setInsuranceProviders)
      .catch(() => setInsuranceProviders([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchClinics({ q, priorityWeight: priority, lat, lng })
      .then(data => {
        setAllClinics(data);
        if (data.length > 0) setComparing([data[0].id]);
      })
      .catch(err => {
        const msg = (err as Error).message;
        setError(msg);
        toast.error(msg, { duration: 6000 });
      })
      .finally(() => setLoading(false));
  }, [q, priority, lat, lng]);

  useEffect(() => {
    if (!insuranceOpen || insuranceTiers.length > 0) return;
    fetchInsuranceTiers()
      .then(data => setInsuranceTiers(data.tiers))
      .catch(() => {});
  }, [insuranceOpen, insuranceTiers.length]);

  const clinics = useMemo(
    () => allClinics.filter(c => (c.distanceMiles ?? 0) <= distance),
    [allClinics, distance],
  );

  const toggleCompare = (id: string) => {
    setComparing(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const topClinic = clinics[0];
  const otherClinics = clinics.slice(1);

  return (
    <div className="flex flex-1 flex-col md:flex-row min-h-0 overflow-hidden">
      <div className="md:hidden flex flex-col gap-1 px-4 py-2 border-b bg-results-mobile-bar">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-muted text-sm font-medium min-w-0 truncate">
            Results for: {q || 'All'} near {zip}
          </span>
        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          className="shrink-0 flex items-center gap-1.5 text-cf-teal text-sm border border-cf-teal/35 bg-white/80 px-3 py-1 rounded-lg dark:bg-slate-900/60 dark:border-teal-500/35"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
        </button>
        </div>
        {insuranceContext && (
          <p className="text-[11px] text-muted leading-snug truncate">
            {insuranceContext.policyName} · ~{insuranceContext.coveragePct ?? '—'}% coverage (demo)
          </p>
        )}
        {flow === 'cash' && !insuranceContext && (
          <p className="text-[11px] text-muted leading-snug">No insurance on file · cost preference applied</p>
        )}
      </div>

      <aside className={`
        ${filtersOpen ? 'block' : 'hidden'} md:block
        w-full md:w-52 lg:w-56 shrink-0 p-4 md:p-5
        border-b md:border-b-0 md:border-r
        space-y-5 overflow-y-auto bg-results-sidebar
        md:h-full
      `}>
        <div className="hidden md:flex items-center gap-2 text-ink-muted text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
        </div>

        <FilterSlider
          label="Distance"
          value={distance}
          onChange={setDistance}
          min={1}
          max={25}
          display={`Up to ${distance} mi`}
        />
        <div>
          <p className="text-muted text-xs mb-2">Insurance</p>
          {selectedTier ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-cf-teal text-xs font-medium truncate">{selectedTier.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTier(null)}
                  className="text-muted text-xs hover:text-ink shrink-0"
                >
                  Clear
                </button>
              </div>
              <p className="text-muted text-xs">{selectedTier.coveragePct}% coverage</p>
              <p className="text-muted text-xs">~${selectedTier.avgPremium}/mo</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInsuranceOpen(o => !o)}
              className="text-cf-teal text-xs flex items-center gap-1 hover:text-cf-teal-bright"
            >
              {insuranceOpen ? '− Hide plans' : '+ Use Insurance'}
            </button>
          )}
          {insuranceOpen && !selectedTier && (
            <div className="mt-3 space-y-2">
              {insuranceTiers.length === 0 ? (
                <div className="text-muted text-xs">Loading…</div>
              ) : (
                insuranceTiers.map(tier => (
                  <button
                    key={tier.tier}
                    type="button"
                    onClick={() => {
                      setSelectedTier(tier);
                      setInsuranceOpen(false);
                    }}
                    className="w-full text-left glass-card p-2.5 hover:border-cf-teal/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5 gap-2">
                      <span className="text-ink text-xs font-medium truncate">{tier.label}</span>
                      <span className="text-cf-teal text-xs shrink-0">{tier.coveragePct}%</span>
                    </div>
                    <p className="text-muted text-xs">~${tier.avgPremium}/mo</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className={comparing.length > 0 ? 'flex min-h-full flex-col' : 'contents'}>
            <div
              className={`px-4 md:px-6 py-4 md:py-6 space-y-4 min-w-0 ${
                comparing.length > 0 ? 'flex-1 pb-28 md:pb-32' : 'pb-6 md:pb-8'
              }`}
            >
              <div className="hidden md:block space-y-2">
                <h2 className="text-xl font-semibold text-ink">
                  Results for: {q || 'All care'} near {zip}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-muted text-sm">
                    Recommended care: <span className="text-cf-teal font-medium">{q || 'Primary Care'}</span> · Based on
                    patient recovery data
                  </p>
                  {selectedTier && (
                    <span className="text-xs rounded-full border border-cf-teal/25 bg-cf-teal/10 text-cf-teal px-2 py-0.5">
                      {selectedTier.label} · {selectedTier.coveragePct}% covered
                    </span>
                  )}
                </div>
                {insuranceContext && (
                  <p className="text-sm text-subtle border border-slate-200/90 dark:border-slate-600/60 rounded-xl px-3 py-2 bg-white/40 dark:bg-slate-900/40">
                    <span className="text-ink font-medium">{insuranceContext.policyName}</span>
                    <span className="text-muted"> ({insuranceContext.providerName})</span>
                    {insuranceContext.coveragePct != null && (
                      <span className="text-muted"> · ~{insuranceContext.coveragePct}% illustrative coverage</span>
                    )}
                  </p>
                )}
                {flow === 'cash' && !insuranceContext && (
                  <p className="text-xs text-muted">
                    Without saved insurance — results use your cost vs. recovery preference from search.
                  </p>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-cf-teal border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="glass-card p-4 border-red-200 bg-red-50/80 text-red-800 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {error} — check your connection and try again.
                </div>
              )}

              {!loading && !error && clinics.length === 0 && (
                <div className="glass-card p-6 text-center text-muted">
                  No clinics found matching your search. Try a different query or increase the distance filter.
                </div>
              )}

              {!loading && !error && topClinic && (
                <>
                  <div className="glass-card p-4 bg-top-rec">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-cf-teal/15 border border-cf-teal/35 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-cf-teal">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-ink font-semibold text-sm sm:text-base">Top Recommendation: {topClinic.name}</p>
                        <p className="text-subtle text-xs sm:text-sm mt-0.5">{topClinic.patientSummary}</p>
                        {topClinic.highlightTags.length > 0 && (
                          <p className="text-muted text-xs mt-1.5 hidden sm:block">
                            Why it's best: {topClinic.highlightTags.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <ExpandedClinicCard
                    clinic={topClinic}
                    isComparing={comparing.includes(topClinic.id)}
                    onToggleCompare={() => toggleCompare(topClinic.id)}
                    insuranceTier={selectedTier}
                  />

                  {otherClinics.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {otherClinics.map(clinic => (
                        <CompactClinicCard
                          key={clinic.id}
                          clinic={clinic}
                          isComparing={comparing.includes(clinic.id)}
                          onToggleCompare={() => toggleCompare(clinic.id)}
                          onViewDetails={() => navigate(`/compare?ids=${topClinic.id},${clinic.id}`)}
                          insuranceTier={selectedTier}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {comparing.length > 0 && (
              <div className="sticky bottom-0 z-10 shrink-0 bg-compare-strip px-4 md:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pt-4 md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center overflow-hidden shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-muted text-xs sm:text-sm truncate">
                    Comparing{' '}
                    <span className="text-ink font-medium">
                      {allClinics.filter(c => comparing.includes(c.id)).map(c => c.name).join(', ')}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/compare?ids=${comparing.join(',')}`)}
                  className="btn-primary text-xs sm:text-sm px-4 py-2 shrink-0 flex items-center gap-1.5"
                >
                  Compare
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function withInsurance(cost: number, tier: InsuranceTier | null): number {
  if (!tier) return cost;
  return Math.round(cost * (1 - tier.coveragePct / 100));
}

function FilterSlider({ label, value, onChange, min, max, display }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  display?: string;
}) {
  return (
    <div>
      <p className="text-muted text-xs mb-1">{label}</p>
      {display && <p className="text-cf-teal text-xs font-medium mb-1.5">{display}</p>}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-cf"
      />
    </div>
  );
}

function ExpandedClinicCard({ clinic, isComparing, onToggleCompare, insuranceTier }: {
  clinic: Clinic;
  isComparing: boolean;
  onToggleCompare: () => void;
  insuranceTier: InsuranceTier | null;
}) {
  const isBestValue = clinic.badges.includes('best-value');
  const fullCost = clinic.totalCostEstimate;
  const adjCost = withInsurance(fullCost, insuranceTier);
  const adjPerVisit = withInsurance(clinic.perVisitCost, insuranceTier);
  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center overflow-hidden shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-ink font-semibold text-sm sm:text-base">{clinic.name}</span>
          {isBestValue && <span className="badge-teal">Best Value</span>}
        </div>
        <span className="text-muted text-sm shrink-0 ml-2">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center border-t border-slate-200/90 dark:border-slate-700/85 pt-4">
        <Stat label="Avg Visits" value={String(clinic.avgVisitsNeeded)} />
        <Stat label="Recovery" value={clinic.recoverySpeed} />
        <Stat label="Outcome" value={clinic.outcomeQuality} />
        <Stat label="Burden" value={clinic.treatmentBurden} badge />
        <div>
          <p className="text-muted text-xs mb-1">Est. Cost</p>
          {insuranceTier ? (
            <>
              <p className="font-semibold text-cf-teal text-sm">~${adjCost.toLocaleString()}</p>
              <p className="text-muted text-xs line-through">~${fullCost.toLocaleString()}</p>
            </>
          ) : (
            <p className="font-semibold text-ink text-sm">~${fullCost.toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-3 border-t border-slate-200/90 dark:border-slate-700/85 gap-3">
        <p className="text-subtle text-xs sm:text-sm">{clinic.patientSummary}</p>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-subtle text-sm font-medium">
            {insuranceTier ? (
              <>
                ${adjPerVisit}/visit
                <span className="text-muted text-xs ml-1 font-normal">(w/ plan)</span>
              </>
            ) : (
              <>${clinic.perVisitCost}/visit</>
            )}
          </span>
          <button
            type="button"
            onClick={onToggleCompare}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${
              isComparing ? 'btn-compare-state' : 'btn-compare-idle'
            }`}
          >
            {isComparing ? '✓ Comparing' : 'Compare'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactClinicCard({ clinic, isComparing, onToggleCompare, onViewDetails, insuranceTier }: {
  clinic: Clinic;
  isComparing: boolean;
  onToggleCompare: () => void;
  onViewDetails: () => void;
  insuranceTier: InsuranceTier | null;
}) {
  const adjPerVisit = withInsurance(clinic.perVisitCost, insuranceTier);
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-ink font-medium text-sm">{clinic.name}</span>
        <span className="text-muted text-xs">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted text-xs">Avg Visits</span>
          <StatusBadge
            status={clinic.avgVisitsNeeded <= 5 ? 'low' : 'high'}
            label={String(clinic.avgVisitsNeeded)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted text-xs">Outcome Quality</span>
          <StatusBadge status={clinic.outcomeQuality} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted text-xs">Per Visit</span>
          <span className="text-ink text-xs font-medium">
            ${adjPerVisit}/visit
            {insuranceTier && clinic.perVisitCost !== adjPerVisit && (
              <span className="text-muted line-through ml-1">${clinic.perVisitCost}</span>
            )}
          </span>
        </div>
      </div>
      <p className="text-muted text-xs mt-3 line-clamp-2">{clinic.patientSummary}</p>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onToggleCompare}
          className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
            isComparing ? 'btn-compare-state' : 'btn-compare-idle'
          }`}
        >
          {isComparing ? '✓ Comparing' : 'Compare'}
        </button>
        <button type="button" onClick={onViewDetails} className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1">
          View Details
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  const isBad = value === 'high';
  return (
    <div>
      <p className="text-muted text-xs mb-1">{label}</p>
      {badge ? (
        <span className={isBad ? 'badge-red' : 'badge-green'}>{value}</span>
      ) : (
        <p className="font-semibold text-ink text-sm capitalize">{value}</p>
      )}
    </div>
  );
}
