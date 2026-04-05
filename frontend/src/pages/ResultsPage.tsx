/**
 * ResultsPage.tsx — Clinic search results with sidebar filters.
 *
 * Reads search parameters from the URL (set by HomePage wizard):
 *   q, zip, priority, flow, coverage, providerId, policyId, lat, lng
 *
 * Data flow:
 *   1. Fetches clinics from GET /api/clinics/search (with priorityWeight, lat/lng)
 *   2. Client-side distance filter via the sidebar slider
 *   3. Client-side cost/visits/recovery/outcome/burden filters
 *   4. Optional insurance tier overlay (sidebar) to show adjusted costs
 *   5. Users toggle clinics into a compare set, then navigate to /compare
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  VisitsIcon,
  RecoveryIcon,
  OutcomeIcon,
  BurdenIcon,
  CostIcon,
  MatchIcon,
  SpecialtyIcon,
  DistanceIcon,
} from '../components/MedicalIcons';
import {
  fetchClinics,
  fetchInsuranceProviders,
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

  // --- existing state ---
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<string[]>([]);
  const [distance, setDistance] = useState(50);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);

  // --- new filter state ---
  const [maxCostFilter, setMaxCostFilter] = useState(9999);
  const [visitsFilter, setVisitsFilter] = useState<Set<string>>(new Set());
  const [recoveryFilter, setRecoveryFilter] = useState<Set<string>>(new Set());
  const [outcomeFilter, setOutcomeFilter] = useState<Set<string>>(new Set());
  const [burdenFilter, setBurdenFilter] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'match' | 'cost' | 'visits'>('match');

  // Resolve the insurance context from URL params + provider list.
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
    fetchClinics({ q, priorityWeight: priority, lat, lng, maxDistanceMi: distance })
      .then(data => setClinics(data))
      .catch(err => {
        const msg = (err as Error).message;
        setError(msg);
        toast.error(msg, { duration: 6000 });
      })
      .finally(() => setLoading(false));
  }, [q, priority, lat, lng, distance]);

  const toggleCompare = (id: string) => {
    setComparing(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // --- client-side filtering + sorting ---
  const filteredClinics = useMemo(() => {
    return clinics
      .filter(c => {
        if (c.totalCostEstimate > maxCostFilter && maxCostFilter < 9999) return false;
        if (visitsFilter.size > 0) {
          const bucket =
            c.avgVisitsNeeded <= 2 ? '1-2' : c.avgVisitsNeeded <= 4 ? '3-4' : '5+';
          if (!visitsFilter.has(bucket)) return false;
        }
        if (recoveryFilter.size > 0 && !recoveryFilter.has(c.recoverySpeed)) return false;
        if (outcomeFilter.size > 0 && !outcomeFilter.has(c.outcomeQuality)) return false;
        if (burdenFilter.size > 0 && !burdenFilter.has(c.treatmentBurden)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cost') return a.totalCostEstimate - b.totalCostEstimate;
        if (sortBy === 'visits') return a.avgVisitsNeeded - b.avgVisitsNeeded;
        return (b.compositeScore ?? 0) - (a.compositeScore ?? 0);
      });
  }, [clinics, maxCostFilter, visitsFilter, recoveryFilter, outcomeFilter, burdenFilter, sortBy]);

  const filteredTopClinic = filteredClinics[0];
  const filteredOtherClinics = filteredClinics.slice(1);

  const clearAllFilters = () => {
    setMaxCostFilter(9999);
    setVisitsFilter(new Set());
    setRecoveryFilter(new Set());
    setOutcomeFilter(new Set());
    setBurdenFilter(new Set());
    setSortBy('match');
  };

  const hasActiveFilters =
    maxCostFilter < 9999 ||
    visitsFilter.size > 0 ||
    recoveryFilter.size > 0 ||
    outcomeFilter.size > 0 ||
    burdenFilter.size > 0;

  const sortLabel = sortBy === 'cost' ? 'lowest cost' : sortBy === 'visits' ? 'fewest visits' : 'best match';

  return (
    <div className="flex flex-1 flex-col md:flex-row min-h-0 overflow-hidden">
      {/* Mobile filter toggle bar */}
      <div className="md:hidden flex flex-col gap-1 px-4 py-2 border-b bg-results-mobile-bar">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-muted text-sm font-medium min-w-0 truncate">
            Results for: <span className="text-ink font-semibold">{q || 'All'}</span> near {zip}
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
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-4 h-4 bg-cf-teal text-white rounded-full text-[9px] font-bold">!</span>
            )}
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

      {/* Sidebar */}
      <aside className={`
        ${filtersOpen ? 'block' : 'hidden'} md:block
        w-full md:w-64 lg:w-72 shrink-0 p-4 md:p-5
        border-b md:border-b-0 md:border-r
        space-y-5 overflow-y-auto bg-results-sidebar
        md:h-full
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-cf-teal hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Distance slider */}
        <FilterSlider
          label="Distance"
          value={distance}
          onChange={setDistance}
          min={5}
          max={100}
          display={`Up to ${distance} mi`}
        />

        {/* Cost range */}
        <div>
          <p className="text-muted text-xs mb-1">Max estimated cost</p>
          <p className="text-cf-teal text-xs font-medium mb-1.5">
            {maxCostFilter >= 9999 ? 'Any cost' : `Up to $${maxCostFilter}`}
          </p>
          <input
            type="range"
            min={0}
            max={300}
            step={10}
            value={maxCostFilter >= 9999 ? 300 : maxCostFilter}
            onChange={e => {
              const v = Number(e.target.value);
              setMaxCostFilter(v >= 300 ? 9999 : v);
            }}
            className="w-full accent-cf"
          />
          <div className="flex justify-between text-[10px] text-muted mt-0.5">
            <span>$0</span>
            <span>$300+</span>
          </div>
        </div>

        {/* Visits needed */}
        <CheckboxFilter
          label="Visits needed"
          options={[
            { val: '1-2', label: '1–2 visits' },
            { val: '3-4', label: '3–4 visits' },
            { val: '5+', label: '5+ visits' },
          ]}
          state={visitsFilter}
          onChange={setVisitsFilter}
        />

        {/* Recovery speed */}
        <CheckboxFilter
          label="Recovery speed"
          options={[
            { val: 'fast', label: 'Fast' },
            { val: 'moderate', label: 'Moderate' },
            { val: 'slow', label: 'Longer' },
          ]}
          state={recoveryFilter}
          onChange={setRecoveryFilter}
        />

        {/* Outcome quality */}
        <CheckboxFilter
          label="Outcome quality"
          options={[
            { val: 'high', label: 'High' },
            { val: 'moderate', label: 'Medium' },
            { val: 'low', label: 'Variable' },
          ]}
          state={outcomeFilter}
          onChange={setOutcomeFilter}
        />

        {/* Treatment burden */}
        <CheckboxFilter
          label="Treatment burden"
          options={[
            { val: 'low', label: 'Low' },
            { val: 'moderate', label: 'Medium' },
            { val: 'high', label: 'High' },
          ]}
          state={burdenFilter}
          onChange={setBurdenFilter}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={`px-4 md:px-6 py-4 md:py-6 space-y-4 min-w-0 ${comparing.length > 0 ? 'pb-24' : 'pb-8'}`}>

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <h2 className="text-xl font-semibold text-ink flex items-center gap-2 flex-wrap">
                  {q || 'All care'} near {zip}
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1 text-xs text-cf-teal border border-cf-teal/35 rounded-md px-2 py-0.5 hover:bg-cf-teal/10 transition-colors"
                    title="Edit search"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </h2>
                <p className="text-muted text-sm">
                  Recommended care: <span className="text-cf-teal font-medium">{q || 'Primary Care'}</span> · Based on patient recovery data
                </p>
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
              <div className="flex items-center gap-3 shrink-0">
                {!loading && !error && (
                  <span className="text-sm text-muted font-medium whitespace-nowrap">
                    {filteredClinics.length} provider{filteredClinics.length !== 1 ? 's' : ''} found
                  </span>
                )}
                <button
                  type="button"
                  disabled
                  title="Map view coming soon"
                  className="flex items-center gap-1.5 text-xs text-muted border border-slate-200/80 dark:border-slate-700/60 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-50"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" y1="3" x2="9" y2="18" />
                    <line x1="15" y1="6" x2="15" y2="21" />
                  </svg>
                  Map view
                </button>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-cf-teal border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="glass-card p-4 border-red-200 bg-red-50/80 text-red-800 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error} — check your connection and try again.
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && clinics.length === 0 && (
              <div className="glass-card p-6 text-center text-muted">
                We couldn't find clinics near you for this search. Try broadening your distance or adjusting your search terms.
              </div>
            )}

            {/* Filtered empty state */}
            {!loading && !error && clinics.length > 0 && filteredClinics.length === 0 && (
              <div className="glass-card p-6 text-center space-y-2">
                <p className="text-ink font-medium">No providers match your filters</p>
                <p className="text-muted text-sm">Try relaxing your filter criteria.</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-cf-teal text-sm underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Top Recommendation */}
            {!loading && !error && filteredTopClinic && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                className="glass-card ring-1 ring-cf-teal/30 overflow-hidden"
              >
                {/* Badge */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/40 border border-teal-200/60 dark:border-teal-700/50 rounded-full px-2.5 py-1">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="text-cf-teal">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Top Recommendation
                  </span>
                </div>

                {/* Card body */}
                <div className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* Circle icon */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center shrink-0 shadow-md shadow-teal-500/25">
                    <SpecialtyIcon specialty={filteredTopClinic.specialties?.[0] ?? ''} className="w-6 h-6 text-white" />
                  </div>

                  {/* Clinic info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-ink font-semibold text-base">{filteredTopClinic.name}</span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cf-teal text-white" title="Verified">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {filteredTopClinic.badges.includes('best-value') && (
                        <span className="badge-teal text-[10px]">Best Value</span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-subtle text-sm leading-snug">{filteredTopClinic.patientSummary}</p>

                    {/* Tags */}
                    {filteredTopClinic.highlightTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {filteredTopClinic.highlightTags.map(tag => (
                          <TagPill key={tag} tag={tag} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action column */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success('Provider selected!');
                        navigate(`/compare?ids=${filteredTopClinic.id}`);
                      }}
                      className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      Choose this provider
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleCompare(filteredTopClinic.id)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          comparing.includes(filteredTopClinic.id) ? 'btn-compare-state' : 'btn-compare-idle'
                        }`}
                      >
                        {comparing.includes(filteredTopClinic.id) ? '✓' : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                        Compare
                      </button>
                      {filteredTopClinic.phone && (
                        <a
                          href={`tel:${filteredTopClinic.phone}`}
                          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-muted hover:text-ink transition-colors"
                          title="Call"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.1 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                          </svg>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const addr = encodeURIComponent(`${filteredTopClinic.name} ${filteredTopClinic.zip}`);
                          window.open(`https://maps.google.com/?q=${addr}`, '_blank', 'noopener');
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-muted hover:text-ink transition-colors"
                        title="Directions"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <polygon points="3 11 22 2 13 21 11 13 3 11" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="border-t border-slate-200/90 dark:border-slate-700/85 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
                  {/* Distance */}
                  <MetricCell
                    Icon={DistanceIcon}
                    label="Distance"
                    value={filteredTopClinic.distanceMiles != null ? `${filteredTopClinic.distanceMiles} mi` : '—'}
                  />
                  {/* Avg visits */}
                  <MetricCell
                    Icon={VisitsIcon}
                    label="Avg Visits"
                    value={`${filteredTopClinic.avgVisitsNeeded} visits`}
                  />
                  {/* Recovery */}
                  <MetricCell
                    Icon={RecoveryIcon}
                    label="Recovery"
                    value={filteredTopClinic.recoverySpeed}
                    capitalize
                  />
                  {/* Outcomes */}
                  <MetricCell
                    Icon={OutcomeIcon}
                    label="Outcomes"
                    value={filteredTopClinic.outcomeQuality}
                    capitalize
                  />
                  {/* Burden */}
                  <MetricCell
                    Icon={BurdenIcon}
                    label="Burden"
                    value={filteredTopClinic.treatmentBurden}
                    capitalize
                  />
                  {/* Est. Total Cost */}
                  <TopCostCell clinic={filteredTopClinic} coveragePct={insuranceContext?.coveragePct} />
                  {/* Per visit */}
                  <PerVisitCell clinic={filteredTopClinic} coveragePct={insuranceContext?.coveragePct} />
                  {/* Match score */}
                  {filteredTopClinic.compositeScore != null && (
                    <div className="flex flex-col items-center">
                      <p className="text-muted text-[10px] mb-1 flex items-center gap-1">
                        <MatchIcon className="w-3 h-3 shrink-0" />
                        Match
                      </p>
                      <MatchScoreBar score={filteredTopClinic.compositeScore} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Other great options header + sort */}
            {!loading && !error && filteredOtherClinics.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-ink font-medium text-sm">
                  Other great options{' '}
                  <span className="text-muted font-normal">(sorted by {sortLabel})</span>
                </p>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'match' | 'cost' | 'visits')}
                  className="text-xs border border-slate-200/80 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 bg-white/60 dark:bg-slate-900/60 text-ink focus:outline-none focus:ring-1 focus:ring-cf-teal"
                >
                  <option value="match">Best match</option>
                  <option value="cost">Lowest cost</option>
                  <option value="visits">Fewest visits</option>
                </select>
              </div>
            )}

            {/* Other clinic rows */}
            {!loading && !error && (
              <AnimatePresence>
                {filteredOtherClinics.map((clinic, i) => (
                  <motion.div
                    key={clinic.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.06, ease: 'easeOut' } }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  >
                    <ClinicRow
                      clinic={clinic}
                      isComparing={comparing.includes(clinic.id)}
                      onToggleCompare={() => toggleCompare(clinic.id)}
                      coveragePct={insuranceContext?.coveragePct}
                      filteredTopClinic={filteredTopClinic}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Footer disclaimer */}
            {!loading && !error && filteredClinics.length > 0 && (
              <div className="border-t border-slate-200/90 dark:border-slate-700/85 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted">
                <span>⚡ Estimates are illustrative. Your actual costs may vary. Always confirm with your provider.</span>
                <button
                  type="button"
                  className="hover:text-ink transition-colors whitespace-nowrap"
                  onClick={() => toast('Score = weighted avg of recovery, cost, outcomes, and burden based on your priority.', { icon: 'ℹ️', duration: 5000 })}
                >
                  ℹ️ How we calculate scores →
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Compare bar */}
        <AnimatePresence>
          {comparing.length > 0 && (
            <motion.div
              className="fixed bottom-0 left-0 right-0 md:left-64 lg:left-72 z-20 bg-compare-strip px-4 md:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pt-4 md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } }}
              exit={{ y: 80, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center overflow-hidden shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-muted text-xs sm:text-sm truncate">
                  Comparing{' '}
                  <span className="text-ink font-medium">
                    {clinics.filter((c: Clinic) => comparing.includes(c.id)).map((c: Clinic) => c.name).join(', ')}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Apply insurance coverage discount to a cost. Returns original cost if no tier/coverage is set. */
function withInsurance(cost: number, tier: InsuranceTier | null, coveragePct?: number | null): number {
  const pct = tier?.coveragePct ?? coveragePct;
  if (pct == null) return cost;
  return Math.round(cost * (1 - pct / 100));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSlider({
  label,
  value,
  onChange,
  min,
  max,
  display,
}: {
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

function CheckboxFilter({
  label,
  options,
  state,
  onChange,
}: {
  label: string;
  options: { val: string; label: string }[];
  state: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const toggle = (val: string) => {
    const next = new Set(state);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onChange(next);
  };
  return (
    <div>
      <p className="text-muted text-xs mb-1.5 font-medium">{label}</p>
      {options.map(o => (
        <label key={o.val} className="flex items-center gap-2 py-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.has(o.val)}
            onChange={() => toggle(o.val)}
            className="accent-cf-teal w-3.5 h-3.5"
          />
          <span className="text-sm text-subtle">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  let icon: React.ReactNode;
  const t = tag.toLowerCase();
  if (t.includes('cost') || t.includes('affordable')) {
    icon = (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    );
  } else if (t.includes('fast') || t.includes('recovery')) {
    icon = (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  } else if (t.includes('outcome') || t.includes('top')) {
    icon = (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    );
  } else if (t.includes('visit')) {
    icon = (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
    );
  } else {
    icon = (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-800 dark:text-teal-200 bg-teal-100/80 dark:bg-teal-900/40 border border-teal-200/60 dark:border-teal-700/50 rounded-full px-2 py-0.5">
      {icon}
      {tag}
    </span>
  );
}

function MatchScoreBar({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-cf-teal text-sm leading-none">
        {score}
        <span className="text-muted text-[10px] font-normal">/100</span>
      </span>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 w-16 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cf-teal to-cf-blue rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

function MetricCell({
  Icon,
  label,
  value,
  capitalize,
}: {
  Icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-muted text-[10px] mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0" />
        {label}
      </p>
      <p className={`text-ink font-semibold text-xs ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}

function TopCostCell({
  clinic,
  coveragePct,
}: {
  clinic: Clinic;
  coveragePct?: number | null;
}) {
  const fullCost = clinic.totalCostEstimate;
  const adjCost = withInsurance(fullCost, null, coveragePct);
  const hasDiscount = adjCost !== fullCost;
  const savings = hasDiscount ? fullCost - adjCost : null;

  return (
    <div className="flex flex-col items-center">
      <p className="text-muted text-[10px] mb-1 flex items-center gap-1">
        <CostIcon className="w-3 h-3 shrink-0" />
        Est. Total
      </p>
      <p className="font-bold text-cf-teal text-sm leading-none">
        ~${adjCost.toLocaleString()}
      </p>
      {hasDiscount && savings != null && savings > 0 && (
        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-700/50 rounded-full px-1.5 py-0.5 whitespace-nowrap">
          You save ~${savings}
        </span>
      )}
    </div>
  );
}

function PerVisitCell({
  clinic,
  coveragePct,
}: {
  clinic: Clinic;
  coveragePct?: number | null;
}) {
  const adjPerVisit = withInsurance(clinic.perVisitCost, null, coveragePct);
  const hasDiscount = adjPerVisit !== clinic.perVisitCost;
  return (
    <div className="flex flex-col items-center">
      <p className="text-muted text-[10px] mb-1">Per Visit</p>
      <p className="font-semibold text-ink text-xs leading-none">${adjPerVisit}</p>
      {hasDiscount && (
        <span className="text-[9px] text-muted mt-0.5">w/ plan</span>
      )}
    </div>
  );
}

function ClinicRow({
  clinic,
  isComparing,
  onToggleCompare,
  coveragePct,
  filteredTopClinic,
}: {
  clinic: Clinic;
  isComparing: boolean;
  onToggleCompare: () => void;
  coveragePct?: number | null;
  filteredTopClinic: Clinic | undefined;
}) {
  const fullCost = clinic.totalCostEstimate;
  const adjCost = withInsurance(fullCost, null, coveragePct);
  const adjPerVisit = withInsurance(clinic.perVisitCost, null, coveragePct);
  const hasDiscount = adjCost !== fullCost;
  const savings = hasDiscount ? fullCost - adjCost : null;

  const costDiff =
    filteredTopClinic && clinic.id !== filteredTopClinic.id
      ? clinic.totalCostEstimate - filteredTopClinic.totalCostEstimate
      : 0;

  return (
    <div className="glass-card p-4 flex items-start gap-3 min-w-0">
      {/* Circle icon */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center shrink-0 mt-0.5">
        <SpecialtyIcon specialty={clinic.specialties?.[0] ?? ''} className="w-4.5 h-4.5 text-white" />
      </div>

      {/* Info block */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-ink font-semibold text-sm">{clinic.name}</span>
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cf-teal/20 text-cf-teal" title="Verified">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {clinic.distanceMiles != null && (
            <span className="text-muted text-xs">{clinic.distanceMiles} mi</span>
          )}
        </div>
        <p className="text-muted text-xs line-clamp-2">{clinic.patientSummary}</p>
        {clinic.highlightTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clinic.highlightTags.slice(0, 3).map(tag => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      {/* Cost block */}
      <div className="flex flex-col items-end shrink-0 min-w-[72px] text-right">
        <p className="text-muted text-[10px]">Est. Total</p>
        <p className="font-bold text-ink text-sm">~${adjCost.toLocaleString()}</p>
        {hasDiscount && savings != null && savings > 0 && (
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400">You save ~${savings}</span>
        )}
        {costDiff > 0 && (
          <span className="text-[9px] text-amber-600 dark:text-amber-400">${costDiff} more</span>
        )}
        <p className="text-muted text-[10px] mt-1">Per Visit</p>
        <p className="font-semibold text-ink text-xs">${adjPerVisit}{hasDiscount ? <span className="text-muted font-normal"> w/ plan</span> : null}</p>
      </div>

      {/* Match score block */}
      {clinic.compositeScore != null && (
        <div className="flex flex-col items-center shrink-0 min-w-[52px]">
          <p className="text-muted text-[10px] mb-0.5">Match</p>
          <MatchScoreBar score={clinic.compositeScore} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleCompare}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
            isComparing ? 'btn-compare-state' : 'btn-compare-idle'
          }`}
        >
          {isComparing ? '✓ Comparing' : 'Compare'}
        </button>
        <div className="flex gap-1">
          {clinic.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-muted hover:text-ink transition-colors"
              title="Call"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.1 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              const addr = encodeURIComponent(`${clinic.name} ${clinic.zip}`);
              window.open(`https://maps.google.com/?q=${addr}`, '_blank', 'noopener');
            }}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-muted hover:text-ink transition-colors"
            title="Directions"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  badge,
  Icon,
}: {
  label: string;
  value: string;
  badge?: boolean;
  Icon?: React.FC<{ className?: string }>;
}) {
  const isBad = value === 'high';
  return (
    <div>
      <p className="text-muted text-xs mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 shrink-0" />}
        {label}
      </p>
      {badge ? (
        <span className={isBad ? 'badge-red' : 'badge-green'}>{value}</span>
      ) : (
        <p className="font-semibold text-ink text-sm capitalize">{value}</p>
      )}
    </div>
  );
}

// Re-exported so other files that import Stat don't break (unused locally now but kept for safety)
export { Stat };
