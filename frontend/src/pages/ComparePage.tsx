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

  // Proportional bar heights (max 110px)
  const maxCost = Math.max(...clinics.map(c => c.totalCostEstimate), 1);
  const barHeight = (cost: number) => Math.round((cost / maxCost) * 110);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Compare Providers</h1>
        <p className="text-white/40 mt-1 text-sm">Side-by-side comparison</p>
      </div>
      <div className="flex justify-end mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-white/40 text-sm flex items-center gap-1 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && ids.length === 0 && (
        <div className="glass-card p-6 text-center text-white/40">
          No providers selected. Go back to results and select clinics to compare.
        </div>
      )}

      {!loading && !error && ids.length > 0 && (
        <>
          {/* Comparison grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {left && <ProviderColumn clinic={left} isRecommended />}
            {right && <ProviderColumn clinic={right} isRecommended={false} />}

            {/* Add another provider slot */}
            <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center text-center border-dashed min-h-[280px]">
              <div className="w-10 h-10 rounded-full border-2 border-teal-500/40 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-teal-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-white font-semibold mb-2">Choose Another Provider</p>
              <p className="text-white/30 text-sm mb-5">Compare a different provider side-by-side.</p>
              <button onClick={() => navigate('/results')} className="btn-ghost text-sm py-2 px-6">
                Compare
              </button>
            </div>
          </div>

          {/* Bottom — recommendation + cost chart */}
          {(left || right) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {left && (
                <div className="glass-card p-4 sm:p-5">
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">Why we recommend this provider</h3>
                  <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{left.patientSummary}</p>
                </div>
              )}

              {/* Cost chart */}
              {left && right && (
                <div className="glass-card p-4 sm:p-5 flex flex-col justify-center">
                  <div className="flex items-end justify-center gap-6 sm:gap-8 h-28 sm:h-32">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-white/50 text-xs">~${left.totalCostEstimate.toLocaleString()}</span>
                      <div
                        className="w-14 sm:w-16 rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400"
                        style={{ height: `${barHeight(left.totalCostEstimate)}px` }}
                      />
                      <span className="text-white/40 text-xs">{left.name.split(' ')[0]}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-white/50 text-xs">~${right.totalCostEstimate.toLocaleString()}</span>
                      <div
                        className="w-14 sm:w-16 rounded-t-lg bg-gradient-to-t from-amber-700 to-amber-500"
                        style={{ height: `${barHeight(right.totalCostEstimate)}px` }}
                      />
                      <span className="text-white/40 text-xs">{right.name.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="border-t border-white/10 mt-3" />
                </div>
              )}
            </div>
          )}

          {/* CTA buttons */}
          {(left || right) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              {left && <button className="btn-primary py-3 sm:py-4 text-sm sm:text-base">Choose {left.name}</button>}
              {right && (
                <button className="btn-ghost py-3 sm:py-4 text-sm sm:text-base flex items-center justify-center gap-2">
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

      {/* Footer links */}
      <div className="flex items-center justify-between mt-5 sm:mt-6 text-white/30 text-sm">
        <button
          onClick={() => navigate(`/compare/summary?ids=${ids.join(',')}`)}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          Summary view
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button onClick={() => navigate('/results')} className="flex items-center gap-1 hover:text-white transition-colors">
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
    <div className={`glass-card p-4 sm:p-5 ${isRecommended ? 'border-teal-500/20' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isRecommended ? (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs shrink-0">⚠</div>
          )}
          <span className="text-white font-semibold text-sm sm:text-base truncate">{clinic.name}</span>
          {clinic.badges.includes('best-value') && <StatusBadge status="best-value" />}
        </div>
        <span className="text-white/40 text-xs sm:text-sm shrink-0 ml-2">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>

      <div className="divide-y divide-white/5">
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
      <span className="text-white/50 text-xs sm:text-sm">{label}</span>
      {plain
        ? <span className={`font-semibold ${highlight ? 'text-white text-base sm:text-lg' : 'text-white'}`}>{value}</span>
        : children}
    </div>
  );
}
