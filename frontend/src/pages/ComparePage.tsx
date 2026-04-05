import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('ids')]);

  const left = clinics[0];
  const right = clinics[1];

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {left && <ProviderColumn clinic={left} isRecommended />}
            {right && <ProviderColumn clinic={right} isRecommended={false} />}

            <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center text-center border-dashed border-slate-300 dark:border-slate-600 min-h-[280px]">
              <div className="w-10 h-10 rounded-full border-2 border-cf-teal/40 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-cf-teal">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-ink font-semibold mb-2">Choose Another Provider</p>
              <p className="text-muted text-sm mb-5">Compare a different provider side-by-side.</p>
              <button onClick={() => navigate('/results')} className="btn-ghost text-sm py-2 px-6">
                Compare
              </button>
            </div>
          </div>

          {(left || right) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {left && (
                <div className="glass-card p-4 sm:p-5">
                  <h3 className="text-ink font-semibold mb-2 text-sm sm:text-base">Why we recommend this provider</h3>
                  <p className="text-subtle text-xs sm:text-sm leading-relaxed">{left.patientSummary}</p>
                </div>
              )}

              {left && right && (
                <div className="glass-card p-4 sm:p-5 flex flex-col justify-center">
                  <div className="flex items-end justify-center gap-6 sm:gap-8 h-28 sm:h-32">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-subtle text-xs font-medium">~${left.totalCostEstimate.toLocaleString()}</span>
                      <div
                        className="w-14 sm:w-16 rounded-t-lg bg-gradient-to-t from-cf-blue to-cf-teal"
                        style={{ height: `${barHeight(left.totalCostEstimate)}px` }}
                      />
                      <span className="text-muted text-xs">{left.name.split(' ')[0]}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-subtle text-xs font-medium">~${right.totalCostEstimate.toLocaleString()}</span>
                      <div
                        className="w-14 sm:w-16 rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400"
                        style={{ height: `${barHeight(right.totalCostEstimate)}px` }}
                      />
                      <span className="text-muted text-xs">{right.name.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700/85 mt-3" />
                </div>
              )}
            </div>
          )}

          {(left || right) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              {left && <button type="button" className="btn-primary py-3 sm:py-4 text-sm sm:text-base">Choose {left.name}</button>}
              {right && (
                <button type="button" className="btn-ghost py-3 sm:py-4 text-sm sm:text-base flex items-center justify-center gap-2">
                  Choose {right.name}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between mt-5 sm:mt-6 text-muted text-sm">
        <button
          type="button"
          onClick={() => navigate(`/compare/summary?ids=${ids.join(',')}`)}
          className="flex items-center gap-1 hover:text-ink transition-colors"
        >
          Summary view
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
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
          <span className="text-ink font-semibold text-sm sm:text-base truncate">{clinic.name}</span>
          {clinic.badges.includes('best-value') && <StatusBadge status="best-value" />}
        </div>
        <span className="text-muted text-xs sm:text-sm shrink-0 ml-2">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>

      <div className="divide-y divide-slate-200/90 dark:divide-slate-700/85">
        <Row label="Avg Visits Needed" value={String(clinic.avgVisitsNeeded)} plain />
        <Row label="Recovery Speed"><StatusBadge status={clinic.recoverySpeed} /></Row>
        <Row label="Outcome Quality"><StatusBadge status={clinic.outcomeQuality} /></Row>
        <Row label="Total Cost" value={`~$${clinic.totalCostEstimate.toLocaleString()}`} plain highlight />
        <Row label="Per Visit Cost" value={`$${clinic.perVisitCost}`} plain highlight />
        <Row label="Treatment Burden"><StatusBadge status={clinic.treatmentBurden} /></Row>
      </div>
    </div>
  );
}

function Row({ label, value, children, plain, highlight }: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  plain?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="row-divider">
      <span className="text-muted text-xs sm:text-sm">{label}</span>
      {plain
        ? <span className={`font-semibold text-ink ${highlight ? 'text-base sm:text-lg' : ''}`}>{value}</span>
        : children}
    </div>
  );
}
