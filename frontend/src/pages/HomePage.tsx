/**
 * HomePage.tsx — Search wizard with animated hero, feature cards, quick chips.
 *
 * Wizard steps: basics → insurance-prompt → provider → policy → finalize
 * All original logic preserved. Visual layer upgraded with motion.dev.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import PlanSelect from '../components/PlanSelect';
import { SpecialtyIcon } from '../components/MedicalIcons';
import {
  fetchInsuranceProviders,
  fetchRecommendations,
  zipToCoords,
  type InsuranceProvider,
} from '../lib/api';

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
  finalize: 'Set your preference',
};

/* ── Feature cards data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Understand Your Costs',
    desc: 'See estimated out-of-pocket before you go. No bill shock.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Better Outcomes',
    desc: 'Ranked by recovery speed and clinical quality, not just price.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Less Time, Less Burden',
    desc: 'Fewer follow-up visits means less disruption to your life.',
  },
];

/* ── Back arrow icon ────────────────────────────────────────────────────── */
const BackArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

/* ── Fade-in wrapper ────────────────────────────────────────────────────── */
const EASE_STANDARD = [0.4, 0, 0.2, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.1, ease: EASE_STANDARD } }),
};

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
  const [providerSearch, setProviderSearch] = useState('');
  const [quickTags, setQuickTags] = useState<string[]>(FALLBACK_QUICK_TAGS);

  useEffect(() => {
    fetchRecommendations()
      .then(data => { if (data.quickTags?.length) setQuickTags(data.quickTags); })
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
          setProvidersError(data.length === 0 ? 'No insurers available right now.' : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviders([]);
          setProvidersError('We couldn\u2019t load insurers. Check your connection and try again.');
        }
      })
      .finally(() => { if (!cancelled) setProvidersLoading(false); });
    return () => { cancelled = true; };
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
    setProviderId(null);
    setPolicyId(null);
    setStep(yes ? 'provider' : 'finalize');
  };

  const selectProvider = (p: InsuranceProvider) => {
    setProviderId(p.id);
    setPolicyId(null);
    setProviderSearch('');
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
    <div className="relative flex w-full min-h-full flex-1 flex-col items-center px-4 pt-10 pb-20 sm:pt-14 sm:pb-24 overflow-hidden">

      {/* Light beam hero glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[420px] opacity-30 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(20,184,166,0.35) 0%, transparent 70%)',
          filter: 'blur(2px)',
        }}
      />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.header
        className="relative z-10 text-center max-w-2xl mx-auto mb-8 sm:mb-10"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Headline — unchanged */}
        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-3 leading-tight tracking-tight uppercase"
        >
          Find care that heals—not just bills.
        </motion.h1>

        {/* Sub-headline — unchanged */}
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-ink-muted text-base sm:text-lg leading-relaxed px-1"
        >
          We don&apos;t just tell you where to go for care, we tell you where to go based on what you can afford and what minimizes your financial risk.
        </motion.p>
      </motion.header>

      {/* ── Wizard card ─────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 glass-card w-full max-w-xl sm:max-w-2xl shadow-lg shadow-slate-900/5 dark:shadow-black/30 rounded-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.25, ease: EASE_STANDARD } }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-t-2xl bg-slate-200/90 dark:bg-slate-700/80">
          <motion.div
            className="h-full rounded-r-full bg-gradient-to-r from-cf-teal to-cf-blue"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {step !== 'basics' && query.trim() && (
            <div className="mb-5 flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-600/70 dark:bg-slate-950/40">
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-cf-teal dark:text-teal-300">Your search</p>
                <p className="truncate text-sm font-medium text-ink">
                  {query}
                  <span className="font-normal text-muted"> · </span>
                  <span className="text-muted">{location.trim() || 'No ZIP entered'}</span>
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
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cf-teal dark:text-teal-300/90">Next</p>
                <h2 className="text-lg font-semibold text-ink leading-tight sm:text-xl">{STEP_TITLES[step]}</h2>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted">{Math.round(pct)}%</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
              className="space-y-5 text-left"
            >
              {/* ── Step 1: basics ── */}
              {step === 'basics' && (
                <>
                  <div className="border-b border-slate-200/80 pb-4 dark:border-slate-700/70">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cf-teal dark:text-teal-300/90">Step 1</p>
                    <h2 className="text-xl font-bold text-ink tracking-tight sm:text-2xl">Search for care</h2>
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
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Full-width Continue with arrow */}
                  <motion.button
                    type="button"
                    onClick={goInsurancePrompt}
                    disabled={!query.trim()}
                    className="btn-primary w-full py-3 text-sm sm:text-base disabled:opacity-45 flex items-center justify-center gap-2"
                    whileHover={{ scale: query.trim() ? 1.015 : 1 }}
                    whileTap={{ scale: query.trim() ? 0.985 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    Continue
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>

                  {/* How recommendations work */}
                  <p className="text-center text-xs text-muted pt-0.5">
                    <button type="button" className="underline underline-offset-2 hover:text-ink transition-colors">
                      How recommendations work
                    </button>
                    {' · '}
                    <span>No personal data required</span>
                  </p>
                </>
              )}

              {/* ── Step 2: insurance prompt ── */}
              {step === 'insurance-prompt' && (
                <>
                  <button type="button" onClick={goBasics}
                    className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1">
                    <BackArrow /> Back
                  </button>
                  <p className="text-subtle text-sm sm:text-base leading-relaxed">
                    Do you have health insurance? Adding it lets us factor estimated coverage into rankings.
                    You can skip this if you&apos;re paying out-of-pocket.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button type="button" onClick={() => chooseInsurancePath(true)}
                      className="rounded-xl border-2 border-cf-teal/35 bg-teal-50/60 dark:bg-teal-950/35 text-ink font-semibold py-3.5 px-4 text-sm hover:border-cf-teal/60 transition-colors">
                      Yes, I have insurance
                    </button>
                    <button type="button" onClick={() => chooseInsurancePath(false)}
                      className="rounded-xl border border-slate-300 dark:border-slate-600 text-ink font-medium py-3.5 px-4 text-sm hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors">
                      No, I&apos;ll pay out-of-pocket
                    </button>
                  </div>
                </>
              )}

              {/* ── Step 3: provider ── */}
              {step === 'provider' && (
                <>
                  <button type="button" onClick={() => setStep('insurance-prompt')}
                    className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1">
                    <BackArrow /> Back
                  </button>
                  <p className="text-sm text-subtle">Choose the company that issues your health plan.</p>
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
                    <>
                      <div className="relative">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search insurer…"
                          value={providerSearch}
                          onChange={e => setProviderSearch(e.target.value)}
                          className="home-search-input pl-9 pr-4 py-2.5 text-sm"
                        />
                        {providerSearch && (
                          <button type="button" onClick={() => setProviderSearch('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-ink dark:hover:text-slate-100">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {(() => {
                        const filtered = [...providers]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .filter(p => !providerSearch.trim() || p.name.toLowerCase().includes(providerSearch.toLowerCase().trim()));
                        return filtered.length === 0 ? (
                          <p className="text-sm text-muted text-center py-4">No insurers match &ldquo;{providerSearch}&rdquo;</p>
                        ) : (
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[min(50vh,18rem)] overflow-y-auto pr-1 -mr-1">
                            {filtered.map(p => (
                              <li key={p.id}>
                                <button type="button" onClick={() => selectProvider(p)}
                                  className="w-full text-left px-4 py-3.5 rounded-xl border border-slate-200/90 dark:border-slate-600/80 bg-white/40 dark:bg-slate-950/20 hover:border-cf-teal/45 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all text-ink text-sm font-medium">
                                  {p.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </>
                  )}
                </>
              )}

              {/* ── Step 4: policy ── */}
              {step === 'policy' && selectedProvider && (
                <>
                  <button type="button" onClick={() => { setPolicyId(null); setStep('provider'); }}
                    className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1">
                    <BackArrow /> Back
                  </button>
                  <p className="text-sm text-subtle">
                    Plans for <span className="text-ink font-semibold">{selectedProvider.name}</span>
                  </p>
                  <PlanSelect
                    label="Select your plan"
                    policies={selectedProvider.policies}
                    value={policyId}
                    onSelect={selectPolicy}
                  />
                </>
              )}

              {/* ── Step 5: finalize ── */}
              {step === 'finalize' && (
                <>
                  <button type="button"
                    onClick={() => useInsuranceDetails ? setStep('policy') : setStep('insurance-prompt')}
                    className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mt-1 mb-1">
                    <BackArrow /> Back
                  </button>

                  {useInsuranceDetails && selectedPolicy && (
                    <div className="flex flex-wrap gap-2">
                      <span className="badge-teal text-xs">{selectedProvider?.name}</span>
                      <span className="rounded-full border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs text-ink-muted dark:text-slate-300">
                        {selectedPolicy.name}
                      </span>
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 p-4 space-y-4">
                    {useInsuranceDetails ? (
                      <>
                        <p className="text-xs sm:text-sm text-subtle leading-relaxed">
                          Roughly how much of this visit do you expect your plan to cover? Illustrative only — confirm with your insurer.
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 text-right shrink-0 leading-tight">You pay more</span>
                          <input type="range" min={0} max={100} value={sliderValue}
                            onChange={e => setSliderValue(Number(e.target.value))}
                            className="flex-1 accent-cf cursor-pointer min-w-0 h-2" />
                          <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 shrink-0 leading-tight">Plan pays more</span>
                        </div>
                        <p className="text-center text-cf-teal dark:text-teal-300 font-bold text-base tabular-nums">
                          {sliderValue}% covered <span className="text-xs font-normal text-muted">(estimate)</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm text-subtle leading-relaxed">
                          Slide toward lower estimated out-of-pocket cost or toward stronger recovery signals.
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 text-right shrink-0 leading-tight">Lower cost</span>
                          <input type="range" min={0} max={100} value={sliderValue}
                            onChange={e => setSliderValue(Number(e.target.value))}
                            className="flex-1 accent-cf cursor-pointer min-w-0 h-2" />
                          <span className="text-ink-muted text-[11px] sm:text-xs w-16 sm:w-24 shrink-0 leading-tight">Stronger outcomes</span>
                        </div>
                        <p className="text-center text-xs text-muted">
                          {sliderValue < 30
                            ? 'Prioritizing lowest estimated out-of-pocket cost'
                            : sliderValue > 70
                            ? 'Prioritizing fastest recovery and best clinical outcomes'
                            : 'Balanced: cost and recovery equally weighted'}
                        </p>
                      </>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleSearch}
                    className="w-full btn-primary py-3.5 sm:py-4 text-base rounded-xl mt-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    Find Best Care
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Trust note */}
      <motion.p
        className="relative z-10 mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.6, duration: 0.4 } }}
      >
        Demo only · Not medical advice · No account required
      </motion.p>

      {/* ── Quick searches ───────────────────────────────────────────────── */}
      <motion.section
        className="relative z-10 mt-8 sm:mt-10 w-full max-w-xl sm:max-w-2xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.45, ease: EASE_STANDARD } }}
      >
        <p className="text-center text-xs font-medium text-muted uppercase tracking-wide mb-3">Quick searches</p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {quickTags.map((tag, i) => (
            <motion.button
              key={tag}
              type="button"
              onClick={() => quickNavigate(tag)}
              className="group inline-flex items-center gap-2 border border-slate-200/90 bg-white/70 text-slate-700 text-xs sm:text-sm px-4 py-2 rounded-full hover:border-cf-teal/50 hover:text-cf-teal transition-colors dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:text-teal-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.5 + i * 0.07, duration: 0.3 } }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="text-cf-teal dark:text-teal-400 group-hover:text-cf-teal">
                <SpecialtyIcon specialty={tag} className="w-3.5 h-3.5" />
              </span>
              {tag}
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Feature cards ───────────────────────────────────────────────── */}
      <motion.section
        className="relative z-10 mt-10 sm:mt-12 w-full max-w-xl sm:max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.6 } } }}
      >
        {FEATURES.map(f => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            className="glass-card rounded-2xl px-5 py-5 text-center flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-cf-teal dark:bg-teal-950/50 dark:text-teal-400">
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink mb-1">{f.title}</p>
              <p className="text-[12px] text-ink-muted leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.section>
    </div>
  );
}
