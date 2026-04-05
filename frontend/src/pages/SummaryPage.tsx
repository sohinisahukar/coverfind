import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { fetchCompare, type Clinic } from '../lib/api';

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
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Comparing Providers Summary</h1>
        <p className="text-muted mt-1 text-sm">Side-by-side overview</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cf-teal border-t-transparent rounded-full animate-spin" />
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
            <div className="w-10 h-10 rounded-full border-2 border-cf-teal/40 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-cf-teal">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
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
            <button type="button" onClick={() => navigate('/results')} className="text-muted text-sm flex items-center gap-1 hover:text-ink transition-colors">
              Back to results
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ProviderCard({ clinic, isTop, onSelect }: { clinic: Clinic; isTop: boolean; onSelect: () => void }) {
  return (
    <div className={`glass-card p-4 sm:p-5 flex flex-col ${isTop ? 'border-cf-teal/30 ring-1 ring-cf-teal/10' : ''}`}>
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {isTop
            ? <span className="text-amber-600 dark:text-amber-400" aria-hidden>🏆</span>
            : <span className="text-amber-600 text-sm dark:text-amber-400" aria-hidden>⚠</span>}
          <span className="text-ink font-semibold text-sm sm:text-base">{clinic.name}</span>
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
