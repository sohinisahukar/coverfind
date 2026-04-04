import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { fetchClinics, fetchInsuranceTiers, type Clinic, type InsuranceTier } from '../lib/api';

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const zip = searchParams.get('zip') || '';
  const priority = Number(searchParams.get('priority') ?? 50);
  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined;

  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<string[]>([]);
  const [distance, setDistance] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Insurance state
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [insuranceTiers, setInsuranceTiers] = useState<InsuranceTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<InsuranceTier | null>(null);

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

  // Fetch insurance tiers when panel opens
  useEffect(() => {
    if (!insuranceOpen || insuranceTiers.length > 0) return;
    const state = zip ? undefined : undefined; // could extract state from zip in future
    fetchInsuranceTiers(state)
      .then(data => setInsuranceTiers(data.tiers))
      .catch(() => {}); // silently fail
  }, [insuranceOpen]);

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
    <div className="flex flex-col md:flex-row h-[calc(100vh-72px)] overflow-hidden">
      {/* Mobile filter toggle */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-white/60 text-sm font-medium">
          Results for: {q || 'All'}{zip ? ` near ${zip}` : ''}
        </span>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="flex items-center gap-1.5 text-teal-400 text-sm border border-teal-500/30 px-3 py-1 rounded-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${filtersOpen ? 'block' : 'hidden'} md:block
        w-full md:w-52 lg:w-56 shrink-0 p-4 md:p-5
        border-b md:border-b-0 md:border-r border-white/5
        space-y-5 overflow-y-auto bg-[#07101f]/80 md:bg-transparent
        md:h-full
      `}>
        <div className="hidden md:flex items-center gap-2 text-white/60 text-sm font-medium">
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

        {/* Insurance filter */}
        <div>
          <p className="text-white/50 text-xs mb-2">Insurance</p>
          {selectedTier ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-teal-400 text-xs font-medium">{selectedTier.label}</span>
                <button
                  onClick={() => setSelectedTier(null)}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  Clear
                </button>
              </div>
              <p className="text-white/40 text-xs">{selectedTier.coveragePct}% coverage</p>
              <p className="text-white/40 text-xs">~${selectedTier.avgPremium}/mo</p>
            </div>
          ) : (
            <button
              onClick={() => setInsuranceOpen(o => !o)}
              className="text-teal-400 text-xs flex items-center gap-1 hover:text-teal-300 transition-colors"
            >
              {insuranceOpen ? '− Hide plans' : '+ Use Insurance'}
            </button>
          )}

          {insuranceOpen && !selectedTier && (
            <div className="mt-3 space-y-2">
              {insuranceTiers.length === 0 ? (
                <div className="text-white/30 text-xs">Loading...</div>
              ) : (
                insuranceTiers.map(tier => (
                  <button
                    key={tier.tier}
                    onClick={() => { setSelectedTier(tier); setInsuranceOpen(false); }}
                    className="w-full text-left glass-card p-2.5 hover:border-teal-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white text-xs font-medium">{tier.label}</span>
                      <span className="text-teal-400 text-xs">{tier.coveragePct}%</span>
                    </div>
                    <p className="text-white/40 text-xs">~${tier.avgPremium}/mo</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-24 space-y-4 min-w-0">
        <div className="hidden md:block">
          <h2 className="text-xl font-semibold text-white">
            Results for: {q || 'All care'}{zip ? ` near ${zip}` : ''}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-white/40 text-sm">
              Recommended care: <span className="text-teal-400">{q || 'Primary Care'}</span> · Based on patient recovery data
            </p>
            {selectedTier && (
              <span className="text-xs bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
                {selectedTier.label} · {selectedTier.coveragePct}% covered
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="glass-card p-4 border-red-500/20 text-red-400 text-sm">
            {error} — make sure the backend is running on port 3001.
          </div>
        )}

        {!loading && !error && clinics.length === 0 && (
          <div className="glass-card p-6 text-center text-white/40">
            No clinics found matching your search. Try a different query or increase the distance filter.
          </div>
        )}

        {!loading && !error && topClinic && (
          <>
            {/* Top recommendation banner */}
            <div className="glass-card p-4 border-teal-500/30 bg-teal-500/5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-teal-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">Top Recommendation: {topClinic.name}</p>
                  <p className="text-white/50 text-xs sm:text-sm mt-0.5">{topClinic.patientSummary}</p>
                  {topClinic.highlightTags.length > 0 && (
                    <p className="text-white/40 text-xs mt-1.5 hidden sm:block">
                      Why it's best: {topClinic.highlightTags.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Top clinic — expanded */}
            <ExpandedClinicCard
              clinic={topClinic}
              isComparing={comparing.includes(topClinic.id)}
              onToggleCompare={() => toggleCompare(topClinic.id)}
              insuranceTier={selectedTier}
            />

            {/* Other clinics */}
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

      {/* Sticky compare bar */}
      {comparing.length > 0 && (
        <div className="fixed bottom-0 left-0 md:left-52 lg:left-56 right-0 bg-[#0d1e35]/95 backdrop-blur-md border-t border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white/60 text-xs sm:text-sm truncate">
              Comparing{' '}
              <span className="text-white">
                {allClinics.filter(c => comparing.includes(c.id)).map(c => c.name).join(', ')}
              </span>
            </span>
          </div>
          <button
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
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Adjusted cost after insurance coverage */
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
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {display && <p className="text-teal-400 text-xs mb-1.5">{display}</p>}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-teal-500"
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
  const fullCost = clinic.totalCostEstimate;
  const adjCost = withInsurance(fullCost, insuranceTier);
  const adjPerVisit = withInsurance(clinic.perVisitCost, insuranceTier);

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm sm:text-base">{clinic.name}</span>
          {clinic.badges.bestValue && <span className="badge-teal">Best Value</span>}
        </div>
        <span className="text-white/40 text-sm shrink-0 ml-2">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center border-t border-white/5 pt-4">
        <Stat label="Avg Visits" value={String(clinic.avgVisitsNeeded)} />
        <Stat label="Recovery" value={clinic.recoverySpeed} />
        <Stat label="Outcome" value={clinic.outcomeQuality} />
        <Stat label="Burden" value={clinic.treatmentBurden} badge />
        <div>
          <p className="text-white/40 text-xs mb-1">Est. Cost</p>
          {insuranceTier ? (
            <>
              <p className="font-semibold text-teal-400 text-sm">~${adjCost.toLocaleString()}</p>
              <p className="text-white/30 text-xs line-through">~${fullCost.toLocaleString()}</p>
            </>
          ) : (
            <p className="font-semibold text-white text-sm">~${fullCost.toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-3 border-t border-white/5 gap-3">
        <p className="text-white/40 text-xs sm:text-sm">{clinic.patientSummary}</p>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-white/50 text-sm">
            ${adjPerVisit}/visit
            {insuranceTier && <span className="text-white/30 text-xs ml-1">(w/ ins.)</span>}
          </span>
          <button
            onClick={onToggleCompare}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${
              isComparing ? 'border-teal-500/50 text-teal-400' : 'border-white/20 text-white/60 hover:border-white/40'
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
        <span className="text-white font-medium text-sm">{clinic.name}</span>
        <span className="text-white/40 text-xs">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-xs">Avg Visits</span>
          <StatusBadge
            status={clinic.avgVisitsNeeded <= 5 ? 'low' : 'high'}
            label={String(clinic.avgVisitsNeeded)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-xs">Outcome Quality</span>
          <StatusBadge status={clinic.outcomeQuality} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-xs">Per Visit</span>
          <span className="text-white text-xs">
            ${adjPerVisit}/visit
            {insuranceTier && clinic.perVisitCost !== adjPerVisit && (
              <span className="text-white/30 line-through ml-1">${clinic.perVisitCost}</span>
            )}
          </span>
        </div>
      </div>
      <p className="text-white/30 text-xs mt-3 line-clamp-2">{clinic.patientSummary}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onToggleCompare}
          className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
            isComparing ? 'border-teal-500/50 text-teal-400' : 'border-white/20 text-white/50 hover:border-white/40'
          }`}
        >
          {isComparing ? '✓ Comparing' : 'Compare'}
        </button>
        <button onClick={onViewDetails} className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1">
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
      <p className="text-white/40 text-xs mb-1">{label}</p>
      {badge ? (
        <span className={isBad ? 'badge-red' : 'badge-green'}>{value}</span>
      ) : (
        <p className="font-semibold text-white text-sm capitalize">{value}</p>
      )}
    </div>
  );
}
