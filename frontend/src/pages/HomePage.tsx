/**
 * HomePage.tsx — Multi-step search wizard.
 *
 * Flow:  basics (query + ZIP) -> insurance prompt -> provider -> policy -> finalize
 *
 * All data is fetched from the backend APIs:
 *   - Insurance providers: GET /api/insurance/providers
 *   - Quick-search tags:   GET /api/clinics/recommendations
 *   - ZIP geocoding:       external zippopotam.us API (see api.ts)
 *
 * On submit, builds a query-string URL and navigates to /results.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  HeartPulse,
  MapPin,
  Search,
  Sparkles,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Stethoscope,
} from 'lucide-react';
import PlanSelect from '../components/PlanSelect';

const SW = 1.75;
import { fetchInsuranceProviders, fetchRecommendations, zipToCoords, type InsuranceProvider } from '../lib/api';

const FALLBACK_QUICK_TAGS = ['Physical Therapy', 'Dental Cleaning', 'Skin Rash', 'Urgent Care'];

type Step = 'basics' | 'insurance-prompt' | 'provider' | 'policy' | 'finalize';

function progressPct(step: Step, useInsurance: boolean | null): number {
  if (step === 'basics') return 14;
  if (step === 'insurance-prompt') {
    if (useInsurance === false) return 52;
    if (useInsurance === true) return 34;
    return 30;
  }
  if (useInsurance === false) {
    if (step === 'finalize') return 100;
    return 40;
  }
  if (useInsurance === true) {
    if (step === 'provider') return 48;
    if (step === 'policy') return 70;
    if (step === 'finalize') return 100;
  }
  return 14;
}

const STEP_TITLES: Record<Exclude<Step, 'basics'>, string> = {
  'insurance-prompt': 'Insurance (optional)',
  provider: 'Your insurer',
  policy: 'Your plan',
  finalize: 'Preferences before search',
};

function StepHeadingIcon({ step }: { step: Exclude<Step, 'basics'> }) {
  const cls = 'mt-0.5 shrink-0 text-[var(--cf-accent-text)]';
  const common = { className: cls, size: 22 as const, strokeWidth: SW, 'aria-hidden': true as const };
  switch (step) {
    case 'insurance-prompt':
      return <ShieldCheck {...common} />;
    case 'provider':
      return <Building2 {...common} />;
    case 'policy':
      return <ClipboardList {...common} />;
    case 'finalize':
      return <SlidersHorizontal {...common} />;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('basics');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [useInsuranceDetails, setUseInsuranceDetails] = useState<boolean | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [quickTags, setQuickTags] = useState<string[]>(FALLBACK_QUICK_TAGS);

  useEffect(() => {
    fetchRecommendations()
      .then(data => {
        if (data.quickTags?.length) setQuickTags(data.quickTags);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProvidersLoading(true);
    setProvidersError(null);
    fetchInsuranceProviders()
      .then(data => {
        if (!cancelled) {
          setProviders(data);
          setProvidersError(data.length === 0 ? 'No insurers are available right now. Please try again later.' : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviders([]);
          setProvidersError('We couldn’t load insurers. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvider = useMemo(
    () => (providerId ? providers.find(p => p.id === providerId) : undefined),
    [providerId, providers],
  );

  const selectedPolicy = useMemo(() => {
    if (!selectedProvider || !policyId) return undefined;
    return selectedProvider.policies.find(p => p.id === policyId);
  }, [selectedProvider, policyId]);

  const priorityForApi = 100 - sliderValue;

  const buildResultsUrl = async (q: string, zip: string) => {
    const z = zip.trim() || '60616';
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('zip', z);
    params.set('priority', String(priorityForApi));
    if (useInsuranceDetails && providerId && policyId) {
      params.set('flow', 'insurance');
      params.set('providerId', providerId);
      params.set('policyId', policyId);
      params.set('coverage', String(sliderValue));
    } else {
      params.set('flow', 'cash');
      params.set('costFocus', String(sliderValue));
    }
    if (/^\d{5}$/.test(z.trim())) {
      const coords = await zipToCoords(z.trim());
      if (coords) {
        params.set('lat', String(coords.lat));
        params.set('lng', String(coords.lng));
      }
    }
    return `/results?${params.toString()}`;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    navigate(await buildResultsUrl(query.trim(), location.trim()));
  };

  const goBasics = () => {
    setStep('basics');
    setUseInsuranceDetails(null);
    setProviderId(null);
    setPolicyId(null);
  };

  const goInsurancePrompt = () => {
    if (!query.trim()) return;
    setStep('insurance-prompt');
  };

  const chooseInsurancePath = (yes: boolean) => {
    setUseInsuranceDetails(yes);
    if (yes) {
      setProviderId(null);
      setPolicyId(null);
      setStep('provider');
    } else {
      setProviderId(null);
      setPolicyId(null);
      setStep('finalize');
    }
  };

  const selectProvider = (p: InsuranceProvider) => {
    setProviderId(p.id);
    setPolicyId(null);
    setStep('policy');
  };

  const selectPolicy = (id: string) => {
    setPolicyId(id);
    setStep('finalize');
  };

  const quickNavigate = async (tag: string) => {
    setQuery(tag);
    const z = location.trim() || '60616';
    const params = new URLSearchParams();
    params.set('q', tag);
    params.set('zip', z);
    params.set('priority', '50');
    params.set('flow', 'cash');
    params.set('costFocus', '50');
    if (/^\d{5}$/.test(z.trim())) {
      const coords = await zipToCoords(z.trim());
      if (coords) {
        params.set('lat', String(coords.lat));
        params.set('lng', String(coords.lng));
      }
    }
    navigate(`/results?${params.toString()}`);
  };

  const pct = progressPct(step, useInsuranceDetails);

  return (
    <div className="flex w-full min-h-full flex-1 flex-col items-center px-4 pb-16 pt-10 sm:pb-20 sm:pt-12">
      <header className="animate-fade-up mx-auto mb-10 max-w-3xl text-center sm:mb-12">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.32em] text-link-brand opacity-90">
          Care search · signals &amp; trade-offs
        </p>
        <div className="relative mb-6 flex justify-center" aria-hidden>
          <div className="hero-icon-glow absolute h-28 w-28 animate-icon-breathe rounded-full blur-2xl motion-reduce:animate-none" />
          <HeartPulse
            className="relative z-[1] text-[var(--cf-accent-text)] drop-shadow-[0_4px_14px_color-mix(in_srgb,var(--cf-brand-a)_45%,transparent)]"
            size={48}
            strokeWidth={SW}
          />
        </div>
        <h1 className="mb-4 text-balance text-2xl font-extrabold uppercase leading-[1.22] tracking-tight text-ink sm:text-4xl sm:leading-[1.2] lg:text-[2.85rem] lg:leading-[1.18]">
          Find care that&apos;s{' '}
          <span className="text-gradient-brand">right for you</span>.
        </h1>
        <p className="mx-auto max-w-2xl px-1 text-base font-normal leading-[1.65] text-ink-muted sm:text-lg sm:leading-[1.7]">
          Real-world recovery and cost signals — so your search feels less like a directory and more like a{' '}
          <span className="font-medium text-ink dark:text-slate-200">head start</span>.
        </p>
        <a
          href="#search-wizard"
          className="text-link-brand mt-6 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
        >
          Build your search
          <ChevronDown size={18} strokeWidth={SW} className="opacity-90" aria-hidden />
        </a>
      </header>

      <div className="animate-fade-up mb-4 w-full max-w-xl text-center sm:max-w-2xl sm:text-left" style={{ animationDelay: '45ms' }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-link-brand opacity-90">
          Where to begin
        </p>
        <h2 className="mt-1.5 text-xl font-extrabold uppercase leading-[1.3] tracking-tight text-ink sm:text-2xl sm:leading-[1.28]">
          Shape your search
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted sm:text-base">
          A short wizard — then ranked results you can compare on what matters to you.
        </p>
      </div>

      <div
        id="search-wizard"
        className="glass-card glass-card-hover w-full max-w-xl scroll-mt-24 animate-fade-up rounded-3xl sm:max-w-2xl"
        style={{ animationDelay: '75ms' }}
      >
        <div className="h-1 w-full overflow-hidden rounded-t-2xl bg-slate-200/90 dark:bg-slate-700/80">
          <div
            className="bg-gradient-brand-x h-full rounded-r-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {step !== 'basics' && query.trim() && (
            <div className="mb-5 flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-600/70 dark:bg-slate-950/40">
              <div className="min-w-0 text-left">
                <p className="text-link-brand text-[10px] font-semibold uppercase tracking-wide">Your search</p>
                <p className="truncate text-sm font-medium text-ink">
                  {query}
                  <span className="font-normal text-muted"> · </span>
                  <span className="text-muted">{location.trim() || 'Add ZIP in previous step'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={goBasics}
                className="shrink-0 self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 sm:self-center"
              >
                Edit search
              </button>
            </div>
          )}

          {step !== 'basics' && (
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-700/70">
              <div className="flex min-w-0 items-start gap-2.5">
                <StepHeadingIcon step={step} />
                <div className="min-w-0">
                  <p className="text-link-brand text-[10px] font-semibold uppercase tracking-wider opacity-90">Next</p>
                  <h2 className="text-lg font-semibold leading-[1.38] text-ink sm:text-xl">{STEP_TITLES[step]}</h2>
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted">{Math.round(pct)}%</span>
            </div>
          )}

          <div className="space-y-5 text-left">
            {step === 'basics' && (
              <>
                <div className="border-b border-slate-200/80 pb-4 dark:border-slate-700/70">
                  <p className="text-link-brand text-[10px] font-semibold uppercase tracking-wider opacity-90">Step 1</p>
                  <h2 className="flex items-center gap-2 text-xl font-semibold leading-[1.35] tracking-tight text-ink sm:text-2xl">
                    <Stethoscope className="shrink-0 text-[var(--cf-accent-text)]" size={24} strokeWidth={SW} aria-hidden />
                    Search for care
                  </h2>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="home-q" className="mb-1.5 block text-xs font-semibold text-ink">
                      What do you need care for?
                    </label>
                    <div className="relative">
                      <input
                        id="home-q"
                        type="text"
                        autoComplete="off"
                        placeholder="e.g. knee pain, urgent care"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && goInsurancePrompt()}
                        className="home-search-input pr-10"
                      />
                      {query.trim() ? (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setQuery('')}
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : (
                        <Search
                          className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500"
                          strokeWidth={SW}
                          aria-hidden
                        />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 sm:w-60 lg:w-64">
                    <label htmlFor="home-loc" className="mb-1.5 block text-xs font-semibold text-ink">
                      Location or ZIP code
                    </label>
                    <div className="relative">
                      <input
                        id="home-loc"
                        type="text"
                        autoComplete="postal-code"
                        placeholder="City or ZIP"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="home-search-input pr-10"
                      />
                      <MapPin
                        className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        strokeWidth={SW}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-center pt-2 sm:pt-3">
                  <button
                    type="button"
                    onClick={goInsurancePrompt}
                    disabled={!query.trim()}
                    className="btn-primary px-8 py-2.5 text-sm sm:text-base disabled:opacity-45"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'insurance-prompt' && (
              <>
                <button
                  type="button"
                  onClick={goBasics}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1"
                >
                  <ChevronLeft size={18} strokeWidth={SW} aria-hidden />
                  Back
                </button>
                <p className="text-subtle text-sm sm:text-base leading-relaxed">
                  Add your insurance so we can factor <span className="text-ink font-medium">estimated</span> coverage into
                  ranking. You can skip this for a cash-pay style search.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => chooseInsurancePath(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-violet-400/45 bg-violet-50/70 py-3.5 px-4 text-sm font-semibold text-ink transition-colors hover:border-violet-500/55 dark:border-violet-500/40 dark:bg-violet-950/35 dark:hover:border-violet-400/60"
                  >
                    <ShieldCheck className="shrink-0 text-[var(--cf-accent-text)]" size={20} strokeWidth={SW} aria-hidden />
                    Yes, add insurance
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseInsurancePath(false)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-3.5 px-4 text-sm font-medium text-ink transition-colors hover:bg-slate-100/80 dark:border-slate-600 dark:hover:bg-slate-800/50"
                  >
                    <ShieldOff className="shrink-0 text-muted" size={20} strokeWidth={SW} aria-hidden />
                    No, skip for now
                  </button>
                </div>
              </>
            )}

            {step === 'provider' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('insurance-prompt')}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1"
                >
                  <ChevronLeft size={18} strokeWidth={SW} aria-hidden />
                  Back
                </button>
                {/* Insurers: GET /api/insurance/providers — do not surface file paths or data filenames in UI */}
                <p className="flex items-start gap-2 text-sm text-subtle">
                  <Building2 className="mt-0.5 shrink-0 text-[var(--cf-accent-text)]" size={18} strokeWidth={SW} aria-hidden />
                  <span>Choose the company that issues your health plan.</span>
                </p>
                {providersLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-14 rounded-xl bg-slate-200/80 dark:bg-slate-700/50" />
                    ))}
                  </div>
                )}
                {!providersLoading && providersError && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl px-3 py-2">
                    {providersError}
                  </p>
                )}
                {!providersLoading && !providersError && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[min(50vh,20rem)] overflow-y-auto pr-1 -mr-1">
                    {[...providers].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectProvider(p)}
                          className="w-full rounded-xl border border-slate-200/90 bg-white/40 px-4 py-3.5 text-left text-sm font-medium text-ink transition-all hover:border-violet-400/45 hover:bg-violet-50/40 dark:border-slate-600/80 dark:bg-slate-950/20 dark:hover:border-violet-500/35 dark:hover:bg-violet-950/25"
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {step === 'policy' && selectedProvider && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPolicyId(null);
                    setStep('provider');
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1"
                >
                  <ChevronLeft size={18} strokeWidth={SW} aria-hidden />
                  Back
                </button>
                <p className="flex items-start gap-2 text-sm text-subtle">
                  <ClipboardList className="mt-0.5 shrink-0 text-[var(--cf-accent-text)]" size={18} strokeWidth={SW} aria-hidden />
                  <span>
                    Plans for <span className="font-semibold text-ink">{selectedProvider.name}</span>
                  </span>
                </p>
                <PlanSelect
                  label="Select your plan"
                  policies={selectedProvider.policies}
                  value={policyId}
                  onSelect={selectPolicy}
                />
              </>
            )}

            {step === 'finalize' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    useInsuranceDetails ? setStep('policy') : setStep('insurance-prompt')
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1"
                >
                  <ChevronLeft size={18} strokeWidth={SW} aria-hidden />
                  Back
                </button>

                {useInsuranceDetails && selectedPolicy && (
                  <div className="flex flex-wrap gap-2">
                    <span className="badge-teal text-xs">{selectedProvider?.name}</span>
                    <span className="rounded-full border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs text-ink-muted dark:text-slate-300">
                      {selectedPolicy.name}
                    </span>
                  </div>
                )}

                {!useInsuranceDetails && (
                  <p className="text-sm text-subtle leading-relaxed">
                    Searching without a saved plan — adjust how we balance estimated cost vs. recovery signals.
                  </p>
                )}

                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 p-4 space-y-4">
                  {useInsuranceDetails ? (
                    <>
                      <p className="text-xs sm:text-sm text-subtle leading-relaxed">
                        Roughly how much of this visit do you expect your plan to cover? Illustrative only — confirm with your
                        insurer.
                      </p>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 text-right shrink-0 leading-tight">
                          You pay more
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sliderValue}
                          onChange={e => setSliderValue(Number(e.target.value))}
                          className="accent-brand h-2 min-w-0 flex-1 cursor-pointer"
                        />
                        <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 shrink-0 leading-tight">
                          Plan pays more
                        </span>
                      </div>
                      <p className="text-link-brand text-center text-base font-bold tabular-nums">
                        {sliderValue}% covered <span className="text-xs font-normal text-muted">(estimate)</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm text-subtle leading-relaxed">
                        Slide toward lower estimated out-of-pocket or toward stronger recovery signals.
                      </p>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 text-right shrink-0 leading-tight">
                          Lower cost
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sliderValue}
                          onChange={e => setSliderValue(Number(e.target.value))}
                          className="accent-brand h-2 min-w-0 flex-1 cursor-pointer"
                        />
                        <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 shrink-0 leading-tight">
                          Stronger outcomes
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  className="btn-primary mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base sm:py-4"
                >
                  <HeartPulse className="shrink-0 opacity-95" size={20} strokeWidth={SW} aria-hidden />
                  Find Best Care
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <section
        className="animate-fade-up mt-12 w-full max-w-xl sm:mt-14 sm:max-w-2xl"
        style={{ animationDelay: '160ms' }}
      >
        <p className="mb-3 flex items-center justify-center gap-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          <Sparkles className="shrink-0 text-[var(--cf-accent-text)]" size={16} strokeWidth={SW} aria-hidden />
          Quick searches
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {quickTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => quickNavigate(tag)}
              className="rounded-full border border-slate-200/90 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/55 hover:text-violet-700 hover:shadow-md hover:shadow-violet-500/15 active:translate-y-0 dark:border-slate-600 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:border-violet-400/50 dark:hover:text-violet-200 dark:hover:shadow-violet-950/40 sm:px-5 sm:text-sm"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
