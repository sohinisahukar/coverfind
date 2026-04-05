/**
 * SummaryPage.tsx — Card-grid overview of compared clinics.
 *
 * URL: /compare/summary?ids=clinicA,clinicB
 *
 * Shows each clinic as a self-contained card with key metrics and a
 * "Select" action. Useful as a quick visual scan before diving into
 * the detailed side-by-side on ComparePage.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Award, ChevronRight, CircleDot, Plus, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { fetchCompare, type Clinic } from '../lib/api';

const SW = 1.75;

export default function SummaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    setLoading(true);
    fetchCompare(ids)
      .then(setClinics)
      .catch(err => {
        const msg = (err as Error).message;
        setError(msg);
        toast.error(msg, { duration: 6000 });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('ids')]);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
        <Stethoscope className="mb-3 text-[var(--cf-accent-text)]" size={36} strokeWidth={SW} aria-hidden />
        <h1 className="text-xl font-extrabold uppercase leading-[1.28] tracking-tight text-ink sm:text-3xl sm:leading-[1.26]">
          Comparing providers summary
        </h1>
        <p className="mt-1 text-sm text-muted">Side-by-side overview</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent dark:border-violet-400" />
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border-red-200 bg-red-50/80 text-red-800 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic, i) => (
            <ProviderCard
              key={clinic.id}
              clinic={clinic}
              isTop={i === 0}
              onSelect={() => navigate(`/compare?ids=${ids.join(',')}`)}
            />
          ))}

          <div className="glass-card p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-violet-400/45">
              <Plus className="text-[var(--cf-accent-text)]" size={22} strokeWidth={SW} aria-hidden />
            </div>
            <p className="text-ink font-semibold mb-2 text-sm sm:text-base">Choose Another Provider</p>
            <p className="text-muted text-xs sm:text-sm mb-4">Compare a different provider side-by-side.</p>
            <button type="button" onClick={() => navigate('/results')} className="btn-ghost text-sm py-2 px-4">
              Compare
            </button>
          </div>
        </div>
      )}

      {!loading && !error && clinics.length > 0 && (
        <>
          <div className="flex justify-center mt-6 sm:mt-8">
            <button
              type="button"
              onClick={() => navigate(`/compare?ids=${ids.join(',')}`)}
              className="btn-primary px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base"
            >
              Compare Now
            </button>
          </div>

          <div className="flex justify-end mt-5 sm:mt-6">
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
            >
              Back to results
              <ChevronRight size={16} strokeWidth={SW} aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ProviderCard({ clinic, isTop, onSelect }: { clinic: Clinic; isTop: boolean; onSelect: () => void }) {
  return (
    <div className={`glass-card flex flex-col p-4 sm:p-5 ${isTop ? 'border-violet-400/30 ring-1 ring-violet-500/10' : ''}`}>
      <div className="mb-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {isTop ? (
            <Award className="shrink-0 text-amber-600 dark:text-amber-400" size={18} strokeWidth={SW} aria-hidden />
          ) : (
            <CircleDot className="shrink-0 text-muted" size={18} strokeWidth={SW} aria-hidden />
          )}
          <span className="text-sm font-semibold text-ink sm:text-base">{clinic.name}</span>
          {clinic.badges.includes('best-value') && <StatusBadge status="best-value" />}
          {clinic.badges.includes('high-visits') && <StatusBadge status="high-visits" />}
        </div>
        <p className="text-muted text-xs">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} miles away` : clinic.zip}
        </p>
      </div>

      <div className="divide-y divide-slate-200/90 dark:divide-slate-700/85 flex-1">
        <Row label="Avg Visits" value={String(clinic.avgVisitsNeeded)} />
        <Row label="Recovery Speed"><StatusBadge status={clinic.recoverySpeed} /></Row>
        <Row label="Outcome Quality"><StatusBadge status={clinic.outcomeQuality} /></Row>
        <Row label="Total Cost" value={`~$${clinic.totalCostEstimate.toLocaleString()}`} />
        <Row label="Per Visit Cost"><StatusBadge status={clinic.perVisitCostTier} /></Row>
      </div>

      {clinic.patientSummary && (
        <p className="text-subtle text-xs mt-4 leading-relaxed">{clinic.patientSummary}</p>
      )}

      <button
        type="button"
        onClick={onSelect}
        className={`mt-4 w-full py-2.5 sm:py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
          isTop ? 'btn-primary' : 'btn-ghost'
        }`}
      >
        Select {clinic.name}
        {!isTop && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="row-divider text-xs sm:text-sm">
      <span className="text-muted">{label}</span>
      {value ? <span className="text-ink font-semibold">{value}</span> : children}
    </div>
  );
}
