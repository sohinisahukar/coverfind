/**
 * ComparePage.tsx — Side-by-side clinic comparison.
 *
 * URL: /compare?ids=clinicA,clinicB
 *
 * Fetches the requested clinics via GET /api/clinics/compare?ids=...
 * and renders them in a responsive grid (1-col on mobile, 2-col on desktop).
 *
 * Each clinic card shows key metrics (visits, recovery, outcome, cost, burden)
 * with a cost bar chart when 2+ clinics are present.
 *
 * Note: Outcome quality uses a custom badge (high=green/good, low=red/bad)
 * because the generic StatusBadge treats "high" as bad (correct for burden,
 * wrong for outcome quality).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { fetchCompare, type Clinic } from '../lib/api';

export default function ComparePage() {
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

  const maxCost = Math.max(...clinics.map(c => c.totalCostEstimate), 1);
  const barHeight = (cost: number) => Math.round((cost / maxCost) * 110);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Compare Providers</h1>
        <p className="text-muted mt-1 text-sm">Side-by-side comparison</p>
      </div>
      <div className="flex justify-end mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-muted text-sm flex items-center gap-1 hover:text-ink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cf-teal border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border-red-200 bg-red-50/80 text-red-800 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{error}</div>
      )}

      {!loading && !error && ids.length === 0 && (
        <div className="glass-card p-6 text-center text-muted">
          No providers selected. Go back to results and select clinics to compare.
        </div>
      )}

      {!loading && !error && ids.length > 0 && (
        <>
          <div className={`grid grid-cols-1 gap-4 ${clinics.length >= 2 ? 'md:grid-cols-2' : ''}`}>
            {clinics.map((clinic, i) => (
              <ProviderColumn key={clinic.id} clinic={clinic} isRecommended={i === 0} />
            ))}
          </div>

          {clinics.length >= 2 && (
            <div className="glass-card p-4 sm:p-5 flex flex-col justify-center mt-4">
              <div className="flex items-end justify-center gap-6 sm:gap-8 h-28 sm:h-32">
                {clinics.map((c, i) => (
                  <div key={c.id} className="flex flex-col items-center gap-1.5">
                    <span className="text-subtle text-xs font-medium">~${c.totalCostEstimate.toLocaleString()}</span>
                    <div
                      className={`w-14 sm:w-16 rounded-t-lg ${i === 0 ? 'bg-gradient-to-t from-cf-blue to-cf-teal' : 'bg-gradient-to-t from-amber-600 to-amber-400'}`}
                      style={{ height: `${barHeight(c.totalCostEstimate)}px` }}
                    />
                    <span className="text-muted text-xs">{c.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700/85 mt-3" />
            </div>
          )}

          {clinics.length > 0 && (
            <div className={`grid grid-cols-1 gap-3 sm:gap-4 mt-4 ${clinics.length >= 2 ? 'sm:grid-cols-2' : ''}`}>
              {clinics.map(c => (
                <div key={c.id} className="glass-card p-4 sm:p-5 flex flex-col gap-3">
                  <h3 className="text-ink font-semibold text-sm sm:text-base">{c.name}</h3>
                  <p className="text-subtle text-xs sm:text-sm leading-relaxed">{c.patientSummary}</p>
                  {c.website ? (
                    <a
                      href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary py-2.5 text-sm text-center"
                    >
                      Visit Website
                    </a>
                  ) : (
                    <p className="text-muted text-xs italic">Website not available for this clinic</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-end mt-5 sm:mt-6 text-muted text-sm">
        <button type="button" onClick={() => navigate('/results')} className="flex items-center gap-1 hover:text-ink transition-colors">
          Back to results
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ProviderColumn({ clinic, isRecommended }: { clinic: Clinic; isRecommended: boolean }) {
  return (
    <div className={`glass-card p-4 sm:p-5 ${isRecommended ? 'border-cf-teal/30 ring-1 ring-cf-teal/10' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isRecommended ? (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center overflow-hidden shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 text-xs shrink-0 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300">⚠</div>
          )}
          <div className="min-w-0">
            <span className="text-ink font-semibold text-sm sm:text-base truncate block">{clinic.name}</span>
            {clinic.phone && <span className="text-muted text-xs">{clinic.phone}</span>}
          </div>
          {clinic.badges.includes('best-value') && <StatusBadge status="best-value" />}
        </div>
        <span className="text-muted text-xs sm:text-sm shrink-0 ml-2">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>

      <div className="divide-y divide-slate-200/90 dark:divide-slate-700/85">
        <Row label="Avg Visits Needed" value={String(clinic.avgVisitsNeeded)} plain />
        <Row label="Recovery Speed"><StatusBadge status={clinic.recoverySpeed} /></Row>
        <Row label="Outcome Quality"><OutcomeQualityBadge quality={clinic.outcomeQuality} /></Row>
        <Row label="Total Cost" value={`~$${clinic.totalCostEstimate.toLocaleString()}`} plain highlight />
        <Row label="Per Visit Cost" value={`$${clinic.perVisitCost}`} plain highlight />
        <Row label="Treatment Burden"><StatusBadge status={clinic.treatmentBurden} /></Row>
      </div>
    </div>
  );
}

function OutcomeQualityBadge({ quality }: { quality: string }) {
  const map: Record<string, { cls: string; icon: string }> = {
    high:     { cls: 'badge-green', icon: '✓' },
    moderate: { cls: 'badge-amber', icon: '~' },
    low:      { cls: 'badge-red',   icon: '⚠' },
  };
  const { cls, icon } = map[quality] || map.moderate;
  return <span className={cls}>{icon} {quality}</span>;
}

function Row({ label, value, children, plain, highlight }: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  plain?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-muted text-xs sm:text-sm">{label}</span>
      {plain
        ? <span className={`font-semibold text-ink ${highlight ? 'text-base sm:text-lg' : ''}`}>{value}</span>
        : children}
    </div>
  );
}
