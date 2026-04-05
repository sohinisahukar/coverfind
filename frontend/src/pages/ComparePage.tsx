/**
 * ComparePage.tsx — Side-by-side clinic comparison.
 *
 * URL: /compare?ids=clinicA,clinicB
 *
 * "Best value" for this view = lowest totalCostEstimate among the compared
 * clinics (at most one), not the per-row DB badge (many clinics can share it).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Circle, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { fetchCompare, type Clinic } from '../lib/api';

function safeUrl(raw: string | undefined, fallbackName: string): string {
  if (!raw) return `https://www.google.com/search?q=${encodeURIComponent(fallbackName)}`;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    new URL(withProto);
    return withProto;
  } catch {
    return `https://www.google.com/search?q=${encodeURIComponent(fallbackName)}`;
  }
}

const SW = 1.75;

function idOfLowestTotalCost(list: Clinic[]): string | null {
  if (list.length === 0) return null;
  const min = Math.min(...list.map(c => c.totalCostEstimate));
  return list.find(c => c.totalCostEstimate === min)?.id ?? null;
}

export default function ComparePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
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
  /** Max bar height (px) — keep in sync with chart middle track min-height */
  const maxBarPx = 120;
  const barHeight = (cost: number) => Math.round((cost / maxCost) * maxBarPx);
  const costWinnerId = idOfLowestTotalCost(clinics);

  const chartGridCols =
    clinics.length <= 1
      ? 'grid-cols-1'
      : clinics.length === 2
        ? 'grid-cols-2'
        : clinics.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  return (
    <div className="max-w-5xl mx-auto w-full min-w-0 px-4 sm:px-6 py-6 sm:py-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="text-center sm:text-left min-w-0">
          <h1 className="text-xl font-extrabold uppercase leading-[1.28] tracking-tight text-ink sm:text-3xl sm:leading-[1.26]">
            Compare providers
          </h1>
          <p className="mt-1 text-sm text-muted">
            Side-by-side comparison · Best value = lowest total estimated cost in this set
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted text-sm flex items-center justify-center sm:justify-end gap-1 hover:text-ink transition-colors shrink-0"
        >
          <ChevronLeft size={16} strokeWidth={SW} aria-hidden />
          Back to results
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent dark:border-violet-400" />
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border-red-200 bg-red-50/80 text-red-800 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && ids.length === 0 && (
        <div className="glass-card p-6 text-center text-muted">
          No providers selected. Go back to results and select clinics to compare.
        </div>
      )}

      {!loading && !error && ids.length > 0 && (
        <>
          <div
            className={`grid grid-cols-1 gap-4 md:items-stretch ${clinics.length >= 2 ? 'md:grid-cols-2' : ''}`}
          >
            {clinics.map(clinic => (
              <div key={clinic.id} className="min-w-0">
                <ProviderColumn
                  clinic={clinic}
                  isCostWinner={costWinnerId != null && clinic.id === costWinnerId}
                />
              </div>
            ))}
          </div>

          {clinics.length >= 2 && (
            <div className="glass-card p-4 sm:p-5 mt-4 overflow-hidden min-w-0 rounded-2xl">
              <p className="text-muted text-xs text-center mb-3">Estimated total cost</p>
              <div className={`grid w-full ${chartGridCols} gap-3 sm:gap-4`}>
                {clinics.map(c => {
                  const isWin = costWinnerId != null && c.id === costWinnerId;
                  const shortLabel =
                    c.name.length > 36 ? `${c.name.slice(0, 34)}…` : c.name;
                  return (
                    <div key={c.id} className="flex min-w-0 flex-col">
                      <div className="flex min-h-[2.75rem] items-end justify-center px-0.5 pb-1">
                        <span className="text-subtle text-center text-[11px] font-medium leading-snug tabular-nums sm:text-xs">
                          ~${c.totalCostEstimate.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex min-h-[7.5rem] flex-col items-center justify-end border-b border-transparent">
                        <div
                          className={`w-[85%] max-w-[4.5rem] rounded-t-md sm:max-w-[5rem] ${
                            isWin
                              ? 'bg-gradient-brand-t'
                              : 'bg-gradient-to-t from-amber-600 to-amber-400'
                          }`}
                          style={{ height: `${barHeight(c.totalCostEstimate)}px` }}
                        />
                      </div>
                      <div className="flex min-h-[2.75rem] items-start justify-center pt-2.5">
                        <span
                          className="text-muted line-clamp-2 text-center text-[11px] leading-snug sm:text-xs"
                          title={c.name}
                        >
                          {shortLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mx-1 mt-4 border-t border-slate-200 dark:border-slate-700/85" />
            </div>
          )}

          {clinics.length > 0 && (
            <div className={`grid grid-cols-1 gap-3 sm:gap-4 mt-4 ${clinics.length >= 2 ? 'sm:grid-cols-2' : ''}`}>
              {clinics.map(c => (
                <div
                  key={c.id}
                  className="glass-card p-4 sm:p-5 flex flex-col gap-3 min-w-0 overflow-hidden rounded-2xl"
                >
                  <h3 className="text-ink font-semibold text-sm sm:text-base break-words">{c.name}</h3>
                  <p className="text-subtle text-xs sm:text-sm leading-relaxed break-words">{c.patientSummary}</p>
                  {c.website ? (
                    <a
                      href={safeUrl(c.website, c.name)}
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
    </div>
  );
}

function ProviderColumn({ clinic, isCostWinner }: { clinic: Clinic; isCostWinner: boolean }) {
  return (
    <div
      className={`glass-card p-4 sm:p-5 h-full flex flex-col min-w-0 overflow-hidden rounded-2xl ${
        isCostWinner
          ? 'border-violet-400/40 ring-1 ring-violet-500/15 shadow-[inset_3px_0_0_0] shadow-violet-500/45 dark:shadow-violet-400/35'
          : 'border-slate-200/80 dark:border-slate-700/60'
      }`}
    >
      {/* Fixed min-height so both columns share the same divider / metrics baseline even when names wrap differently */}
      <div className="mb-1 flex min-h-[6.75rem] items-start justify-between gap-3 sm:min-h-[7.25rem]">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {isCostWinner ? (
            <div
              className="bg-gradient-brand-br mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
              title="Lowest total estimated cost in this comparison"
            >
              <Stethoscope className="text-white" size={15} strokeWidth={SW} aria-hidden />
            </div>
          ) : (
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300/70 bg-slate-100/60 dark:border-slate-600 dark:bg-slate-800/50"
              title="Compare option"
            >
              <Circle className="text-slate-400 dark:text-slate-500" size={14} strokeWidth={2} aria-hidden />
            </div>
          )}
          <div className="min-h-[5.25rem] min-w-0 flex-1 sm:min-h-[5.75rem]">
            <span className="text-ink text-sm font-semibold leading-snug sm:text-base break-words">{clinic.name}</span>
            {clinic.phone && (
              <span className="text-muted mt-1 block text-xs leading-snug">{clinic.phone}</span>
            )}
          </div>
        </div>
        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted sm:text-sm">
          {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
        </span>
      </div>

      <div className="mb-3 flex min-h-[2rem] items-center border-b border-slate-200/90 pb-2 dark:border-slate-700/85">
        {isCostWinner ? (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-teal-500/35 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200"
            title="Lowest total estimated cost in this comparison"
          >
            <span className="text-teal-600 dark:text-teal-300" aria-hidden>
              ★
            </span>
            Best value
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-transparent select-none" aria-hidden>
            —
          </span>
        )}
      </div>

      <div className="min-w-0 divide-y divide-slate-200/90 dark:divide-slate-700/85">
        <Row label="Avg Visits Needed" value={String(clinic.avgVisitsNeeded)} plain />
        <Row label="Recovery Speed">
          <StatusBadge status={clinic.recoverySpeed} />
        </Row>
        <Row label="Outcome Quality">
          <OutcomeQualityBadge quality={clinic.outcomeQuality} />
        </Row>
        <Row label="Total Cost" value={`~$${clinic.totalCostEstimate.toLocaleString()}`} plain highlight />
        <Row label="Per Visit Cost" value={`$${clinic.perVisitCost}`} plain highlight />
        <Row label="Treatment Burden">
          <StatusBadge status={clinic.treatmentBurden} />
        </Row>
      </div>
    </div>
  );
}

function OutcomeQualityBadge({ quality }: { quality: string }) {
  const map: Record<string, { cls: string; icon: string }> = {
    high: { cls: 'badge-green', icon: '✓' },
    moderate: { cls: 'badge-amber', icon: '~' },
    low: { cls: 'badge-red', icon: '⚠' },
  };
  const { cls, icon } = map[quality] || map.moderate;
  return (
    <span className={`inline-flex items-center justify-center gap-1 min-h-[1.75rem] shrink-0 ${cls}`}>
      <span className="text-xs leading-none shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="leading-tight capitalize">{quality}</span>
    </span>
  );
}

function Row({
  label,
  value,
  children,
  plain,
  highlight,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  plain?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-h-[2.625rem] items-center justify-between gap-3 py-2 min-w-0">
      <span className="shrink-0 text-xs text-muted sm:text-sm">{label}</span>
      <div className="flex min-w-0 justify-end text-right">
        {plain ? (
          <span
            className={`font-semibold tabular-nums text-ink break-all leading-tight ${highlight ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
          >
            {value}
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
