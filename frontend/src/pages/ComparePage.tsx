/**
 * ComparePage.tsx — Side-by-side clinic comparison with decision banner,
 * winner highlighting, animated cost chart, and contact actions.
 *
 * URL: /compare?ids=clinicA,clinicB
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import StatusBadge from '../components/StatusBadge';
import GlowCard from '../components/GlowCard';
import { SpecialtyIcon } from '../components/MedicalIcons';
import { fetchCompare, type Clinic } from '../lib/api';

/* ── helpers ──────────────────────────────────────────────────────────── */

/** Returns index of the "winner" for a given metric (lower = better unless reversed). */
function winnerIdx(clinics: Clinic[], key: keyof Clinic, lowerBetter = true): number | null {
  if (clinics.length < 2) return null;
  const vals = clinics.map(c => c[key]);
  if (vals.some(v => typeof v !== 'number' && typeof v !== 'string')) return null;
  const nums = vals.map(v => {
    if (typeof v === 'number') return v;
    if (v === 'fast' || v === 'high' || v === 'good' || v === 'low') return 0;
    if (v === 'moderate') return 1;
    return 2;
  });
  const best = lowerBetter ? Math.min(...nums) : Math.max(...nums);
  return nums.indexOf(best);
}

function diff(a: number, b: number): string {
  const d = Math.abs(a - b);
  if (d === 0) return 'Same';
  return `$${d.toLocaleString()} less`;
}

/* ── outcome badge ────────────────────────────────────────────────────── */
function OutcomeBadge({ quality }: { quality: string }) {
  const map: Record<string, string> = {
    high: 'badge-green',
    moderate: 'badge-amber',
    low: 'badge-red',
  };
  return <span className={map[quality] || 'badge-amber'}>{quality}</span>;
}

/* ── metric row ───────────────────────────────────────────────────────── */
function MetricRow({
  label,
  clinics,
  render,
  winIdx,
}: {
  label: string;
  clinics: Clinic[];
  render: (c: Clinic) => React.ReactNode;
  winIdx: number | null;
}) {
  return (
    <div
      className="grid border-b border-slate-200/80 dark:border-slate-700/70 last:border-0"
      style={{ gridTemplateColumns: `minmax(90px,110px) repeat(${clinics.length}, 1fr)` }}
    >
      {/* Label cell */}
      <div className="flex items-center px-3 py-3 border-r border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wide leading-tight">{label}</span>
      </div>
      {/* Value cells */}
      {clinics.map((c, i) => (
        <div
          key={c.id}
          className={`flex items-center justify-center gap-1 px-3 py-3 border-r last:border-r-0 border-slate-200/80 dark:border-slate-700/70 ${
            winIdx === i ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
          }`}
        >
          {winIdx === i && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="text-cf-teal shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {render(c)}
        </div>
      ))}
    </div>
  );
}

/* ── animated cost bar ────────────────────────────────────────────────── */
function CostBar({ cost, maxCost, isWinner, name }: { cost: number; maxCost: number; isWinner: boolean; name: string }) {
  const pct = maxCost > 0 ? (cost / maxCost) * 100 : 50;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-sm font-bold ${isWinner ? 'text-cf-teal' : 'text-ink'}`}>
        ~${cost.toLocaleString()}
      </span>
      <div className="relative w-14 sm:w-16 rounded-t-xl overflow-hidden bg-slate-100/60 dark:bg-slate-800/50 flex flex-col justify-end" style={{ height: '120px' }}>
        <motion.div
          className={`w-full rounded-t-xl ${isWinner
            ? 'bg-gradient-to-t from-cf-teal to-teal-300'
            : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500'}`}
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        />
        {isWinner && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2">
            <span className="text-[8px] font-bold text-cf-teal uppercase tracking-wide whitespace-nowrap">Best</span>
          </div>
        )}
      </div>
      <span className="text-xs text-muted text-center max-w-[72px] leading-tight truncate">{name.split(' ')[0]}</span>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */
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

  /* Determine overall winner by composite score — works for 2 or 3 clinics */
  const bestIdx = clinics.length >= 2
    ? clinics.reduce((bi, c, i) => (c.compositeScore ?? 0) > (clinics[bi].compositeScore ?? 0) ? i : bi, 0)
    : 0;
  const best = clinics[bestIdx];
  const other = clinics.find((_, i) => i !== bestIdx) ?? null;

  const costWinIdx = winnerIdx(clinics, 'totalCostEstimate', true);
  const visitsWinIdx = winnerIdx(clinics, 'avgVisitsNeeded', true);

  const costDiffText = clinics.length >= 2
    ? diff(clinics[0].totalCostEstimate, clinics[1].totalCostEstimate)
    : null;

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">

      {/* Back + title row */}
      <div className="flex items-center gap-3 mb-5 sm:mb-7">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted hover:text-ink transition-colors flex items-center gap-1 text-sm shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink leading-tight">Compare Providers</h1>
          <p className="text-muted text-xs sm:text-sm">Side-by-side — best option highlighted</p>
        </div>
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

      {!loading && !error && clinics.length > 0 && (
        <motion.div
          className="space-y-5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* ── Decision banner ── */}
          {clinics.length >= 2 && best && other && (
            <motion.div
              className="glass-card p-4 sm:p-5 bg-top-rec flex flex-col sm:flex-row sm:items-center gap-4"
              variants={{ hidden: { opacity: 0, y: -10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center shrink-0 shadow-sm shadow-teal-500/30">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cf-teal dark:text-teal-400 mb-0.5">Best Overall Value</p>
                  <p className="text-ink font-semibold text-sm sm:text-base">{best.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {best.compositeScore != null && (
                      <span className="text-[10px] font-medium text-teal-800 dark:text-teal-200 bg-teal-100/80 dark:bg-teal-900/40 border border-teal-200/60 dark:border-teal-700/50 rounded-full px-2 py-0.5">
                        {best.compositeScore}/100 match score
                      </span>
                    )}
                    {costDiffText && costDiffText !== 'Same' && (
                      <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/50 rounded-full px-2 py-0.5">
                        {costWinIdx === bestIdx ? costDiffText + ' est. cost' : ''}
                      </span>
                    )}
                    {best.highlightTags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/50 rounded-full px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {other && (
                <div className="shrink-0 text-xs text-muted sm:text-right">
                  <p className="font-medium text-ink">{other.name}</p>
                  <p className="text-[11px]">Alternative option</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Provider header cards ── */}
          <motion.div
            className={`grid gap-4 ${
              clinics.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' :
              clinics.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
          >
            {clinics.map((clinic, i) => {
              const isRecommended = i === bestIdx;
              return (
                <GlowCard key={clinic.id} className="rounded-2xl h-full">
                <div
                  className={`glass-card p-4 sm:p-5 flex flex-col gap-3 h-full ${isRecommended ? 'ring-1 ring-cf-teal/30' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isRecommended
                        ? 'bg-gradient-to-br from-cf-teal to-cf-blue shadow-sm shadow-teal-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                    }`}>
                      <SpecialtyIcon specialty={clinic.specialties?.[0] ?? ''} className={`w-4 h-4 ${isRecommended ? 'text-white' : 'text-ink-muted'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-ink font-semibold text-sm sm:text-base">{clinic.name}</span>
                        {isRecommended && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/50 border border-teal-200/60 dark:border-teal-700/50 rounded-full px-2 py-0.5">
                            Recommended
                          </span>
                        )}
                        {clinic.badges.includes('best-value') && <StatusBadge status="best-value" />}
                      </div>
                      {clinic.phone && (
                        <a href={`tel:${clinic.phone}`} className="text-muted text-xs hover:text-cf-teal transition-colors mt-0.5 block">
                          {clinic.phone}
                        </a>
                      )}
                    </div>
                    <span className="text-muted text-xs shrink-0">
                      {clinic.distanceMiles != null ? `${clinic.distanceMiles} mi` : '—'}
                    </span>
                  </div>

                  <p className="text-subtle text-xs sm:text-sm leading-relaxed">{clinic.patientSummary}</p>

                  {/* Action buttons — always render all 3 rows so cards stay equal height */}
                  <div className="flex flex-col gap-2 mt-auto pt-1">
                    <div className="flex gap-2">
                      <a
                        href={clinic.phone ? `tel:${clinic.phone}` : undefined}
                        className={`flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1.5 ${!clinic.phone ? 'opacity-30 pointer-events-none' : ''}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call
                      </a>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(clinic.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1.5"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Directions
                      </a>
                    </div>
                    <a
                      href={clinic.website ? (/^https?:\/\//i.test(clinic.website) ? clinic.website : `https://${clinic.website}`) : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-opacity ${
                        clinic.website
                          ? (isRecommended ? 'btn-primary' : 'btn-ghost')
                          : 'btn-ghost opacity-30 pointer-events-none'
                      }`}
                    >
                      Visit Website
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
                </GlowCard>
              );
            })}
          </motion.div>

          {/* ── Metric table ── */}
          {clinics.length >= 2 && (
            <motion.div
              className="glass-card overflow-hidden"
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.1, ease: 'easeOut' } } }}
            >
              {/* Column headers — label-first, same grid as MetricRow */}
              <div
                className="grid border-b border-slate-200/80 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-900/40"
                style={{ gridTemplateColumns: `minmax(90px,110px) repeat(${clinics.length}, 1fr)` }}
              >
                <div className="px-3 py-2.5 border-r border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40" />
                {clinics.map((c, i) => (
                  <div key={c.id} className="px-3 py-2.5 text-center border-r last:border-r-0 border-slate-200/80 dark:border-slate-700/70">
                    <p className={`text-xs font-semibold truncate ${bestIdx === i ? 'text-cf-teal' : 'text-ink-muted'}`}>
                      {c.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                  </div>
                ))}
              </div>

              <MetricRow
                label="Avg Visits"
                clinics={clinics}
                winIdx={visitsWinIdx}
                render={c => <span className="font-semibold text-ink text-sm">{c.avgVisitsNeeded}</span>}
              />
              <MetricRow
                label="Recovery"
                clinics={clinics}
                winIdx={winnerIdx(clinics, 'recoverySpeed', true)}
                render={c => <StatusBadge status={c.recoverySpeed} />}
              />
              <MetricRow
                label="Outcome"
                clinics={clinics}
                winIdx={winnerIdx(clinics, 'outcomeQuality', false)}
                render={c => <OutcomeBadge quality={c.outcomeQuality} />}
              />
              <MetricRow
                label="Burden"
                clinics={clinics}
                winIdx={winnerIdx(clinics, 'treatmentBurden', true)}
                render={c => <StatusBadge status={c.treatmentBurden} />}
              />
              <MetricRow
                label="Est. Cost"
                clinics={clinics}
                winIdx={costWinIdx}
                render={c => (
                  <span className={`font-bold text-sm ${costWinIdx !== null && clinics[costWinIdx]?.id === c.id ? 'text-cf-teal' : 'text-ink'}`}>
                    ~${c.totalCostEstimate.toLocaleString()}
                  </span>
                )}
              />
              <MetricRow
                label="Per Visit"
                clinics={clinics}
                winIdx={winnerIdx(clinics, 'perVisitCost', true)}
                render={c => <span className="font-semibold text-ink text-sm">${c.perVisitCost}/visit</span>}
              />
              {clinics.some(c => c.compositeScore != null) && (
                <MetricRow
                  label="Match Score"
                  clinics={clinics}
                  winIdx={winnerIdx(clinics, 'compositeScore', false)}
                  render={c => c.compositeScore != null
                    ? <span className="font-bold text-cf-teal text-sm">{c.compositeScore}<span className="text-muted font-normal text-xs">/100</span></span>
                    : <span className="text-muted text-xs">—</span>}
                />
              )}
            </motion.div>
          )}

          {/* ── Cost chart ── */}
          {clinics.length >= 2 && (
            <motion.div
              className="glass-card p-5 sm:p-6"
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.2, ease: 'easeOut' } } }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-ink">Estimated Total Cost</p>
                {costDiffText && costDiffText !== 'Same' && (
                  <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/40 rounded-full px-2.5 py-1">
                    {costDiffText} with {clinics[costWinIdx ?? 0]?.name.split(' ')[0]}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-center gap-8 sm:gap-12">
                {clinics.map((c, i) => (
                  <CostBar
                    key={c.id}
                    cost={c.totalCostEstimate}
                    maxCost={maxCost}
                    isWinner={i === costWinIdx}
                    name={c.name}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted text-center mt-3">
                Illustrative estimates only — confirm with provider and insurer.
              </p>
            </motion.div>
          )}

          {/* ── Single clinic fallback ── */}
          {clinics.length === 1 && (
            <motion.div
              className="glass-card p-4 sm:p-5"
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
            >
              <div className="divide-y divide-slate-200/90 dark:divide-slate-700/85">
                <Row label="Avg Visits" value={String(clinics[0].avgVisitsNeeded)} />
                <Row label="Recovery Speed"><StatusBadge status={clinics[0].recoverySpeed} /></Row>
                <Row label="Outcome Quality"><OutcomeBadge quality={clinics[0].outcomeQuality} /></Row>
                <Row label="Total Cost" value={`~$${clinics[0].totalCostEstimate.toLocaleString()}`} highlight />
                <Row label="Per Visit" value={`$${clinics[0].perVisitCost}/visit`} highlight />
                <Row label="Treatment Burden"><StatusBadge status={clinics[0].treatmentBurden} /></Row>
              </div>
            </motion.div>
          )}

          {/* ── Bottom nav ── */}
          <div className="flex items-center justify-between mt-1 text-muted text-sm">
            <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-ink transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to results
            </button>
            <button
              type="button"
              onClick={() => navigate(`/compare/summary?ids=${ids.join(',')}`)}
              className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5"
            >
              Summary view
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Row({ label, value, children, highlight }: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-muted text-xs sm:text-sm">{label}</span>
      {value != null
        ? <span className={`font-semibold text-ink ${highlight ? 'text-base sm:text-lg' : ''}`}>{value}</span>
        : children}
    </div>
  );
}
