import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';

const PROVIDERS = [
  {
    id: 'prime-motion',
    name: 'PrimeMotion Rehab',
    distance: 21.2,
    badges: [{ status: 'best-value' as const, label: 'Best Value' }],
    icon: 'trophy',
    avgVisits: 4,
    recoverySpeed: 'fast' as const,
    outcomeQuality: 'high' as const,
    totalCost: 1200,
    perVisitCostTier: 'low' as const,
    summary: 'PrimeMotion Rehab has fewer required visits, faster recovery, and lower overall costs compared to HopeCare Clinic.',
    cta: 'Select PrimeMotion Rehab',
    ctaStyle: 'primary',
  },
  {
    id: 'hopecare',
    name: 'HopeCare Clinic',
    distance: 1.3,
    badges: [{ status: 'high-visits' as const, label: 'High Visits' }],
    icon: 'warning',
    avgVisits: 10,
    recoverySpeed: 'slow' as const,
    outcomeQuality: 'moderate' as const,
    totalCost: 2000,
    perVisitCostTier: 'high' as const,
    summary: null,
    cta: 'Select HopeCare Clinic',
    ctaStyle: 'ghost',
  },
];

export default function SummaryPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Comparing Providers Summary</h1>
        <p className="text-white/40 mt-1 text-sm">Knee Pain · Physical Therapy · 60616</p>
      </div>

      {/* Cards — 1 col mobile, 2 col sm, 3 col lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map(p => (
          <ProviderCard key={p.id} provider={p} />
        ))}

        {/* Add provider slot */}
        <div className="glass-card p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500/40 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-teal-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-2 text-sm sm:text-base">Choose Another Provider</p>
          <p className="text-white/30 text-xs sm:text-sm mb-4">Compare a different provider side-by-side.</p>
          <button onClick={() => navigate('/results')} className="btn-ghost text-sm py-2 px-4">Compare</button>
        </div>
      </div>

      <div className="flex justify-center mt-6 sm:mt-8">
        <button onClick={() => navigate('/compare')} className="btn-primary px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base">
          Compare Now
        </button>
      </div>

      <div className="flex justify-end mt-5 sm:mt-6">
        <button onClick={() => navigate('/results')} className="text-white/30 text-sm flex items-center gap-1 hover:text-white transition-colors">
          Back to results
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type Provider = typeof PROVIDERS[0];

function ProviderCard({ provider: p }: { provider: Provider }) {
  const navigate = useNavigate();

  return (
    <div className={`glass-card p-4 sm:p-5 flex flex-col ${p.ctaStyle === 'primary' ? 'border-teal-500/20' : ''}`}>
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {p.icon === 'trophy' && <span className="text-amber-400">🏆</span>}
          {p.icon === 'warning' && <span className="text-amber-400 text-sm">⚠</span>}
          <span className="text-white font-semibold text-sm sm:text-base">{p.name}</span>
          {p.badges.map(b => <StatusBadge key={b.label} status={b.status} />)}
        </div>
        <p className="text-white/30 text-xs">{p.distance} miles away</p>
      </div>

      <div className="divide-y divide-white/5 flex-1">
        <Row label="Avg Visits" value={String(p.avgVisits)} />
        <Row label="Recovery Speed"><StatusBadge status={p.recoverySpeed} /></Row>
        <Row label="Outcome Quality"><StatusBadge status={p.outcomeQuality} /></Row>
        <Row label="Total Cost" value={`~$${p.totalCost.toLocaleString()}`} />
        <Row label="Per Visit Cost"><StatusBadge status={p.perVisitCostTier} /></Row>
      </div>

      {p.summary && (
        <p className="text-white/40 text-xs mt-4 leading-relaxed">{p.summary}</p>
      )}

      <button
        onClick={() => navigate('/compare')}
        className={`mt-4 w-full py-2.5 sm:py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
          p.ctaStyle === 'primary' ? 'btn-primary' : 'btn-ghost'
        }`}
      >
        {p.cta}
        {p.ctaStyle === 'ghost' && (
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
      <span className="text-white/50">{label}</span>
      {value ? <span className="text-white font-semibold">{value}</span> : children}
    </div>
  );
}
